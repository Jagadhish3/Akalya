// server/routes/announcements.js
import express from 'express';
import Announcement from '../models/Announcement.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/announcements - Fetch for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    let query = {
      $or: [
        { audience: 'All Users' },
        { audience: role === 'student' ? 'Students Only' : 'Teachers Only' }
      ]
    };

    // Admins see all
    if (role === 'admin') query = {};

    const announcements = await Announcement.find(query)
      .populate('sender', 'fullName')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements - Create (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const announcement = new Announcement({
      ...req.body,
      sender: req.user._id
    });
    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id - Remove
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
