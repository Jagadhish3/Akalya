// server/controllers/submissionsController.js
import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";

/**
 * Create a student's submission for an assignment.
 * NOTE: students may submit ONLY ONCE. If a submission already exists for (assignmentId, studentId),
 * this returns 409 Conflict and does NOT overwrite the previous submission.
 */
export const createSubmission = async (req, res) => {
  try {
    const studentId = req.user?.id ?? req.user?._id;
    const { assignmentId, submissionText, submissionFileUrl } = req.body;

    if (!studentId) return res.status(401).json({ error: "Unauthorized" });
    if (!assignmentId) return res.status(400).json({ error: "assignmentId is required" });

    // check existing submission (assignmentId + studentId)
    const existing = await Submission.findOne({ assignmentId, studentId });
    if (existing) {
      return res.status(409).json({ error: "You have already submitted for this assignment" });
    }

    const created = await Submission.create({
      assignmentId,
      studentId,
      submissionText,
      submissionFileUrl,
      submittedAt: new Date(),
      status: "submitted",
    });

    // populate student for client convenience
    await created.populate("studentId", "fullName username email");

    return res.status(201).json(created);
  } catch (err) {
    console.error("createSubmission error", err);
    // keep 409 handling just in case of race conditions (unique index)
    if (err?.code === 11000) {
      return res.status(409).json({ error: "You have already submitted for this assignment" });
    }
    return res.status(500).json({ error: err.message ?? "Server error" });
  }
};

export const getSubmissions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.assignmentId) filter.assignmentId = req.query.assignmentId;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    if (req.query.teacherId) {
      const assignments = await Assignment.find({ teacherId: req.query.teacherId }).select("_id");
      const assignmentIds = assignments.map((a) => a._id);
      filter.assignmentId = { $in: assignmentIds };
    }

    const submissions = await Submission.find(filter)
      .sort({ submittedAt: -1 })
      .populate("studentId", "fullName username email");

    return res.json(submissions);
  } catch (err) {
    console.error("getSubmissions error", err);
    return res.status(500).json({ error: err.message ?? "Server error" });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Submission id required" });

    const submission = await Submission.findById(id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    if (submission.status === "graded" || (submission.grade !== undefined && submission.grade !== null)) {
      return res.status(409).json({ error: "This submission has already been graded" });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = "graded";
    submission.gradedAt = new Date();

    const updated = await submission.save();
    await updated.populate("studentId", "fullName username email");

    return res.json(updated);
  } catch (err) {
    console.error("gradeSubmission error", err);
    return res.status(500).json({ error: err.message ?? "Server error" });
  }
};
