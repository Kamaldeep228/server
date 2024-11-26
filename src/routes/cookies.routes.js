import { Router } from 'express';
import { addCookies, getCookies, isCookiesValid } from '../controllers/cookies.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.route("/").get(verifyJWT,authorizeRoles('admin','manager'), getCookies);
router.route("/add").post(verifyJWT,authorizeRoles('admin','manager'), addCookies);
router.route("/validCookies").get(verifyJWT,authorizeRoles('admin','manager'), isCookiesValid);

export default router