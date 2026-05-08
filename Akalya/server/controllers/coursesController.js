// server/controllers/coursesController.js
import Course from "../models/Course.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";

/**
 * GET /api/courses
 * Optionally filter by teacherId, status, etc via query params
 */
export const getAllCourses = async (req, res) => {
  try {
    const filter = {};
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.status) filter.status = req.query.status;

    const courses = await Course.find(filter).populate("teacherId", "fullName email");
    return res.json(courses);
  } catch (err) {
    console.error("getAllCourses error:", err);
    return res.status(500).json({ error: "Failed to fetch courses" });
  }
};

/**
 * GET /api/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("teacherId", "fullName email");
    if (!course) return res.status(404).json({ error: "Course not found" });
    return res.json(course);
  } catch (err) {
    console.error("getCourseById error:", err);
    return res.status(500).json({ error: "Failed to fetch course" });
  }
};

/**
 * POST /api/courses
 * Body: { title, description, status, url }
 * Teacher (or admin) creates course. If teacherId not provided, use req.user.id (if authenticated).
 */
export const createCourse = async (req, res) => {
  try {
    const { title, description, status, url, thumbnailUrl } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Use teacherId from req.user if present (recommended)
    const teacherId = req.user?.id || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required" });
    }

    const course = new Course({
      title: title.trim(),
      description: description ? String(description) : undefined,
      // New courses should be visible to students immediately in "Explore Courses".
      // Frontend defaults to "published", but backend also ensures a safe default.
      status: status === "draft" ? "draft" : "published",
      url: url && url !== "" ? String(url).trim() : null,
      thumbnailUrl: thumbnailUrl && thumbnailUrl !== "" ? String(thumbnailUrl).trim() : null,
      teacherId,
    });

    await course.save();
    const populated = await Course.findById(course._id).populate("teacherId", "fullName email");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("createCourse error:", err);
    return res.status(500).json({ error: "Failed to create course" });
  }
};

/**
 * PUT /api/courses/:id
 * Body can include title, description, status, url
 */
export const updateCourse = async (req, res) => {
  try {
    const { title, description, status, url, thumbnailUrl } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // optional: check owner (teacher) or admin role
    if (req.user && req.user.role !== "admin" && course.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (title !== undefined) course.title = String(title).trim();
    if (description !== undefined) course.description = description;
    if (status !== undefined) course.status = status;
    // allow clearing url by sending null or empty string
    if (url === null || (typeof url === "string" && url.trim() === "")) {
      course.url = null;
    } else if (url !== undefined) {
      course.url = String(url).trim();
    }

    if (thumbnailUrl === null || (typeof thumbnailUrl === "string" && thumbnailUrl.trim() === "")) {
      course.thumbnailUrl = null;
    } else if (thumbnailUrl !== undefined) {
      course.thumbnailUrl = String(thumbnailUrl).trim();
    }

    await course.save();
    const populated = await Course.findById(course._id).populate("teacherId", "fullName email");
    return res.json(populated);
  } catch (err) {
    console.error("updateCourse error:", err);
    return res.status(500).json({ error: "Failed to update course" });
  }
};

/**
 * DELETE /api/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // optional: ownership check
    if (req.user && req.user.role !== "admin" && course.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Cascade: remove assignments for this course (and their submissions)
    const assignmentDocs = await Assignment.find({ courseId }).select("_id");
    const assignmentIds = assignmentDocs.map((a) => a._id);

    if (assignmentIds.length > 0) {
      await Submission.deleteMany({ assignmentId: { $in: assignmentIds } });
      await Assignment.deleteMany({ _id: { $in: assignmentIds } });
    }

    await Course.deleteOne({ _id: courseId });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteCourse error:", err);
    return res.status(500).json({ error: "Failed to delete course" });
  }
};
