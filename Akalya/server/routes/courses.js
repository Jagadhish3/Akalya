// server/routes/courses.js
import express from "express";
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/coursesController.js";

import { authenticate, requireRole, requireTeacher, requireStudent } from "../middleware/auth.js";

const router = express.Router();

// Public list (optional auth to let req.user be populated)
router.get("/", authenticate, getAllCourses);

// Public get by id (optional auth so UI can show enroll state)
router.get("/:id", authenticate, getCourseById);

// Create (teacher or admin) - requireTeacher ensures req.user exists and role is teacher/admin
router.post("/", authenticate, requireTeacher, createCourse);

// Update course (teacher who owns course or admin)
router.put("/:id", authenticate, requireTeacher, updateCourse);

// Enrollment stats (admin only)
router.get("/stats/enrollments", authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { default: CourseEnrollment } = await import('../models/CourseEnrollment.js');
    const stats = await CourseEnrollment.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $project: {
          courseId: '$_id',
          title: '$course.title',
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete("/:id", authenticate, requireTeacher, deleteCourse);


export default router;
