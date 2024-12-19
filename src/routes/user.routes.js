import {Router} from 'express'
import { registerUser, logoutUser } from '../controllers/user.controllers.js'
import {upload} from '../middlewares/multer.middlewares.js'
import {verifyJWT} from '../middlewares/auth.middlewares.js'

const router = Router()

router.route('/register').post(
    // allows you to take multiple inputs from the user
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1,
        }, {
            name: 'coverImage',
            maxCount: 1,
        }
    ]),
    registerUser)

// secured routes
// first the middleware is passed then the controller

// middlewares and controller need to have next() to transfer control

router.route('/logout').port(verifyJWT, logoutUser)

export default router