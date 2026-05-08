// server/routes/forum.js
import express from 'express';
import ForumPost from '../models/ForumPost.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/forum - List all posts
router.get('/', authenticate, async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .populate('author', 'fullName')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/forum - Create post
router.post('/', authenticate, async (req, res) => {
  try {
    const post = new ForumPost({
      ...req.body,
      author: req.user._id
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/forum/:id - Moderation (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await ForumPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
