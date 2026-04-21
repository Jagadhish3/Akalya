import express from 'express';
import Attendance from '../models/Attendance.js';
import CourseEnrollment from '../models/CourseEnrollment.js';

const router = express.Router();

// Bulk save attendance records
router.post('/', async (req, res) => {
  const { records } = req.body; // Array of { courseId, studentId, date, status }
  
  if (!Array.isArray(records)) {
    return res.status(400).json({ message: 'Records must be an array' });
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
    res.status(201).json({ message: 'Attendance records saved successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get attendance summary for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.params.studentId });
    const present = attendance.filter(a => a.status === 'present').length;
    const total = attendance.length;
    
    res.json({
      present,
      absent: total - present,
      total,
      percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get attendance history for a course
router.get('/course/:courseId', async (req, res) => {
    try {
      const attendance = await Attendance.find({ courseId: req.params.courseId }).populate('studentId', 'fullName email');
      res.json(attendance);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

export default router;
