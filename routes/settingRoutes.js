import express from "express";
import { getSettings, updateSetting, updateMultipleSettings } from "../controllers/settingController.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getSettings);
router.post("/update", authenticateAdmin, updateSetting);
router.post("/update-multiple", authenticateAdmin, updateMultipleSettings);

export default router;
