import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  id: { type: Number, default: () => Date.now() },
  user: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

const newsSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true, minlength: 5, maxlength: 200 },
  summary: { type: String, required: true, minlength: 10, maxlength: 500 },
  content: { type: String, required: true, minlength: 50 },
  category: { type: String, required: true },
  tags: [{ type: String }],
  author: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  image: { type: String, default: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800' },
  video: { type: String, default: null },
  trending: { type: Boolean, default: false },
  breaking: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'scheduled'], default: 'draft' },
  rejectionReason: { type: String, default: null },
  feedback: { type: String, default: null },
  scheduledPublishDate: { type: Date, default: null },
  approvedBy: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: [commentSchema]
}, { timestamps: true });

newsSchema.index({ author: 1, status: 1 });
newsSchema.index({ status: 1, createdAt: -1 });
newsSchema.index({ category: 1 });
newsSchema.index({ title: 'text', summary: 'text', content: 'text' });

export const News = mongoose.model('News', newsSchema);
