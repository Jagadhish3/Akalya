// server/routes/notifications.js
import express from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications/me  - fetch current user's notifications
router.get('/me', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read  - mark one as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// PUT /api/notifications/read-all  - mark all as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

// Helper used by other routes to create a notification (not exposed as HTTP, exported as function)
export const createNotification = async ({ userId, title, message, type = 'announcement' }) => {
  try {
    await Notification.create({ userId, title, message, type });
  } catch (err) {
    console.error('createNotification error:', err);
  }
};

export default router;
