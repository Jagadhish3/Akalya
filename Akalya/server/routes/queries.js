// server/routes/queries.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Query from '../models/Query.js'; // adjust path if your model lives elsewhere

const router = express.Router();

/**
 * POST /api/queries
 * - Auth required
 * - Server derives studentId from req.user (client-sent studentId is ignored)
 */
// POST /api/queries
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    // derive canonical id / user identifier from token
    const studentId = String(user._id ?? user.id ?? user.userId);
    const { courseId, courseTitle, subject, message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create payload matching schema: set 'student' (required) and also set common variants
    const payload = {
      student: studentId,         // your schema requires this field
      studentId,                  // keep backwards-compatible field
      student_id: studentId,      // another common variant – safe to include
      course: courseId ?? null,   // Map courseId to 'course' field in schema
      courseId: courseId ?? null, // keep backwards-compatible field
      courseTitle: courseTitle ?? null,
      subject: subject ?? null,
      message: message.trim(),
      createdAt: new Date(),
      status: 'open'
    };

    const q = new Query(payload);

    const saved = await q.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('[POST /api/queries] error stack:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to create query' });
  }
});


/**
 * GET /api/queries
 * - Auth required
 * - Students see only their queries; teacher/admin can see all
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const role = String(user.role || user.userRole || 'student').toLowerCase();
    const isTeacherOrAdmin = ['teacher', 'admin'].includes(role);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    let filter = isTeacherOrAdmin ? {} : { studentId: String(user._id ?? user.id ?? user.userId) };

    if (req.query.teacherId) {
      // Teachers only see queries for THEIR courses
      const teacherCourses = await (await import('../models/Course.js')).default.find({ teacherId: req.query.teacherId }).select('_id');
      const courseIds = teacherCourses.map(c => c._id);
      filter = { course: { $in: courseIds } };
    }

    const [items, total] = await Promise.all([
      Query.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Query.countDocuments(filter)
    ]);

    return res.json({ items, total, page, limit });
  } catch (err) {
    console.error('[GET /api/queries] error', err);
    return res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

export default router;
