import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        // check if user is found
    
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        
        return accessToken, refreshToken
    } catch (error) {
        throw new ApiError(500, 'Something went wrong while generating access and refresh tokens')
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // destructuring data recieved from user
    const {fullname, email, username, password} = req.body
    console.log(req.files['avatar'][0].path);
    

    if(
        [fullname, email, username, password].some((field)=>field?.trim()==="")
    ) {
        throw new ApiError(400, 'All fields are required')
    }

    // checking if the user already exists
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, 'User with email or username already exists')
    }

    // uploading the paths of avatar and coverImage to cloudinary

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // let coverImageLocalPath;
    // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }

    const avatarLocalPath = req.files['avatar'] ? req.files['avatar'][0].path : null;
    const coverImageLocalPath = req.files['coverImage'] ? req.files['coverImage'][0].path : null;

    if(!avatarLocalPath){
        throw new ApiError(400, 'Avatar file is required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, 'Avatar file is required')
    }

    //creating new user in the schema

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while registering the user')
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, 'User registered successfully'))
})

const loginUser = asyncHandler(async (req, res)=>{
    // get data from body
    const {email, username, password} = req.body

    // validation
    if(!username && !email){
        throw new ApiError(400, 'Email and username is required')
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, 'User not found')
    }

    // validate password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, 'Invalid credentials')
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    // making a new query, but this time the user has refreshToken
    const loggedInUser = await User.findById(user._id)
        .select('-password -refreshToken')

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
 
    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(
            200, 
            {user: loggedInUser, accessToken, refreshToken},
            'User logged in successfully'
        ))
    
})

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id, 
        // set the refresh token to undefined
        {
            $set: {
                refreshToken: undefined
            }
        }.
        {new: true}
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV==='production'
    }

    return res
        .status(200)
        .clearCookie('accessToken', options)
        .clearCookie('refreshToken', options)
        .json(new ApiResponse(200, 'User logged out successfully'))
})

const refreshAccessToken = asyncHandler(async (req, res)=>{
    // do this once the current access token has expired
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, 'Refresh token required')
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        // refresh token has an id field which can be used as an identifier
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, 'Invalid refresh token')
        }

        // checking if the refresh token is the same one as in the db
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, 'Invalid refresh token')
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        }

        const {refreshToken: newRefreshToken, accessToken} = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    'Access token refreshed successfully'
                ))


    } catch (error) {
        throw new ApiError(500, 'Something went wrong while refreshing access token')
    }
})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(401, 'Old password is incorrect')
    }

    // we have a prehook which encypts the password
    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'))
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res.status(200).json(new ApiResponse(200, req.user, 'Current user details'))
})
const updateAccountDetails = asyncHandler(async(req, res)=>{
    // only allowing the user to change username of fullname
    const {username, fullname} = req.body
    if(!fullname || !username){
        throw new ApiError(400, 'Fullname or username is missing')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                username: username,
            }
        },
        {new: true}
    ).select('-password -refreshToken')

    return res
        .status(200)
        .json(new ApiResponse(200, user, 'Account details updated successfully'))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    // file because only file is being sent
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, 'Avatar file is missing')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(500, 'Something went wrong while uploading the avatar')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select('-password -refreshToken')

    return res
        .status(200)
        .json(new ApiResponse(200, user, 'Avatar updated successfully'))
})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, 'File is required')
    }

    const coverImage = uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage){
        throw new ApiError(500, 'Something went wrong while updating the cover image')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select('-password -refreshToken')

    return res
        .status(200)
        .json(new ApiResponse(200, user, 'Cover image updated successfully'))
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    refreshAccessToken,
    updateAccountDetails,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage
}