import { Router } from 'express';
import { validateEmailController, emailfinder } from '../controllers/validateEmail.controller.js';

const router = Router();

router.route("/").post(validateEmailController);
router.route("/emailfinder").post(emailfinder);

export default router