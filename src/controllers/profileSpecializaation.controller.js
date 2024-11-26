import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ProfileSpecialization } from "../models/profileSpecialization.js";

const getprofileSpecialization = asyncHandler(async(req, res)=>{

    try{
        const profileSpecialization = await ProfileSpecialization.find();
  
        if(profileSpecialization.length === 0) {
            res.status(404).json({warning: "No specialized Profile name found"});
            return;
        }
        res.status(200).json(new ApiResponse(200, profileSpecialization, "successfull"));
      } catch (err) {
        throw new ApiError(500, "Internal Server Error", err);
      }
})

const addprofileSpecialization = asyncHandler(async (req, res) => {
    const { profileSpecialization } = req.body;

    console.log(profileSpecialization)

    if(!profileSpecialization){
      res.status(404).json(new ApiError(404, "Please provide specialized Profile name"))
      return;
    }

    try {

      await ProfileSpecialization.create({profileSpecialization:profileSpecialization});
      
      res.status(201).json(new ApiResponse(201,null, "Successfully saved  specialized Profile name"));
  
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  })

export {getprofileSpecialization, addprofileSpecialization};