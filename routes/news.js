import express from 'express';
import { News, User, Activity } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'newsportal_super_secret_key';

// Middleware to optionally decode JWT without throwing errors for list queries
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {}
  }
  next();
}

// Reporter Dashboard - Get reporter's articles with stats
router.get('/reporter/dashboard', authenticate, authorize(['reporter']), async (req, res) => {
  try {
    const reporterName = req.user.name;
    
    const [totalNews, approvedNews, pendingNews, rejectedNews, draftNews] = await Promise.all([
      News.countDocuments({ author: reporterName }),
      News.countDocuments({ author: reporterName, status: 'approved' }),
      News.countDocuments({ author: reporterName, status: 'pending' }),
      News.countDocuments({ author: reporterName, status: 'rejected' }),
      News.countDocuments({ author: reporterName, status: 'draft' })
    ]);

    const recentArticles = await News.find({ author: reporterName })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('id title status date views likes rejectionReason');

    res.json({
      stats: {
        totalNews,
        approvedNews,
        pendingNews,
        rejectedNews,
        draftNews
      },
      recentArticles
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error loading reporter dashboard.' });
  }
});

// Get reporter's articles by status
router.get('/reporter/articles', authenticate, authorize(['reporter']), async (req, res) => {
  try {
    const { status } = req.query;
    const reporterName = req.user.name;
    const filter = { author: reporterName };
    
    if (status && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const articles = await News.find(filter)
      .sort({ createdAt: -1 })
      .select('id title summary category status date views likes rejectionReason');

    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving articles.' });
  }
});

// Fetch all news with advanced search and filtering
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const isStaff = req.user && ['admin', 'editor', 'reporter'].includes(req.user.role);
    const { status, category, author, trending, breaking, search } = req.query;
    
    const filter = {};

    // 1. Handle status filtering & validation (supporting automatic scheduled publication)
    if (status) {
      if (status === 'pending') {
        if (!isStaff) {
          return res.status(403).json({ error: 'Forbidden: Standard users cannot access pending news drafts.' });
        }
        filter.status = 'pending';
      } else if (status === 'approved') {
        if (!isStaff) {
          filter.$or = [
            { status: 'approved' },
            { status: 'scheduled', scheduledPublishDate: { $lte: new Date() } }
          ];
        } else {
          filter.status = 'approved';
        }
      } else {
        filter.status = status;
      }
    } else {
      // If no status is specified, standard users only get approved and past due scheduled news.
      if (!isStaff) {
        filter.$or = [
          { status: 'approved' },
          { status: 'scheduled', scheduledPublishDate: { $lte: new Date() } }
        ];
      }
    }

    // 2. Handle category filtering
    if (category) {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // 3. Handle author filtering
    if (author) {
      filter.author = { $regex: new RegExp(author.trim(), 'i') };
    }

    // 4. Handle trending filtering
    if (trending !== undefined) {
      filter.trending = trending === 'true';
    }

    // 5. Handle breaking filtering
    if (breaking !== undefined) {
      filter.breaking = breaking === 'true';
    }

    // 6. Handle text search across title and summary
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { summary: searchRegex },
        { content: searchRegex }
      ];
    }

    const list = await News.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving news feed.' });
  }
});

// Fetch single news by Custom ID
router.get('/:id', async (req, res) => {
  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    
    // Increment views automatically
    article.views = (article.views || 0) + 1;
    await article.save();
    
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving article.' });
  }
});

// Submit news article (Reporter / Editor / Admin)
router.post('/', authenticate, authorize(['reporter', 'editor', 'admin']), async (req, res) => {
  const { title, summary, content, category, tags, image, video, breaking, trending } = req.body;
  
  // Validation
  if (!title || title.trim().length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters.' });
  }
  if (!summary || summary.trim().length < 10) {
    return res.status(400).json({ error: 'Summary must be at least 10 characters.' });
  }
  if (!content || content.trim().length < 50) {
    return res.status(400).json({ error: 'Content must be at least 50 characters.' });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Category is required.' });
  }

  try {
    const isReporter = req.user.role === 'reporter';
    let status = isReporter ? 'pending' : 'approved';
    
    // Explicitly allow saving as draft or sending as pending
    if (req.body.status && ['draft', 'pending'].includes(req.body.status)) {
      status = req.body.status;
    }

    const lastArticle = await News.findOne().sort({ id: -1 });
    const nextId = lastArticle ? lastArticle.id + 1 : 1;

    const newArticle = await News.create({
      id: nextId,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category: category.trim(),
      tags: tags || [],
      image: image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
      video: video || null,
      author: req.user.name,
      trending: trending || false,
      breaking: breaking || false,
      status,
      views: 0,
      likes: 0,
      comments: []
    });

    await Activity.create({
      user: req.user.name,
      action: `Created article draft: "${title}" (Status: ${status})`
    });

    res.status(201).json({
      message: isReporter ? 'Draft submitted successfully! Awaiting Editor approval.' : 'Article published successfully!',
      article: newArticle
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error publishing article.' });
  }
});

// Edit article details
router.put('/:id', authenticate, authorize(['reporter', 'editor', 'admin']), async (req, res) => {
  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Restrict reporters to edit only their own articles and only before approval
    const isReporter = req.user.role === 'reporter';
    if (isReporter) {
      if (article.author !== req.user.name) {
        return res.status(403).json({ error: 'Forbidden: Reporters can only update their own articles.' });
      }
      if (article.status === 'approved') {
        return res.status(403).json({ error: 'Forbidden: Reporters cannot edit already approved live articles.' });
      }
    }

    const { title, summary, content, category, tags, image, video, breaking, trending } = req.body;
    
    // Validation
    if (title && title.trim().length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters.' });
    }
    if (summary && summary.trim().length < 10) {
      return res.status(400).json({ error: 'Summary must be at least 10 characters.' });
    }
    if (content && content.trim().length < 50) {
      return res.status(400).json({ error: 'Content must be at least 50 characters.' });
    }
    
    if (title !== undefined) article.title = title.trim();
    if (summary !== undefined) article.summary = summary.trim();
    if (content !== undefined) article.content = content.trim();
    if (category !== undefined) article.category = category.trim();
    if (tags !== undefined) article.tags = tags;
    if (image !== undefined) article.image = image;
    if (video !== undefined) article.video = video;
    if (breaking !== undefined) article.breaking = breaking;
    if (trending !== undefined) article.trending = trending;

    // If reporter edits, reset status to pending (or draft if explicitly requested)
    if (isReporter) {
      article.status = req.body.status && ['draft', 'pending'].includes(req.body.status) ? req.body.status : 'pending';
      article.rejectionReason = null;
    }

    await article.save();

    await Activity.create({
      user: req.user.name,
      action: `Edited article details for: "${article.title}"`
    });

    res.json({ message: 'Article updated successfully!', article });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating article.' });
  }
});

// Content Final Approval / Scheduling (Editor / Admin only)
router.put('/:id/approve', authenticate, authorize(['editor', 'admin']), async (req, res) => {
  const { scheduledPublishDate } = req.body;

  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    if (scheduledPublishDate) {
      article.status = 'scheduled';
      article.scheduledPublishDate = new Date(scheduledPublishDate);
    } else {
      article.status = 'approved';
      article.scheduledPublishDate = null;
    }

    article.rejectionReason = null;
    article.feedback = null;
    article.approvedBy = req.user.name;
    await article.save();

    await Activity.create({
      user: req.user.name,
      action: `${scheduledPublishDate ? 'Scheduled' : 'Approved'} draft and published: "${article.title}"`
    });

    res.json({ 
      message: scheduledPublishDate ? 'Article scheduled successfully for later publication!' : 'Article approved and published live!', 
      article 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error approving draft.' });
  }
});

// Reject News & Send Feedback (Editor / Admin only)
router.put('/:id/reject', authenticate, authorize(['editor', 'admin']), async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason / feedback is required.' });
  }

  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    article.status = 'rejected';
    article.rejectionReason = reason.trim();
    article.feedback = reason.trim();
    article.rejectedBy = req.user.name;
    await article.save();

    await Activity.create({
      user: req.user.name,
      action: `Rejected article: "${article.title}" - Reason/Feedback: ${reason}`
    });

    res.json({ message: 'Article rejected and feedback sent successfully!', article });
  } catch (error) {
    res.status(500).json({ error: 'Server error rejecting article.' });
  }
});

// Editor Personal Audit & Approval History (Editor / Admin only)
router.get('/editor/history', authenticate, authorize(['editor', 'admin']), async (req, res) => {
  try {
    const editorName = req.user.name;

    const history = await News.find({
      $or: [
        { approvedBy: editorName },
        { rejectedBy: editorName }
      ]
    }).sort({ updatedAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving editor action history.' });
  }
});

// Direct Schedule News Article (Editor / Admin only)
router.put('/:id/schedule', authenticate, authorize(['editor', 'admin']), async (req, res) => {
  const { scheduledPublishDate } = req.body;
  if (!scheduledPublishDate) {
    return res.status(400).json({ error: 'scheduledPublishDate is required in request body.' });
  }

  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    article.status = 'scheduled';
    article.scheduledPublishDate = new Date(scheduledPublishDate);
    article.approvedBy = req.user.name;
    article.rejectionReason = null;
    article.feedback = null;
    await article.save();

    await Activity.create({
      user: req.user.name,
      action: `Scheduled article directly: "${article.title}" to publish at: ${scheduledPublishDate}`
    });

    res.json({ message: 'Article scheduled successfully!', article });
  } catch (error) {
    res.status(500).json({ error: 'Server error scheduling article.' });
  }
});

// Delete Article (Admin only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    await News.deleteOne({ id: article.id });

    await Activity.create({
      user: req.user.name,
      action: `Deleted article: "${article.title}"`
    });

    res.json({ message: 'Article deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting article.' });
  }
});

// Post Reader Comment
router.post('/:id/comments', authenticate, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be blank.' });
  }

  try {
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    const newComment = {
      id: Date.now(),
      user: req.user.name,
      text: text.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    article.comments.push(newComment);
    await article.save();

    res.status(201).json({
      message: 'Comment added successfully!',
      comment: newComment,
      comments: article.comments
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error posting comment.' });
  }
});

// Toggle Like
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!user || !article) {
      return res.status(404).json({ error: 'User or Article not found.' });
    }

    let likedNews = user.likedNews || [];
    let likes = article.likes || 0;

    if (likedNews.includes(article.id)) {
      likedNews = likedNews.filter(id => id !== article.id);
      likes = Math.max(0, likes - 1);
    } else {
      likedNews.push(article.id);
      likes += 1;
    }

    user.likedNews = likedNews;
    await user.save();

    article.likes = likes;
    await article.save();

    res.json({
      liked: likedNews.includes(article.id),
      likes: article.likes,
      likedNews: user.likedNews
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error processing like.' });
  }
});

// Toggle Save / Bookmark
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const article = await News.findOne({ id: parseInt(req.params.id) });
    if (!user || !article) {
      return res.status(404).json({ error: 'User or Article not found.' });
    }

    let savedNews = user.savedNews || [];

    if (savedNews.includes(article.id)) {
      savedNews = savedNews.filter(id => id !== article.id);
    } else {
      savedNews.push(article.id);
    }

    user.savedNews = savedNews;
    await user.save();

    res.json({
      saved: savedNews.includes(article.id),
      savedNews: user.savedNews
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error processing bookmark.' });
  }
});

// GET all reader comments across all articles (Editor & Admin only)
router.get('/comments/all', authenticate, authorize(['editor', 'admin']), async (req, res) => {
  try {
    const articles = await News.find({ 'comments.0': { $exists: true } });
    let allComments = [];
    
    articles.forEach(article => {
      article.comments.forEach(comment => {
        allComments.push({
          id: comment.id,
          user: comment.user,
          text: comment.text,
          date: comment.date,
          articleId: article.id,
          articleTitle: article.title
        });
      });
    });
    
    // Sort comments by ID descending (newest first)
    allComments.sort((a, b) => b.id - a.id);
    res.json(allComments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching all reader comments.' });
  }
});

// DELETE/moderate reader comment from an article (Editor & Admin only)
router.delete('/:id/comments/:commentId', authenticate, authorize(['editor', 'admin']), async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);

    const article = await News.findOne({ id: articleId });
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    const initialLength = article.comments.length;
    article.comments = article.comments.filter(c => c.id !== commentId);

    if (article.comments.length === initialLength) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    await article.save();

    await Activity.create({
      user: req.user.name,
      action: `Moderated & deleted reader comment by "${req.user.name}" on article: "${article.title}"`
    });

    res.json({ message: 'Comment moderated and deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting reader comment.' });
  }
});

export default router;
