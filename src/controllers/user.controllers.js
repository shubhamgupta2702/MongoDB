import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
    
        if(!user){
            throw new ApiError(404, "User not found")
        }
    
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}


const registerUser = asyncHandler( async (req, res) => {
    const {fullname, email, username, password} = req.body


    // validation
    if(fullname?.trim() === ""){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath) {
        throw new ApiError(404,"Avatar file is missing!")
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // if(coverImageLocalPath){
    //     const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Uploaded avatar", avatar);
        
    } catch (error) {
        console.log("Error uploading avatar", error);
        throw new ApiError(400,"failed to upload avatar")
        
    }

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
        console.log("Uploaded avatar", coverImage);
        
    } catch (error) {
        console.log("Error uploading coverImage", error);
        throw new ApiError(400,"failed to upload coverImage")
        
    }

    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage.url || "",
            email,
            password,
            username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
    
        if(!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the User")
        }
    
        return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "User registered succesfully"))
    } catch (error) {
        console.log("User creation failed");
        
        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }

        throw new ApiError(500, "Something went wrong while registering a user and images were deleted.")
    }



})

const loginUser = asyncHandler(async (req, res) => {
    // get data from body
    const {email, username, password} = req.body

    //validation
    if(!email && !username){
        throw new ApiError(400, "Email or username is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    // validate Password
    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    if(!loggedInUser){
        throw new ApiError(500, "Something went wrong while logging in")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"))

})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            refreshToken: undefined
        }
    },
        {new: true}
)

const options  = {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
}

        return res.status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(400, "Refresh token is required")

        try {
            const decodedToken = await jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

            const user = await User.findById(decodedToken?._id)

            if(!user){
                throw new ApiError(404, "Invalid Refresh Token")
            }

            if(incomingRefreshToken !== user?.refreshToken){
                throw new ApiError(401, "Invalid Refresh Token")
            }

            const options = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
            }

            const {accessToken, refreshToken: newRefreshToken} = await generateRefreshToken(user?._id)

            return res.status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(new ApiResponse(200, user, "Refresh token updated"))

        } catch (error) {
            
            throw new ApiError(500, "Something went wrong while refreshing token")
        }

    }
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logOutUser
}