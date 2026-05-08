// server/routes/locker.js
import express from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import uploadLocker from "../middleware/uploadLocker.js";
import * as ctrl from "../controllers/lockerController.js";

const router = express.Router();

// Allow student, teacher, or admin to use locker
router.use(authenticate, requireRole(['student', 'teacher', 'admin']));

router.get("/", ctrl.listFiles);
router.get("/usage", ctrl.getUsage);
router.post("/upload", uploadLocker, ctrl.upload);
router.put("/:id/rename", ctrl.rename);
router.delete("/:id", ctrl.remove);
router.get("/:id/download", ctrl.download);

export default router;
