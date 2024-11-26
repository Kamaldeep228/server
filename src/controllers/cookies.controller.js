import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Cookies } from "../models/cookies.model.js";

const getCookies = asyncHandler(async (req, res) => {
  try {
    const cookies = await Cookies.findOne({}); // Only one document in the collection

    if (!cookies) {
      res.status(404).json({ warning: "No Cookies found" });
      return;
    }
    res.status(200).json(new ApiResponse(200, cookies, "Successful"));
  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
});


const addCookies = asyncHandler(async (req, res) => {
  const { cookies } = req.body;

  if (!cookies) {
    res.status(400).json(new ApiError(400, "Please provide cookies"));
    return;
  }

  try {
    // Find the single existing document in the collection
    const isCookiesAdded = await Cookies.findOne({});

    // If the document exists, update it
    if (isCookiesAdded) {
      await Cookies.findOneAndUpdate(
        {},
        {
          $set: {
            cookies: cookies
          }
        }
      );

      res.status(200).json(new ApiResponse(200, null, "Successfully updated cookies"));
      return;
    }

    // If no document exists, create a new one
    await Cookies.create({ cookies: cookies });

    res.status(201).json(new ApiResponse(201, null, "Successfully saved cookies"));
  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
});


const isCookiesValid = asyncHandler(async (req, res) => {
  try {
    // Get the current date and subtract 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // Find the cookies document and check if it was updated within the last 12 hours
    const cookiesData = await Cookies.findOne({
      updatedAt: { $gte: twelveHoursAgo }
    });

    // Check if cookiesData exists, meaning the cookies were updated within the last 12 hours
    const isValid = !!cookiesData;

    res.status(200).json(new ApiResponse(200, { isValid }, "Cookies validation result"));
  } catch (err) {
    throw new ApiError(500, "Internal Server Error", err);
  }
});

  
export {getCookies, addCookies, isCookiesValid};