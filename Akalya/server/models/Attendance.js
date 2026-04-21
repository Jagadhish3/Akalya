import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  }
}, {
  timestamps: true
});

// Ensure a student only has one attendance record per course per day
attendanceSchema.index({ courseId: 1, studentId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
