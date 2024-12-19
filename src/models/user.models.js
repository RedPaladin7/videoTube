import mongoose, {Schema} from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

// _id field is added automatically

const userSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // url
            required: true
        },
        coverImage: {
            type: String,
        },
        // avatar is required field while coverImage is not
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Video'
            }
        ],
        password: {
            type: String,
            required: [true, 'password is required'] // second part of the array is the error message
        },
        refreshToken: {
            type: String
        }
    },
    // for the field of createdAt and updatedAt
    { timestamps: true}
)

// you want something to happend just before saving
// next is used to pass request from one middleware to another

// function to encrypt the password
userSchema.pre('save', async function(next){
    // this function will only run when saving or updating password
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10)
    
    next()
})

// normal function not a hook
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

// generate access token short term to prove the user is logged in

userSchema.methods.generateAccessToken = function(){
    // can return multiple pieces of info
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    );
}

// refresh tokens are long term and are hence stored
// obtains new access token without requiring the user to login again
// can be used to forefully log out user

userSchema.methods.generateRefreshToken = function(){
    // can only return one piece of info
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model('User', userSchema)