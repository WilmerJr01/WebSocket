import { Router } from "express";
import {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../controllers/user.controller.js";

const userRoutes = Router();

userRoutes.get("/", getUsers);
userRoutes.get("/:id", getUserById);
userRoutes.put("/:id", updateUser);
userRoutes.delete("/:id", deleteUser);

export default userRoutes;
