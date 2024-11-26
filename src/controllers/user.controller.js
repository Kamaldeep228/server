import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {username, email, password, role } = req.body;
    console.log(username, email, password, role );

    if (
        [username, email, password, role].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const user = await User.create({
        username,
        email, 
        password,
        role
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {emailAddress, password} = req.body;

    if (!emailAddress && !password) {
        res.status(400).json(new ApiError(400, "Email and Password is required"))
         return;
    }

    const user = await User.findOne({email:emailAddress})

    if (!user) {
        res.status(404).json(new ApiError(404, "User does not exist"))
         return;
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    res.status(401).json(new ApiError(401, "Invalid user credentials"))
     return;
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
       // httpOnly: true,
        secure: true, // This option requires that the cookie is only sent over HTTPS. If your site is running on http://localhost, the cookie won't be set unless you're running your local server with HTTPS.
        sameSite: 'None',
        path: '/',
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ immutable: { $ne: true }}).select('-password -refreshToken'); // Exclude password
    return res.status(200).json(new ApiResponse(200, users, 'All users fetched successfully'));
  });

const updateUser = asyncHandler(async (req, res) => {
    const { _id, role } = req.body;
    
    const roles = ['admin', 'executive', 'manager'];

    if (!_id || !role) {
        return res.status(400).json(new ApiError(400, "Id and Role are required"));
    }
 
    if (!isValidObjectId(_id)) {
        return res.status(400).json(new ApiError(400, "Invalid profile ID"));
      }

      if (!roles.includes(role)) {
        return res.status(400).json(new ApiError(400, "Role does not exist"));
      }

    const user = await User.findById(_id);

    if (!user) {
        return res.status(404).json(new ApiError(404, "user not found"));
    }

    if(user?.immutable){
        return res.status(422).json(new ApiError(422, "user is immutable"));
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            _id, 
            { role: role,
            tokenVersion: user.tokenVersion + 1
             }, 
            { new: true } // This ensures the returned document is the updated one
        ).select("-password -refreshToken");

        return res.status(201).json(
            new ApiResponse(201, updatedUser, "User role updated successfully")
        );
    } catch (err) {
        throw new ApiError(500, "Internal server error", err);
    }
});

const deleteUser = asyncHandler(async (req, res) => {
    const { _id } = req.body;

    console.log(req.body)

    if (!_id) {
        return res.status(400).json(new ApiError(400, "Id is required"));
    }

    if (!isValidObjectId(_id)) {
        return res.status(400).json(new ApiError(400, "Invalid profile ID"));
      }


    const user = await User.findById(_id);

    if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }

    if(user?.immutable){
        return res.status(422).json(new ApiError(422, "User is immutable"));
    }

    try {
        await User.findByIdAndDelete(_id);
        return res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
    } catch (err) {
        throw new ApiError(500, "Internal server error", err);
    }
});

const logout = asyncHandler(async (req, res) => {
    const userID = req.user?._id;

    if (!userID) {
        return res.status(400).json(new ApiError(400, 'User ID not found'));
    }

    try {
        await User.findByIdAndUpdate(userID, { refreshToken: '' });

        res.cookie('accessToken', 'refreshToken', {
            // httpOnly: true,
            secure: true, // only use secure cookies in production
            sameSite: 'None', // cross-site cookie settings
            path: '/',
            expires: new Date(0) // expire the cookie immediately
        });

        res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
    } catch (err) {
        throw new ApiError(500, 'Internal Server Error', err);
    }
});

export {registerUser, loginUser, getCurrentUser, getAllUsers, updateUser, deleteUser, logout}
