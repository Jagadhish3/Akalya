// server/models/Class.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const ClassSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
  title: String,
  description: String,
  classType: { type: String, enum: ['live','recorded'], default: 'recorded' },
  scheduledAt: Date,
  videoUrl: String,
  transcript: String,
  isDownloadable: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  unit: { type: Number, min: 1, max: 6 },
}, { timestamps: true });

export default mongoose.model('Class', ClassSchema);
