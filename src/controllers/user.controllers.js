import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

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

export {
    registerUser,
    loginUser
}