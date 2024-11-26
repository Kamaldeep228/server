import { Router } from 'express';
import { deleteUser, getAllUsers, getCurrentUser, loginUser, logout, registerUser, updateUser } from '../controllers/user.controller.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.route("/register").post(verifyJWT,authorizeRoles('admin'),registerUser);
router.route("/login").post(loginUser);
router.route("/").get(verifyJWT, getCurrentUser);
router.route('/all').get(verifyJWT, authorizeRoles('admin'), getAllUsers).post(verifyJWT,authorizeRoles('admin'), updateUser);
router.route('/delete').post(verifyJWT,authorizeRoles('admin'), deleteUser);
router.route('/logout').get(verifyJWT, logout);

export default router