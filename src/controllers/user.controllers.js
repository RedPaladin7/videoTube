import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'


const registerUser = asyncHandler(async (req, res)=>{
    // accepting the data from the user
    // name fields are coming in request body 
    const {fullName, email, username, password} = req.body

    // photos are coming in request files

    // validation
    if(
        [fullName, username, email, password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required")
    }

    // checking for an existing user in the database
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // handling the images
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverImage[0].path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    // uploading files to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage = ""
    if(coverLocalPath){
        coverImage = await uploadOnCloudinary(coverLocalPath)
    }

    // constructing an user

    cont user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    // verifying if the user was created or not

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