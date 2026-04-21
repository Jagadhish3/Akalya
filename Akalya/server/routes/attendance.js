import express from 'express';
import Attendance from '../models/Attendance.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import User from '../models/User.js';

const router = express.Router();

// POST /api/attendance  – Bulk save records (teacher only), fires per-student notification
router.post('/', authenticate, requireRole('teacher', 'admin'), async (req, res) => {
  const { records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: 'Records must be a non-empty array' });
  }

  try {
    const operations = records.map(record => ({
      updateOne: {
        filter: {
          courseId: record.courseId,
          studentId: record.studentId,
          date: record.date || new Date().toISOString().split('T')[0]
        },
        update: { $set: record },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(operations);

    // Send a notification to each student
    const date = records[0]?.date || new Date().toISOString().split('T')[0];

    // Get course name for the notification message
    let courseName = 'your course';
    try {
      const { default: Course } = await import('../models/Course.js');
      const course = await Course.findById(records[0]?.courseId).select('title').lean();
      if (course?.title) courseName = course.title;
    } catch (e) { /* ignore */ }

    // Group by student to send one notification per student
    const byStudent = {};
    records.forEach(r => {
      byStudent[r.studentId] = r.status;
    });

    await Promise.all(
      Object.entries(byStudent).map(([studentId, status]) =>
        createNotification({
          userId: studentId,
          title: 'Attendance Marked',
          message: `Your attendance for ${courseName} on ${date} has been marked as ${status}.`,
          type: 'attendance'
        })
      )
    );

    res.status(201).json({ message: 'Attendance records saved successfully' });
  } catch (err) {
    console.error('[POST /api/attendance] error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/student/:studentId  – Summary for a student
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    // Students can only see their own; teachers/admins see any
    if (req.user.role === 'student' && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const attendance = await Attendance.find({ studentId: req.params.studentId }).lean();
    const present = attendance.filter(a => a.status === 'present').length;
    const total = attendance.length;

    // Break down per course
    const byCourse = {};
    attendance.forEach(a => {
      const cid = String(a.courseId);
      if (!byCourse[cid]) byCourse[cid] = { present: 0, total: 0 };
      byCourse[cid].total += 1;
      if (a.status === 'present') byCourse[cid].present += 1;
    });

    res.json({
      present,
      absent: total - present,
      total,
      percentage: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0,
      byCourse
    });
  } catch (err) {
    console.error('[GET /api/attendance/student] error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/course/:courseId  – History for a course (teacher/admin)
router.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const attendance = await Attendance.find({ courseId: req.params.courseId })
      .populate('studentId', 'fullName email')
      .lean();
    res.json(attendance);
  } catch (err) {
    console.error('[GET /api/attendance/course] error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/summary  – Platform-wide stats (admin only)
router.get('/summary', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const total = await Attendance.countDocuments();
    const present = await Attendance.countDocuments({ status: 'present' });
    const studentCount = await User.countDocuments({ role: 'student' });

    res.json({
      total,
      present,
      absent: total - present,
      percentage: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0,
      activeStudents: studentCount
    });
  } catch (err) {
    console.error('[GET /api/attendance/summary] error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
