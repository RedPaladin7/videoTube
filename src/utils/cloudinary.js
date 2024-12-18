import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

// configure cloudinary

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
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
        fs.unlinkSync(localFilePath)
        return null
    }
}

export {uploadOnCloudinary}