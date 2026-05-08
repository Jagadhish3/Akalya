// server/controllers/preparationResourcesController.js
import PreparationResource from "../models/PreparationResource.js";

export const getAll = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.classLevel) filter.classLevel = req.query.classLevel;
    
    if (req.query.teacherId) {
      // Teachers see:
      // 1. Resources they created
      // 2. Global resources (no creator or created by admin - usually null createdBy)
      filter.$or = [
        { createdBy: req.query.teacherId },
        { createdBy: null },
        { createdBy: { $exists: false } }
      ];
    }

    const list = await PreparationResource.find(filter).sort({ type: 1, title: 1 });
    return res.json(list);
  } catch (err) {
    console.error("preparationResources getAll:", err);
    return res.status(500).json({ error: "Failed to fetch resources" });
  }
};

export const getById = async (req, res) => {
  try {
    const doc = await PreparationResource.findById(req.params.id).populate("examIds", "name slug");
    if (!doc) return res.status(404).json({ error: "Resource not found" });
    return res.json(doc);
  } catch (err) {
    console.error("preparationResources getById:", err);
    return res.status(500).json({ error: "Failed to fetch resource" });
  }
};

export const create = async (req, res) => {
  try {
    const body = req.body;
    if (!body.title || !body.title.trim()) return res.status(400).json({ error: "Title is required" });
    if (!body.type) return res.status(400).json({ error: "Type is required" });
    const doc = new PreparationResource({ ...body, createdBy: req.user.id });
    await doc.save();
    return res.status(201).json(doc);
  } catch (err) {
    console.error("preparationResources create:", err);
    return res.status(500).json({ error: "Failed to create resource" });
  }
};

export const update = async (req, res) => {
  try {
    const doc = await PreparationResource.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Resource not found" });
    Object.assign(doc, req.body);
    await doc.save();
    return res.json(doc);
  } catch (err) {
    console.error("preparationResources update:", err);
    return res.status(500).json({ error: "Failed to update resource" });
  }
};

export const remove = async (req, res) => {
  try {
    const doc = await PreparationResource.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Resource not found" });
    await doc.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    console.error("preparationResources remove:", err);
    return res.status(500).json({ error: "Failed to delete resource" });
  }
};
