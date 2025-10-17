import { Router } from "express";
import gameRoutes from "./gameRoutes.routes.js";
import tableRoutes from "./tableRoutes.routes.js";
import userRoutes from "./userRoutes.routes.js";

import { authMiddleware } from "../middleware/authMiddleare.js";

const router = Router();

router.use("/games", authMiddleware, gameRoutes);
router.use("/tables", authMiddleware, tableRoutes);
router.use("/user", authMiddleware, userRoutes);

export default router;
