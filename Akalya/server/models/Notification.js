import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['assignment', 'grade', 'attendance', 'course', 'announcement', 'reminder'],
    default: 'announcement'
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', notificationSchema);
