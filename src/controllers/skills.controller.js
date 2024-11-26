import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Skills } from "../models/skills.model.js";

const getSkills = asyncHandler(async(req, res)=>{

    try{
        const skills = await Skills.find();
  
        if(skills.length === 0) {
            res.status(404).json({warning: "No skills found"});
            return;
        }
        res.status(200).json(new ApiResponse(200, skills, "successfull"));
      } catch (err) {
        throw new ApiError(500, "Internal Server Error", err);
      }
})

const addSkills = asyncHandler(async (req, res) => {
    const { skills } = req.body;

    if(!skills){
      res.status(404).json(new ApiError(404, "Please provide skills"))
      return;
    }

    try {

      await Skills.create({skills:skills});
      
      res.status(201).json(new ApiResponse(201,null, "Successfully saved skills"));
  
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  })

export {getSkills, addSkills};