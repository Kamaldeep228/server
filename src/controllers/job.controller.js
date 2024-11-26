import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Cookies } from "../models/cookies.model.js";
import scrapeJobs from "../utils/jobScrapper.js";

const getJob = asyncHandler(async(req, res)=>{
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
  
      const profile = await scrapeJobs(url,storedCookies?.cookies);
  
      if (profile?.error) {
        res.status(404).json({ error: profile?.error });
        return;
      }

      if(profile?.jobname == 'No job name available' && profile?.expertise == "No expertise available" && profile?.skills?.length <= 0){
        res.status(404).json({ error: "Invalid scrapping URL", url });
        return;
        }  
  
      /* const storeProfile = await Profile.create(profile); */

      const result = {
        profile: profile,
        url : url
      };
    
      
      res.status(201).json(new ApiResponse(201, result, "Successfully Scrape Job"));
  
    } catch (err) {
      throw new ApiError(500, "Internal Server Error", err);
    }
})

export {getJob}