import { Router } from "express";
import { createSpecializedProfile, deleteAllSpProfilesLinked, deleteSpecializedProfile, getAllSpecializedProfiles, getSpecializedProfiles } from "../controllers/specializedProfile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.route('/:id').get(verifyJWT,getSpecializedProfiles).post(verifyJWT,authorizeRoles('admin','manager'),createSpecializedProfile).delete(verifyJWT,authorizeRoles('admin','manager'),deleteSpecializedProfile);
router.route('/').get(verifyJWT,getAllSpecializedProfiles);
router.route('/deleteMany/:id').delete(verifyJWT,authorizeRoles('admin','manager'),deleteAllSpProfilesLinked);

export default router