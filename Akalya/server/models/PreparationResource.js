// server/models/PreparationResource.js
import mongoose from "mongoose";

const preparationResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  type: { type: String, enum: ["book", "youtube", "govt", "previous_paper", "timetable", "roadmap", "strategy"], required: true },
  description: { type: String, trim: true, maxlength: 2000 },
  url: { type: String, trim: true, maxlength: 1000 },
  examIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "EntranceExam" }],
  classLevel: { type: String, trim: true }, // 6-12 or "all"
  subject: { type: String, trim: true },
  targetRole: { type: String, enum: ["all", "teacher", "student"], default: "all" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

preparationResourceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const PreparationResource = mongoose.models.PreparationResource || mongoose.model("PreparationResource", preparationResourceSchema);
export default PreparationResource;
