import { Router } from 'express';
import {
    createProfile,
    getProfiles,
    deleteProfile,
    getAllProfiles,
    saveProfile,
    filterProfiles,
    semanticSearchFilter,
    updateProfile,
    updateCRMProfile
} from "../controllers/profile.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.route("/").post(verifyJWT,filterProfiles);
router.route("/getProfiles").post(verifyJWT,getProfiles);
router.route("/createProfile").post(verifyJWT,authorizeRoles('admin','manager'), createProfile);
router.route("/saveProfile").post(verifyJWT,authorizeRoles('admin','manager'), saveProfile);
router.route("/deleteProfile/:id").delete(verifyJWT,authorizeRoles('admin','manager'), deleteProfile);
router.route("/all").get(verifyJWT,getAllProfiles);
router.route("/search").post(semanticSearchFilter);
router.route("/update").post(verifyJWT,authorizeRoles('admin','manager'),updateProfile);
router.route("/updateCRMProfile").post(verifyJWT,authorizeRoles('admin','manager'),updateCRMProfile);

export default router