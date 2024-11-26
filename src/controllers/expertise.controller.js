import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Expertise } from "../models/expertise.model.js";

const getExpertise = asyncHandler(async(req, res)=>{

    try{
        const expertise = await Expertise.find();
  
        if(expertise.length === 0) {
            res.status(404).json({warning: "No expertise found"});
            return;
        }
        res.status(200).json(new ApiResponse(200, expertise, "successfull"));
      } catch (err) {
        throw new ApiError(500, "Internal Server Error", err);
      }
})

const addExpertise = asyncHandler(async (req, res) => {
    const { expertise } = req.body;

    console.log(expertise)

    if(!expertise){
      res.status(404).json(new ApiError(404, "Please provide expertise"))
      return;
    }

    try {

      await Expertise.create({expertise:expertise});
      
      res.status(201).json(new ApiResponse(201,null, "Successfully saved expertise"));
  
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  })

export {getExpertise, addExpertise};