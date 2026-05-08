// server/models/Course.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 5000,
  },
  // optional public course link (teacher-provided)
  url: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  thumbnailUrl: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// update timestamp
courseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Avoid OverwriteModelError in watch/hot-reload environments
const CourseModel = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default CourseModel;
