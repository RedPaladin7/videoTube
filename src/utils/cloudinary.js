import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// configure cloudinary

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// uploading the files to cloudinary

// multer returns a file path
const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath, {
               resource_type: 'auto' 
            }
        )
        console.log('File uploaded on cloudinary, File src: ' + response.url);
        // delete the file from local storage once it is uploaded on cloud
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        // if there is a problem in uploading the file to cloud
        // delete the file from local storage
        console.log('Error on cloudinary ', error);
        fs.unlinkSync(localFilePath)
        return null
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        console.log('Deleted from cloudinary. Public id: ', publicId);
        
    } catch (error) {
        console.log('Error deleting from cloudinary ', error);
        return null
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}