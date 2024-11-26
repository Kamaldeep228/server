import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Instructions } from "../models/instructions.modal.js";

const getInstructions = asyncHandler(async(req, res)=>{

  const userID = req.user?._id;

    try{
        const instructions = await Instructions.find({user_id:userID});
  
        if(instructions.length === 0) {
            res.status(404).json({warning: "No Instructions found"});
            return;
        }
        res.status(200).json(new ApiResponse(200, instructions, "successfull"));
      } catch (err) {
        throw new ApiError(500, "Internal Server Error", err);
      }
})

const addInstructions = asyncHandler(async (req, res) => {
    const { instructions } = req.body;

    if(!instructions){
      res.status(404).json(new ApiError(404, "Please provide instructions"))
      return;
    }

    const userID = req.user?._id;
  
    try {

      const isInstructionsAdded = await Instructions.find({user_id:userID})

      if(isInstructionsAdded.length > 0){
        await Instructions.findOneAndUpdate({user_id:userID},{
          $set:{
            instructions:instructions
          }
        })

        res.status(200).json(new ApiResponse(200,null, "Successfully updated Instructions"));
        return;
      }


      await Instructions.create({user_id:userID ,instructions:instructions});
      
      res.status(201).json(new ApiResponse(201,null, "Successfully saved instructions"));
  
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  })


export {getInstructions, addInstructions };