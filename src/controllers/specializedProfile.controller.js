import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { scrapeSpecializedProfile } from "../utils/scrapper.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { SpecializedProfile } from "../models/specializedProfile.model.js";
import { Cookies } from "../models/cookies.model.js";
import { ProfileSpecialization } from "../models/profileSpecialization.js";

const getSpecializedProfiles = asyncHandler(async(req, res) => {
    const {id} = req.params;

    if (!id) {
        throw new ApiError(500, "Id is required");
      }
    
      if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid Profile ID");
      }

      try{
        const profiles = await SpecializedProfile.aggregate([
          {
              $match: { profile_id: new mongoose.Types.ObjectId(id) }
          },
          {
              $lookup: {
                  from: "pinnedprofiles",  // the collection name for PinnedProfiles in lowercase
                  localField: "_id",
                  foreignField: "profile_id",
                  as: "pinnedProfileData"
              }
          },
          {
              $addFields: {
                  pinnedProfile: { $gt: [{ $size: "$pinnedProfileData" }, 0] }
              }
          },
          {
              $project: {
                  profile_embedding: 0,
                  completedWorkHistory: 0,
                  inProgressWorks: 0,
                  pinnedProfileData: 0  // Exclude the temporary array
              }
          }
      ]);

      if (profiles.length === 0) {
          return res.status(404).json({ warning: "No specialized profile found" });
      }

      res.status(200).json(new ApiResponse(200, profiles, "successful"));
      }catch(err){
        throw new ApiError(500, "Internal Server Error", err);
      }
})

const createSpecializedProfile = asyncHandler(async(req, res) => {
    const {id} = req.params;
    const {url} = req.body;

    if (!url || !id) {
        throw new ApiError(400, "Url and profie id is required");
    }

      // URL validation 
      const urlRegex = /^https:\/\/www\.upwork\.com\/.*/;
      if (!url || !urlRegex.test(url)) {
        throw new ApiError(400, "Invalid URL. URL must start with 'https://www.upwork.com/'");
    }

    try {
      const storedCookies = await Cookies.findOne();
  
      if(storedCookies.length === 0) {
        res.status(404).json({warning: "No Cookies found"});
        return;
    }
  
      const profileScraped = await scrapeSpecializedProfile(url,storedCookies?.cookies);
    
        if (profileScraped?.error) {
          res.status(404).json({ error: profile?.error });
          return;
        }

        const profile = {...profileScraped , url : url}
    
      const storeProfile = await SpecializedProfile.create({profile_id: id , ...profile});

    if(storeProfile?.profileName){
        const isSpecializationExists = await ProfileSpecialization.findOne({"profileSpecialization.name": storeProfile?.profileName})
        
        if(!isSpecializationExists){
          await ProfileSpecialization.findOneAndUpdate(
            {},
            {
              $addToSet: {
            profileSpecialization: { name: storeProfile.profileName }
        }},
         { upsert: true })
      }
    }
        
    res.status(201).json(new ApiResponse(201, storeProfile, "successfully scrape profile"));
      } catch (err) {
        throw new ApiError(500, "Internal Server Error", err);
      }    
})

const deleteSpecializedProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    if (!id) {
      throw new ApiError(500, "Specialized Profile Id is required");
    }
  
    if (!isValidObjectId(id)) {
      throw new ApiError(400, "Invalid Specialized Profile ID");
    }
  
    try {
      const result = await SpecializedProfile.deleteOne({ _id: id });
  
      if (result.deletedCount === 0) {
      res.status(404).json({error: "Specialized Profile did not exist"});
      }
  
      res.status(200).json(new ApiResponse(200, "Deleted successfull"));
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
  });

const getAllSpecializedProfiles = asyncHandler(async(req, res) => {
      try{
        const profiles = await SpecializedProfile.find();

        if(profiles.length === 0) {
            res.status(404).json({warning: "No Specialized profile found"});
        }

        res.status(200).json(new ApiResponse(200, profiles, "successfull"));

      }catch(err){
        throw new ApiError(500, "Internal Server Error", err);
      }
})

const deleteAllSpProfilesLinked = asyncHandler(async(req, res) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ApiError(500, "Profile Id is required");
  }

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid Profile ID");
  }

  try {
    const result = await SpecializedProfile.deleteMany({ profile_id : id });

    if (result.deletedCount === 0) {
    res.status(404).json({error: "Specialized Profile did not exist"});
    }

    res.status(200).json(new ApiResponse(200, "Deleted successfull"));
  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
})

export { getSpecializedProfiles, createSpecializedProfile, deleteSpecializedProfile, getAllSpecializedProfiles,deleteAllSpProfilesLinked };