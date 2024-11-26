import { Router } from 'express';
import { addSkills, getSkills } from '../controllers/skills.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/").get(verifyJWT,getSkills).post(verifyJWT,addSkills);

export default router;