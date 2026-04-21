// server/routes/enrollments.js
import express from 'express';
import CourseEnrollment from '../models/CourseEnrollment.js';
import Course from '../models/Course.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createNotification } from './notifications.js';


const router = express.Router();

// Get enrollments
router.get('/', authenticate, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'student') filter.studentId = req.user._id;

    const enrollments = await CourseEnrollment.find(filter)
      .populate({
        path: 'courseId',
        select: 'title description status teacherId createdAt updatedAt',
        populate: { path: 'teacherId', select: 'fullName email' }
      })
      .populate('studentId', 'fullName email')
      .sort({ enrolledAt: -1 });

    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Enroll in course (students only)
router.post('/', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: 'Course ID is required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.status !== 'published') return res.status(400).json({ error: 'Course is not available for enrollment' });

    const existing = await CourseEnrollment.findOne({ courseId, studentId: req.user._id });
    if (existing) return res.status(400).json({ error: 'Already enrolled in this course' });

    const enrollment = new CourseEnrollment({ courseId, studentId: req.user._id });
    await enrollment.save();
    await enrollment.populate({
      path: 'courseId',
      select: 'title description status teacherId createdAt updatedAt',
      populate: { path: 'teacherId', select: 'fullName email' }
    });
    await enrollment.populate('studentId', 'fullName email');

    // Notify the student of successful enrollment
    await createNotification({
      userId: req.user._id,
      title: 'Enrolled in Course',
      message: `You have successfully enrolled in "${course.title}". Your teacher will be able to mark your attendance and assignments.`,
      type: 'course'
    });

    res.status(201).json(enrollment);

  } catch (error) {
    console.error('Enroll error:', error);
    if (error.code === 11000) return res.status(400).json({ error: 'Already enrolled in this course' });
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

// Update enrollment progress
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { progress } = req.body;
    const enrollment = await CourseEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    if (req.user.role === 'student' && enrollment.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (progress !== undefined) enrollment.progress = Math.max(0, Math.min(100, progress));
    await enrollment.save();
    await enrollment.populate({
      path: 'courseId',
      select: 'title description status teacherId createdAt updatedAt',
      populate: { path: 'teacherId', select: 'fullName email' }
    });
    await enrollment.populate('studentId', 'fullName email');

    res.json(enrollment);
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

export default router;
