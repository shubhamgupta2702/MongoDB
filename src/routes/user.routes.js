import { Router } from "express";
import { registerUser, loginUser, logOutUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()



 // insecured Routes

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },{
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

    // secured Routes

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logOutUser)



export default router