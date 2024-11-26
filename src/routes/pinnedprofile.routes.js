import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { pinProfile, getpinnedProfile, unpinProfile } from '../controllers/pinnedProfile.controller.js';

const router = Router();

router.route("/").get(verifyJWT, getpinnedProfile).post(verifyJWT, pinProfile);
router.route("/delete").post(verifyJWT, unpinProfile);


export default router