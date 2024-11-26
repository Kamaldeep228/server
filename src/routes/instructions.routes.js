import { Router } from 'express';
import { addInstructions, getInstructions } from '../controllers/instructions.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/").get(verifyJWT, getInstructions).post(verifyJWT, addInstructions);

export default router