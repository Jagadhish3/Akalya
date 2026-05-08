// server/middleware/uploadLocker.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_BASE = path.join(__dirname, "..", "uploads", "locker");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return cb(new Error("User not authenticated"));
    const dir = path.join(UPLOAD_BASE, String(userId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const safe = (file.originalname || "file").replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

export default upload.single("file");
