import mongoose from 'mongoose';
import { News } from './models/News.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/NewsPortal';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const articles = await News.find({});
    articles.forEach(art => {
      console.log(`ID: ${art.id} | Title: ${art.title} | Status: "${art.status}" | Feedback: "${art.feedback}"`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
