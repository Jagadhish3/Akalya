// server/routes/classes.js
import express from 'express';
import ClassModel from '../models/Class.js'; // make sure server/models/Class.js exports default (see note)

const router = express.Router();

// Helper: build a base filter from query params
function buildFilterFromReqQuery(q) {
  const filter = {};

  if (q.courseId) {
    filter.course = q.courseId;
  }
  if (q.status) {
    filter.status = q.status;
  }

  if (q.hasVideo === 'true' || q.hasVideo === true) {
    filter.$or = [
      { hasVideo: true },
      { videoUrl: { $exists: true, $ne: '' } },
      { video: { $exists: true, $ne: '' } },
      { url: { $exists: true, $ne: '' } },
      { src: { $exists: true, $ne: '' } },
      { file: { $exists: true, $ne: '' } },
    ];
  }

  if (q.forStudent === 'true' || q.forStudent === true) {
    filter.isPublic = true;
  } else if (q.isPublic === 'true' || q.isPublic === 'false') {
    filter.isPublic = q.isPublic === 'true';
  }

  return filter;
}

// GET /api/classes
router.get('/', async (req, res) => {
  try {
    const filter = buildFilterFromReqQuery(req.query);
    const classes = await ClassModel.find(filter).populate('course', 'title description').sort({ createdAt: -1 }).lean();
    res.json(classes);
  } catch (err) {
    console.error('GET /api/classes error', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/:id
router.get('/:id', async (req, res) => {
  try {
    const cls = await ClassModel.findById(req.params.id).lean();
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    res.json(cls);
  } catch (err) {
    console.error('GET /api/classes/:id error', err);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// POST /api/classes
router.post('/', async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      classType,
      scheduledAt,
      videoUrl,
      transcript,
      isDownloadable,
      isPublic,
      unit,
    } = req.body;

    if (!title || !classType) {
      return res.status(400).json({ error: 'Missing required fields: title and classType' });
    }

    const payload = {
        course: courseId || null,
        title,
        description: description || '',
        classType,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        videoUrl: videoUrl || '',
        transcript: transcript || '',
        isDownloadable: !!isDownloadable,
        isPublic: !!isPublic,
        unit: unit ? Number(unit) : null,
        // auto-set hasVideo if videoUrl is present OR if caller passed hasVideo
        hasVideo: !!( (typeof req.body.hasVideo !== 'undefined' && req.body.hasVideo) || (videoUrl && videoUrl.trim()) ),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      

    const created = await ClassModel.create(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/classes error', err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// PUT /api/classes/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: Date.now() };
    const updated = await ClassModel.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Class not found' });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/classes/:id error', err);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

export default router;
