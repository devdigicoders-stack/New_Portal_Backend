import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, seedDatabase } from './db.js';

// Route Imports
import authRoutes from './routes/auth.js';
import newsRoutes from './routes/news.js';
import usersRoutes from './routes/users.js';
import categoriesRoutes from './routes/categories.js';
import activitiesRoutes from './routes/activities.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// Serve local backup uploads statically
app.use('/uploads', express.static('data/uploads'));

// Connect to MongoDB & Seed standard data collections asynchronously
try {
  await connectDB();
  await seedDatabase();
} catch (error) {
  console.error('Failed to connect to MongoDB or initialize data:', error);
}

// REST API Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NewsPortal API Server is healthy and running.' });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: Cannot ${req.method} ${req.originalUrl}` });
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  NewsPortal API Server listening on: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
