import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { addprofileSpecialization, getprofileSpecialization } from '../controllers/profileSpecializaation.controller.js';

const router = Router();

router.route("/").get(verifyJWT, getprofileSpecialization).post(verifyJWT, addprofileSpecialization);

export default router;