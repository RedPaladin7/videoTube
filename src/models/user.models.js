import mongoose, {Schema} from 'mongoose'

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
        avator: {
            type: String, // url
            required: true
        },
        coverImage: {
            type: String,
        },
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

export const User = mongoose.model('User', userSchema)