import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

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

export {registerUser}