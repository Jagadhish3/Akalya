import mongoose from 'mongoose';

const courseEnrollmentSchema = new mongoose.Schema({
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
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  completedUnits: [{
    type: Number,
    min: 1,
    max: 6
  }],
  enrolledAt: {
    type: Date,
    default: Date.now
  }
}, {
  unique: true,
  uniqueFields: ['courseId', 'studentId']
});

// Compound index to ensure unique enrollment
courseEnrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('CourseEnrollment', courseEnrollmentSchema);

