import { Router } from 'express';
import { addExpertise, getExpertise } from '../controllers/expertise.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/").get(verifyJWT, getExpertise).post(verifyJWT, addExpertise);

export default router;