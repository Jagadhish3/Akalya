// server/routes/preparationResources.js
import express from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as ctrl from "../controllers/preparationResourcesController.js";

const router = express.Router();
const requireStaff = requireRole(['teacher', 'admin']);

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getById);
router.post("/", authenticate, requireStaff, ctrl.create);
router.put("/:id", authenticate, requireStaff, ctrl.update);
router.delete("/:id", authenticate, requireStaff, ctrl.remove);

export default router;
