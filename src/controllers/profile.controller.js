import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import scrapeProfile from "../utils/scrapper.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Profile } from "../models/profile.model.js";
import { SpecializedProfile } from "../models/specializedProfile.model.js";
import { Cookies } from "../models/cookies.model.js";
import { getEmbedding } from "../utils/getEmbedded.js";

const getProfiles = asyncHandler(async (req, res) => {

  const {searchInput} = req.body;

    // Build the match stage for aggregation
    let matchStage = {};

    // If searchInput is provided, filter by name or expertise
    if (searchInput) {
      matchStage.$or = [{ name: { $regex: searchInput, $options: "i" } }];
    }

   let profiles = await Profile.aggregate([{ $match: matchStage },{$project: {profile_embedding:0, completedWorkHistory:0, inProgressWorks:0}}]);

   if (profiles.length === 0) {
    return res.status(404).json(new ApiError(404, "No Profile found"));
  }

  const result = {
    docs: profiles,
    totalDocs: profiles.length
  };

  return res.status(200).json(new ApiResponse(200, result, "successfull"));
});

const createProfile = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    throw new ApiError(400, "Url is required");
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

    const profileScraped = await scrapeProfile(url,storedCookies?.cookies);

    if (profileScraped?.error) {
      res.status(404).json({ error: profileScraped?.error });
      return;
    }

    /* const storeProfile = await Profile.create(profile); */

    const profile = {sessionBoxURL : null,...profileScraped , url : url}
    
    res.status(201).json(new ApiResponse(201, profile, "successfully scrape profile"));

  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
});

const saveProfile = asyncHandler(async (req, res) => {
  const { profile } = req.body;

  try {
      await Profile.create(profile);
    
    res.status(201).json(new ApiResponse(201, "successfully saved profile"));

  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
})

const deleteProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(500, "Id is required");
  }

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid Profile ID");
  }

  try {
    const result = await Profile.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
    res.status(404).json({error: "Profile did not exist"});
    }

    res.status(200).json(new ApiResponse(200, "Deleted successfull"));
  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
});

const getAllProfiles = asyncHandler(async (req, res) => {
  try {
    // Retrieve all profiles from the Profile model
    const profiles = await Profile.aggregate([
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                expertise: 1,
                jobSuccessScore: 1,
                totalEarnings: 1,
                totalHours: 1,
                totalJobs: 1,
                badge: 1,
                completedWorkHistory: 1,
                inProgressWorks: 1,
                isActive: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    // Retrieve all profiles from the SpecializedProfile model
    const specializedProfiles = await SpecializedProfile.aggregate([
        {
            $lookup: {
                from: 'profiles', // collection name in MongoDB
                localField: 'profile_id',
                foreignField: '_id',
                as: 'originalProfile'
            }
        },
        {
            $unwind: {
                path: '$originalProfile',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                profile_id: 1,
                name: 1,
                description: 1,
                expertise: 1,
                jobSuccessScore: 1,
                totalEarnings: 1,
                totalHours: 1,
                totalJobs: 1,
                badge: 1,
                completedWorkHistory: 1,
                inProgressWorks: 1,
                isActive: 1,
                createdAt: 1,
                updatedAt: 1,
                isSpecializedProfile:1,
                originalProfile: 1
            }
        }
    ]);

    // Merge both arrays of profiles
    const allProfiles = [...profiles, ...specializedProfiles];

    res.status(200).json(new ApiResponse(200, allProfiles, "successfull"));
} catch (err) {
  throw new ApiError(500, "Internal Server Error", err);
}
});

const filterProfiles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 5, skills = "", expertise = "", specialized= "", sort, profileType = "all" } = req.query;
  const { searchInput } = req.body;

  // Parse skills into an array
  let skillsArray = skills.length > 0 ? skills.split(',') : '';
  let expertiseArray = expertise.length > 0 ? expertise.split(',') : '';
  let specializedArray = specialized.length > 0 ? specialized.split(',') : '';
 
  // Build the match stage for aggregation
  let matchStage = [];
  let defaultStage = [{ $match: {} },{$project: {profile_embedding:0}}];

  // Sorting logic based on completedWorkHistory
  if (skillsArray.length > 0) {

     matchStage = [
      {
        $addFields: {
          matchingWorkHistories: {
            $filter: {
              input: "$completedWorkHistory",
              as: "workHistory",
              cond: {
                $or: skillsArray.map(skill => ({
                  $regexMatch: { input: "$$workHistory.title", regex: skill, options: "i" }
                }))
              }
            }
          }
        }
      },
      {
        $addFields: {
          totalHours: {
            $toString: {
            $sum: {
              $map: {
                input: "$matchingWorkHistories",
                as: "workHistory",  in: {
                  $cond: {
                    if: { $regexMatch: { input: "$$workHistory.hours", regex: /^[0-9]+$/ } }, // Check if it's a number
                    then: { $toInt: "$$workHistory.hours" },
                    else: 0 // Fallback to 0 if hours cannot be converted to a number
                  }
                }
              }
            }
          }
          },
          totalJobs: {$toString: { $size: "$matchingWorkHistories" }}
        }
      },
      {
        $sort: sort === "totalHours" ? { totalHours: -1 } : { totalJobs: -1 }
      },
      {
        $project: {profile_embedding:0}
      }
    ]
  } 
  if (expertiseArray.length > 0) {
     matchStage.unshift({
      $match: {
      expertise : {
        $in: expertiseArray.map((skill) => new RegExp(skill, "i"))
    }
  }
})
  } 

  if (specializedArray.length > 0) {
    matchStage.unshift({
     $match: {
      profileName : {
       $in: specializedArray.map((skill) => new RegExp(skill, "i"))
   }
 }
})
 } 


  // Apply profileType filter
  let profiles = [];
  if (profileType === "profiles" || profileType === "all") {
    profiles = await Profile.aggregate(matchStage.length > 0 ? matchStage : defaultStage);
  }

  if (profileType === "specializedProfiles" || profileType === "all") {
    const specializedProfiles = await SpecializedProfile.aggregate(matchStage.length > 0 ? matchStage : defaultStage);

    profiles = [...profiles, ...specializedProfiles];
  }


    // Sort profiles
  const sortStage = {};
  switch (sort) {
    case "jobSuccessScore":
      sortStage.jobSuccessScore = -1;
      break;
    case "totalEarnings":
      sortStage.totalEarnings = -1;
      break;
    case "totalHours":
      sortStage.totalHours = -1;
      break;
    case "totalJobs":
      sortStage.totalJobs = -1;
      break;
    default:
      sortStage.createdAt = -1; // Default sort by created date
  }

  profiles.sort((a, b) => {
    for (const key in sortStage) {

      let aValue = a[key];
      let bValue = b[key];
  
      // Handle special cases
      if (key === "totalEarnings") {
        // Remove $ and K+ symbols, convert to number
        aValue = parseFloat(aValue.replace(/[\$,K\+]/g, '')) * 1000;
        bValue = parseFloat(bValue.replace(/[\$,K\+]/g, '')) * 1000;
      } else if (key === "jobSuccessScore") {
        // Remove % symbol, convert to number
        aValue = parseFloat(aValue.replace('%', ''));
        bValue = parseFloat(bValue.replace('%', ''));
      } else if (key === "totalHours" || key === "totalJobs") {
        // Remove commas and convert to number
        aValue = parseInt(aValue.replace(/,/g, ''));
        bValue = parseInt(bValue.replace(/,/g, ''));
      }

      // Now perform comparison
      if (aValue > bValue) return sortStage[key];
      if (aValue < bValue) return -sortStage[key];
    }
    return 0;
  });

   // Now apply semantic search on the filtered, sorted profiles
   if (searchInput) {
    const embedding = await getEmbedding(searchInput);

   const originalprofiles = await Profile.aggregate([
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "profile_embedding",
          "queryVector": embedding,
          "numCandidates": 100, // Keep within filtered profiles
          "limit": 3 // Or adjust this limit based on requirements
        }
      },
      {
        "$match": { _id: { $in: profiles.map(p => p._id) } } // Ensure only filtered profiles are part of the semantic search
      },
      {"$project": {profile_embedding:0}}
    ]);

    const specializedProfiles = await SpecializedProfile.aggregate([
      {
        "$vectorSearch": {
          "index": "sp_vector_index",
          "path": "profile_embedding",
          "queryVector": embedding,
          "numCandidates": 100,
          "limit": 3
        }
      },
      {
        "$match": { _id: { $in: profiles.map(p => p._id) } } // Ensure only filtered profiles are part of the semantic search
      },
      {"$project": {profile_embedding:0}}
    ])
    profiles = [...originalprofiles, ...specializedProfiles];
  }

  // Paginate results
  const startIndex = (page - 1) * limit;
  const paginatedProfiles = profiles.slice(startIndex, startIndex + limit);

  if (paginatedProfiles.length === 0) {
    return res.status(404).json(new ApiError(404, "No Profile found"));
  }

  const result = {
    docs: paginatedProfiles,
    totalDocs: profiles.length,
    limit: limit,
    page: page,
    totalPages: Math.ceil(profiles.length / limit),
  };

  return res.status(200).json(new ApiResponse(200, result));
});


const semanticSearchFilter = asyncHandler(async (req, res) => {

  const {advancedSearchData} = req.body;

  if(!advancedSearchData){
    throw new ApiError(404, "Please provide Advanced Search Data");
  }

  const jobSkills = advancedSearchData?.profile?.skills?.join(', ') || advancedSearchData?.skills?.join(', ');
  const jobname = advancedSearchData?.profile?.jobname || advancedSearchData?.jobTitle;
	const specialization = advancedSearchData?.prefLabel || null

  if(!jobname){
    throw new ApiError(404, "Please provide Job Name");
  }


  const searchQuery = `Best Matched Profile for:\n -Job Title: ${jobname}\n -Skills: ${jobSkills}\n -ProfileSpecialization: ${specialization}`;

 // const embedding = await getEmbedding(searchQuery);

  const searchSkills = advancedSearchData?.profile?.skills || advancedSearchData?.skills;

try{
 /*  const profiles = await Profile.aggregate([
    {
      "$vectorSearch": {
        "index": "vector_index",
        "path": "profile_embedding",
        "queryVector": embedding,
        "numCandidates": 100,
        "limit": 3,
      },
    },
    {
      $addFields: {
        matchingWorkHistories: {
          $filter: {
            input: "$completedWorkHistory",
            as: "workHistory",
            cond: {
              $or: searchSkills?.map(skill => ({
                $regexMatch: { input: "$$workHistory.title", regex: skill, options: "i" }
              }))
            }
          }
        }
      }
    },
    {
      $addFields: {
        totalHours: {
          $toString: {
          $sum: {
            $map: {
              input: "$matchingWorkHistories",
              as: "workHistory",  in: {
                $cond: {
                  if: { $regexMatch: { input: "$$workHistory.hours", regex: /^[0-9]+$/ } }, // Check if it's a number
                  then: { $toInt: "$$workHistory.hours" },
                  else: 0 // Fallback to 0 if hours cannot be converted to a number
                }
              }
            }
          }
        }
        },
        totalJobs: {$toString: { $size: "$matchingWorkHistories" }}
      }
    },
      {
          $project: {
              _id: 1,
              name: 1,
              description: 1,
              expertise: 1,
              jobSuccessScore: 1,
              totalEarnings: 1,
              totalHours: 1,
              totalJobs: 1,
              badge: 1,
              completedWorkHistory: 1,
              inProgressWorks: 1,
              isActive: 1,
              createdAt: 1,
              updatedAt: 1,
              url : 1,
              matchingWorkHistories:1,
              sessionBoxURL:1,
              profileName:1
          }
      }
  ]); */

     // Second query: Vector search on specializedProfiles collection
     const specializedProfiles = await SpecializedProfile.aggregate([
     ...(specialization ? [
        {
          $match: {
            $expr: {
              $and: [
                {
                  $regexMatch: {
                    input: {
                      $toLower: {
                        $replaceAll: { input: "$profileName", find: " ", replacement: "" } // Remove spaces and convert to lowercase
                      }
                    },
                    regex: new RegExp(specialization.replace(/\s+/g, '').toLowerCase(), 'i'), // Remove spaces and compare lowercase
                  }
                }
              ]
            }
          }
        }    
      ] : []),{
        $addFields: {
          matchingWorkHistories: {
            $filter: {
              input: "$completedWorkHistory",
              as: "workHistory",
              cond: {
                $or: searchSkills?.map(skill => ({
                  $regexMatch: { input: "$$workHistory.title", regex: skill, options: "i" }
                }))
              }
            }
          }
        }
      },
      {
        $addFields: {
          totalHours: {
            $toString: {
            $sum: {
              $map: {
                input: "$matchingWorkHistories",
                as: "workHistory",  in: {
                  $cond: {
                    if: { $regexMatch: { input: "$$workHistory.hours", regex: /^[0-9]+$/ } }, // Check if it's a number
                    then: { $toInt: "$$workHistory.hours" },
                    else: 0 // Fallback to 0 if hours cannot be converted to a number
                  }
                }
              }
            }
          }
          },
          totalJobs: {$toString: { $size: "$matchingWorkHistories" }}
        }
      },
      {
        $lookup: {
          from: "profiles", // The collection you want to join with
          localField: "profile_id", // Field from SpecializedProfile
          foreignField: "_id", // Field from Profile
          as: "profileDetails" // Resulting array of matching Profile documents
        }
      },
      {
        $addFields: {
          sessionBoxURL: { $arrayElemAt: ["$profileDetails.sessionBoxURL", 0] }, // Extract sessionBoxURL from Profile
          CRMProfile_Id: { $arrayElemAt: ["$profileDetails.CRMProfile_Id", 0] } // Extract sessionBoxURL from Profile
        }
      },{
        $lookup: {
            from: "pinnedprofiles",  // the collection name for PinnedProfiles in lowercase
            localField: "_id",
            foreignField: "profile_id",
            as: "pinnedProfileData"
        }
    }, {
      $addFields: {
          pinnedProfile: { $gt: [{ $size: "$pinnedProfileData" }, 0] }
      }
  },{
        $project: {
          _id: 1,
          profile_id: 1,
          name: 1,
          description: 1,
          expertise: 1,
          jobSuccessScore: 1,
          totalEarnings: 1,
          totalHours: 1,
          totalJobs: 1,
          badge: 1,
          completedWorkHistory: 1,
          inProgressWorks: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          isSpecializedProfile:1,
          originalProfile: 1,          
          url : 1,
          matchingWorkHistories:1,
          profileName:1,
          sessionBoxURL: 1,
          CRMProfile_Id: 1,
          pinnedProfile:1
        }
    }
]);

if (specialization && specializedProfiles.length === 0) {
  const embedding = await getEmbedding(searchQuery);
  const fallbackResults = await SpecializedProfile.aggregate([
    {
      "$vectorSearch": {
        "index": "sp_vector_index",
        "path": "profile_embedding",
        "queryVector": embedding,
        "numCandidates": 100,
        "limit": 3,
      }
    },{
      $addFields: {
        matchingWorkHistories: {
          $filter: {
            input: "$completedWorkHistory",
            as: "workHistory",
            cond: {
              $or: searchSkills?.map(skill => ({
                $regexMatch: { input: "$$workHistory.title", regex: skill, options: "i" }
              }))
            }
          }
        }
      }
    },
    {
      $addFields: {
        totalHours: {
          $toString: {
          $sum: {
            $map: {
              input: "$matchingWorkHistories",
              as: "workHistory",  in: {
                $cond: {
                  if: { $regexMatch: { input: "$$workHistory.hours", regex: /^[0-9]+$/ } }, // Check if it's a number
                  then: { $toInt: "$$workHistory.hours" },
                  else: 0 // Fallback to 0 if hours cannot be converted to a number
                }
              }
            }
          }
        }
        },
        totalJobs: {$toString: { $size: "$matchingWorkHistories" }}
      }
    },
    {
      $lookup: {
        from: "profiles", // The collection you want to join with
        localField: "profile_id", // Field from SpecializedProfile
        foreignField: "_id", // Field from Profile
        as: "profileDetails" // Resulting array of matching Profile documents
      }
    },
    {
      $addFields: {
        sessionBoxURL: { $arrayElemAt: ["$profileDetails.sessionBoxURL", 0] }, // Extract sessionBoxURL from Profile
        CRMProfile_Id: { $arrayElemAt: ["$profileDetails.CRMProfile_Id", 0] }
      }
    },{
      $lookup: {
          from: "pinnedprofiles",  // the collection name for PinnedProfiles in lowercase
          localField: "_id",
          foreignField: "profile_id",
          as: "pinnedProfileData"
      }
  }, {
    $addFields: {
        pinnedProfile: { $gt: [{ $size: "$pinnedProfileData" }, 0] }
    }
},{
      $project: {
        _id: 1,
        profile_id: 1,
        name: 1,
        description: 1,
        expertise: 1,
        jobSuccessScore: 1,
        totalEarnings: 1,
        totalHours: 1,
        totalJobs: 1,
        badge: 1,
        completedWorkHistory: 1,
        inProgressWorks: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        isSpecializedProfile:1,
        originalProfile: 1,          
        url : 1,
        matchingWorkHistories:1,
        profileName:1,
        sessionBoxURL: 1,
        CRMProfile_Id: 1,
        pinnedProfile:1
      }
  }
]);

  const combinedResults = [...fallbackResults];

  return res.status(200).json(new ApiResponse(200,combinedResults, "fallback Results"));

}
const combinedResults = [...specializedProfiles];

  res.status(200).json(new ApiResponse(200,combinedResults, "successfull"));
} catch (err) {
  throw new ApiError(500, "Internal Server Error", err);
}
})

const updateProfile = asyncHandler(async (req, res) => {
  const { profileId, sessionBoxURL } = req.body;

  if (!profileId) {
    throw new ApiError(400, "Profile Id not found");
  }

  if (!sessionBoxURL) {
    throw new ApiError(400, "Session Box URL is required");
  }
  
  try {
    
    const profile = await Profile.findById(profileId);

    if (!profile) {
        res.status(404).json(new ApiError(404, "Profile does not exist"))
         return;
    }
    
     await Profile.findByIdAndUpdate(profileId, {sessionBoxURL: sessionBoxURL});

    res.status(200).json(new ApiResponse(200, "successfully updated session Box URL"));

  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
})

const updateCRMProfile = asyncHandler(async (req, res) => {
  const { profileId, CRMProfile } = req.body;

  if (!profileId) {
    throw new ApiError(400, "Profile Id not found");
  }

  if (!CRMProfile) {
    throw new ApiError(400, "CRM Profile is required");
  }
  
  try {
    
    const profile = await Profile.findById(profileId);

    if (!profile) {
        res.status(404).json(new ApiError(404, "Profile does not exist"))
         return;
    }
    
     await Profile.findByIdAndUpdate(profileId, {CRMProfile_Id: CRMProfile?.value});

    res.status(200).json(new ApiResponse(200, "successfully updated CRM Profile"));

  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
})


export { createProfile, getProfiles, deleteProfile, getAllProfiles, saveProfile,filterProfiles, semanticSearchFilter, updateProfile, updateCRMProfile };
