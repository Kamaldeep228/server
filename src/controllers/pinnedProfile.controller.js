import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { SpecializedProfile } from "../models/specializedProfile.model.js";
import { PinnedProfiles } from "../models/pinnedProfiles.model.js";


const pinProfile = asyncHandler(async(req, res) => {
    const { id, specialization } = req.body;

    console.log(id, specialization )
    
    if (!id) {
      throw new ApiError(400, "Profile Id is required");
    }
  
    if (!isValidObjectId(id)) {
      throw new ApiError(400, "Invalid Profile ID");
    }
  
    if(!specialization){
      throw new ApiError(400, "Profile specialization is required");
    }
  
    try {
      const isProfileExist = await SpecializedProfile.findOne({ _id : id });

      if (!isProfileExist) {
      res.status(404).json({error: "Specialized Profile did not exist"});
      return;
      }


      const isSpecializationPinned = await PinnedProfiles.findOne({specialization: isProfileExist?.profileName })

      const isPinnedProfileExist = await SpecializedProfile.findOne({ _id : isSpecializationPinned?.profile_id });

      if (isSpecializationPinned && isPinnedProfileExist) {
        res.status(409).json( new ApiResponse(409, `The profile "${isPinnedProfileExist?.name}" is already pinned under the specialization "${isProfileExist?.profileName}".`));
        return;
        }

      await PinnedProfiles.create({profile_id: id, specialization: isProfileExist?.profileName})
      res.status(201).json(new ApiResponse(201, "Profile Pinned Successfully"));
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  })

  const unpinProfile = asyncHandler(async(req, res) => {
    const { id, specialization } = req.body;
    
    if (!id) {
      throw new ApiError(400, "Profile Id is required");
    }
  
    if (!isValidObjectId(id)) {
      throw new ApiError(400, "Invalid Profile ID");
    }
  
    if(!specialization){
      throw new ApiError(400, "Profile specialization is required");
    }
  
    try {
      const isProfileExist = await SpecializedProfile.findOne({ _id : id });

      if (!isProfileExist) {
      res.status(404).json({error: "Specialized Profile did not exist"});
      return;
      }

      const isSpecializationPinned = await PinnedProfiles.deleteOne({
        profile_id: id,
        specialization: specialization
      });

      if (isSpecializationPinned.deletedCount === 0) {
        res.status(404).json({error: "Pinned Profile did not exist"});
        }
    
        res.status(200).json(new ApiResponse(200, "Deleted successfull"));
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  })
  
const getpinnedProfile = asyncHandler(async(req, res) => {
  const { id } = req.params;
  
  console.log(id)

  if (!id) {
    throw new ApiError(400, "Profile Id is required");
  }

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid Profile ID");
  }


  try {
    const ispinnedProfile = await PinnedProfiles.findOne({profile_id: id })

    if (!ispinnedProfile) {
    res.status(404).json({error: "Pinned Profile did not exist"});
    return;
    }

    res.status(200).json(new ApiResponse(200, ispinnedProfile));
  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
})

  export { pinProfile, getpinnedProfile, unpinProfile };
  