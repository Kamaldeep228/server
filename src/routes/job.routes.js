import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getJob } from '../controllers/job.controller.js';

const router = Router();

router.route("/").post(verifyJWT, getJob);

export default router