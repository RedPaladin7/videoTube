// adding the id of the user in the request body
// do this just before the request is sent to the controller

import jwt from 'jsonwebtoken'
import {User} from '../models/user.models.js'
import {ApiError} from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import dotenv from 'dotenv'

dotenv.config()

export const verifyJWT = asyncHandler(async(req, _, next)=>{
    // sometimes the accessToken comes in the header of the request
    const token = req.cookies.accessToken || req.header
        ('Authorization')?.replace('Bearer', '')
    if(!token){
        throw new ApiError(401, 'Unauthorized')
    }
    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // fetching the user based on the id in the access token
        const user = await User.findById(decodedToken?._id).select('-password -refreshToken')

        if(!user){
            throw new ApiError(401, 'Unauthorized')
        }

        // adding user parameter to the request body
        req.user = user

        // transferring the control to the controller
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || 'Invalid access token')
    }

})