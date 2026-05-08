// server/routes/submissions.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Submission from '../models/Submission.js';
import { createNotification } from './notifications.js';
import Assignment from '../models/Assignment.js';
import CourseEnrollment from '../models/CourseEnrollment.js';

const router = express.Router();

/**
 * GET /api/submissions
 * - If the requester is teacher/admin -> return all submissions (optionally paginated)
 * - Otherwise (student) -> return student's own submissions
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    // determine user role (adjust field names depending on your auth middleware)
    const role = user.role || user.roles || user.userRole || 'student';
    const isTeacherOrAdmin = ['teacher', 'admin'].includes(String(role).toLowerCase());

    let query = {};
    if (!isTeacherOrAdmin) {
      const studentId = String(user._id ?? user.id ?? user.userId ?? '');
      query = {
        $or: [{ student_id: studentId }, { studentId: studentId }, { student: studentId }],
      };
    } else if (req.query.teacherId) {
      // Teachers only see submissions for THEIR assignments
      const teacherAssignments = await Assignment.find({ teacherId: req.query.teacherId }).select('_id');
      const assignmentIds = teacherAssignments.map(a => a._id);
      query = { assignmentId: { $in: assignmentIds } };
    }

    // try to populate 'assignment' only if it is referenced in schema
    let subs;
    try {
      const schemaPath = Submission.schema?.path('assignment');
      if (schemaPath && schemaPath.options && schemaPath.options.ref) {
        subs = await Submission.find(query).populate('assignment').sort({ createdAt: -1 }).lean();
      } else {
        subs = await Submission.find(query).sort({ createdAt: -1 }).lean();
      }
    } catch (popErr) {
      console.warn('[GET /api/submissions] populate failed, returning raw submissions', popErr);
      subs = await Submission.find(query).sort({ createdAt: -1 }).lean();
    }

    return res.json(Array.isArray(subs) ? subs : []);
  } catch (err) {
    console.error('[GET /api/submissions] error:', err);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/submissions/me
 * - Existing route: fetch current user's submissions
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const studentId = String(user._id ?? user.id ?? user.userId ?? '');
    const query = {
      $or: [{ student_id: studentId }, { studentId: studentId }, { student: studentId }],
    };

    let subs;
    try {
      const schemaPath = Submission.schema?.path('assignment');
      if (schemaPath && schemaPath.options && schemaPath.options.ref) {
        subs = await Submission.find(query).populate('assignment').sort({ createdAt: -1 }).lean();
      } else {
        subs = await Submission.find(query).sort({ createdAt: -1 }).lean();
      }
    } catch (popErr) {
      console.warn('[GET /api/submissions/me] populate failed, returning raw submissions', popErr);
      subs = await Submission.find(query).sort({ createdAt: -1 }).lean();
    }

    return res.json(Array.isArray(subs) ? subs : []);
  } catch (err) {
    console.error('[GET /api/submissions/me] error:', err);
    return res.status(500).json({ error: 'Failed to fetch your submissions' });
  }
});

/**
 * POST /api/submissions
 * - Create submission (requires auth)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { assignmentId, submissionText, submissionFileUrl } = req.body || {};

    const studentId = String(user._id ?? user.id ?? user.userId ?? '');

    const newSub = new Submission({
      assignmentId: assignmentId ?? null,
      submissionText: submissionText ?? '',
      submissionFileUrl: submissionFileUrl ?? null,
      studentId, // and/or student_id depending on your schema
      createdAt: new Date(),
    });

    const saved = await newSub.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('[POST /api/submissions] error:', err);
    return res.status(500).json({ error: 'Failed to create submission' });
  }
});

/**
 * PUT /api/submissions/:id/grade
 * Teacher/Admin grades a submission. Body: { grade, feedback }
 */
router.put('/:id/grade', authenticate, async (req, res) => {
  try {
    const role = req.user?.role || 'student';
    if (!['teacher', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const { grade, feedback } = req.body || {};
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (typeof grade === 'number') sub.grade = grade;
    if (feedback !== undefined) sub.feedback = feedback;
    sub.gradedAt = new Date();
    await sub.save();

    // Notify the student about their grade
    const studentId = sub.studentId || sub.student_id || sub.student;
    if (studentId) {
      let assignmentTitle = 'your assignment';
      let maxScore = null;
      try {
        const assignmentId = sub.assignmentId || sub.assignment_id || sub.assignment;
        if (assignmentId) {
          const a = await Assignment.findById(assignmentId).select('title maxScore courseId').lean();
          if (a) {
            assignmentTitle = a.title || assignmentTitle;
            maxScore = a.maxScore || a.max_score || null;
            // Update the enrollment progress if we can find the course
            if (a.courseId) {
              try {
                const enrollment = await CourseEnrollment.findOne({ courseId: a.courseId, studentId });
                if (enrollment && maxScore) {
                  // Compute a simple progress bump: increment by (grade/maxScore * portion)
                  const gainedPct = Math.round((sub.grade / maxScore) * 10); // each graded assignment worth ~10%
                  enrollment.progress = Math.min(100, (enrollment.progress || 0) + gainedPct);
                  await enrollment.save();
                }
              } catch (e) { /* non-critical */ }
            }
          }
        }
      } catch (e) { /* non-critical */ }

      const scoreMsg = maxScore ? `${sub.grade}/${maxScore}` : `${sub.grade}`;
      await createNotification({
        userId: studentId,
        title: 'Assignment Graded',
        message: `Your submission for "${assignmentTitle}" has been graded: ${scoreMsg}.${feedback ? ' Feedback: ' + feedback : ''}`,
        type: 'grade'
      });
    }

    return res.json(sub);
  } catch (err) {
    console.error('[PUT /api/submissions/:id/grade] error:', err);
    return res.status(500).json({ error: 'Failed to grade submission' });
  }
});


export default router;
