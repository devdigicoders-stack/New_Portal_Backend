import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/NewsPortal';

// Connect to MongoDB
export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
}

// ----------------- SCHEMAS & MODELS -----------------

// 1. User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'reporter', 'editor', 'admin'], default: 'user' },
  isApproved: { type: Boolean, default: true },
  savedNews: [{ type: Number }], // Array of integer IDs for card compatibility
  likedNews: [{ type: Number }]
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

// 2. News Schema
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

// 3. Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);

// 4. Activity Schema
const activitySchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export const Activity = mongoose.model('Activity', activitySchema);

// ----------------- SEEDER LOGIC -----------------

const initialNewsSeed = [
  {
    id: 1,
    title: 'PM Announces Major Economic Reform Package Worth ₹10 Lakh Crore',
    summary: 'The Prime Minister unveiled a comprehensive economic reform package aimed at boosting GDP growth and creating millions of jobs.',
    content: `The Prime Minister today announced a landmark economic reform package worth ₹10 lakh crore, targeting infrastructure development, digital economy, and rural employment. The package includes tax incentives for startups, increased allocation for rural development, and a new digital infrastructure initiative.\n\nExperts believe this could push India's GDP growth to 8% in the next fiscal year. The reforms also include simplification of GST slabs and reduction in corporate tax for MSMEs.\n\nThe opposition has raised questions about the funding mechanism, while industry bodies have largely welcomed the announcement.`,
    category: 'Politics',
    author: 'Rajesh Kumar',
    date: '2025-07-14',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&auto=format&fit=crop',
    video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    trending: true,
    breaking: true,
    status: 'approved',
    views: 45200,
    likes: 1230,
    comments: [
      { id: 1, user: 'Amit S.', text: 'Great initiative for the economy!', date: '2025-07-14' }
    ]
  },
  {
    id: 2,
    title: 'New Parliament Session Expected to Pass Sweeping Labor Laws',
    summary: 'The upcoming monsoon session of the parliament is set to debate and likely pass four new labor codes.',
    content: 'The government is preparing to introduce four new labor codes in the upcoming monsoon session. These codes aim to consolidate 29 existing labor laws. Unions have expressed mixed reactions, with some welcoming the simplification while others fear loss of job security.',
    category: 'Politics',
    author: 'Rajesh Kumar',
    date: '2025-07-07',
    image: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&auto=format&fit=crop',
    video: null,
    trending: false,
    breaking: false,
    status: 'approved',
    views: 12000,
    likes: 450,
    comments: []
  },
  {
    id: 5,
    title: 'India Wins T20 Series Against Australia 3-1',
    summary: 'Team India clinched the T20 series against Australia with a dominant 47-run victory in the final match at Wankhede Stadium.',
    content: 'India sealed a comprehensive 3-1 T20 series victory over Australia at a packed Wankhede Stadium. Rohit Sharma led from the front with a blistering 89 off 52 balls, while Jasprit Bumrah took 4 wickets to restrict Australia to 156.\n\nThe series win cements Indias position as the top-ranked T20 side in the world.',
    category: 'Sports',
    author: 'Sneha Patel',
    date: '2025-07-13',
    image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop',
    video: null,
    trending: true,
    breaking: false,
    status: 'approved',
    views: 89000,
    likes: 4500,
    comments: []
  },
  {
    id: 6,
    title: 'Neeraj Chopra Claims Gold at World Athletics Championships',
    summary: 'The star javelin thrower brought home another gold for India with a massive 89.94m throw.',
    content: 'Neeraj Chopra continued his golden run by securing the top spot at the World Athletics Championships. His final throw of 89.94 meters was enough to beat his European rivals.',
    category: 'Sports',
    author: 'Sneha Patel',
    date: '2025-07-05',
    image: 'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&auto=format&fit=crop',
    video: null,
    trending: true,
    breaking: true,
    status: 'approved',
    views: 150000,
    likes: 8900,
    comments: []
  },
  {
    id: 9,
    title: 'Apple Launches iPhone 17 with Revolutionary AI Camera System',
    summary: 'Apple unveiled the iPhone 17 series featuring an AI-powered camera system, titanium build, and 3-day battery life.',
    content: 'Apple has officially launched the iPhone 17 lineup, featuring a groundbreaking AI camera system that can automatically adjust settings based on scene recognition, lighting, and subject movement.',
    category: 'Technology',
    author: 'Arjun Mehta',
    date: '2025-07-13',
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop',
    video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    trending: true,
    breaking: false,
    status: 'approved',
    views: 120000,
    likes: 6700,
    comments: []
  },
  {
    id: 11,
    title: 'India Launches Chandrayaan-4 Successfully, Targets Lunar South Pole',
    summary: 'ISRO successfully launched Chandrayaan-4 with advanced drilling equipment to extract water ice from the lunar south pole.',
    content: 'ISRO successfully launched Chandrayaan-4 from the Satish Dhawan Space Centre, marking Indias most ambitious lunar mission to date. The spacecraft carries advanced drilling equipment capable of extracting water ice.',
    category: 'Technology',
    author: 'Vikram Nair',
    date: '2025-07-08',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop',
    video: null,
    trending: true,
    breaking: false,
    status: 'approved',
    views: 95000,
    likes: 5600,
    comments: []
  },
  {
    id: 13,
    title: 'Sensex Crosses 90,000 Mark for the First Time in History',
    summary: 'The BSE Sensex breached the historic 90,000 level driven by strong FII inflows and positive global cues.',
    content: 'The BSE Sensex crossed the 90,000 mark for the first time in history on Monday, driven by massive foreign institutional investor (FII) buying and positive global market sentiment. IT and banking stocks led the rally.',
    category: 'Business',
    author: 'Kavita Sharma',
    date: '2025-07-12',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
    video: null,
    trending: false,
    breaking: true,
    status: 'approved',
    views: 34000,
    likes: 890,
    comments: []
  },
  {
    id: 17,
    title: 'Bollywood Blockbuster "Jai Hind" Crosses ₹500 Crore in 5 Days',
    summary: 'The patriotic action drama starring Ranveer Singh and Deepika Padukone has become the fastest Bollywood film to cross ₹500 crore.',
    content: '"Jai Hind", the much-anticipated patriotic action drama, has shattered box office records by crossing ₹500 crore worldwide in just 5 days of release.',
    category: 'Entertainment',
    author: 'Pooja Verma',
    date: '2025-07-11',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop',
    video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    trending: true,
    breaking: false,
    status: 'approved',
    views: 67000,
    likes: 3200,
    comments: []
  },
  {
    id: 21,
    title: 'AIIMS Develops Breakthrough Cancer Vaccine Showing 94% Efficacy',
    summary: 'Researchers at AIIMS Delhi have developed a personalized mRNA cancer vaccine that has shown 94% efficacy in Phase 3 trials.',
    content: 'In a landmark achievement for Indian medical science, researchers at AIIMS Delhi have developed a personalized mRNA-based cancer vaccine that demonstrated 94% efficacy in Phase 3 clinical trials.',
    category: 'Health',
    author: 'Dr. Manish Gupta',
    date: '2025-07-10',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop',
    video: null,
    trending: false,
    breaking: false,
    status: 'approved',
    views: 52000,
    likes: 2800,
    comments: []
  },
  {
    id: 24,
    title: 'UN Security Council Passes Historic Climate Emergency Resolution',
    summary: 'The UN Security Council unanimously passed a resolution declaring climate change a global security threat, mandating immediate action.',
    content: 'In an unprecedented move, the United Nations Security Council unanimously passed a resolution declaring climate change an international security emergency.',
    category: 'World',
    author: 'Ananya Singh',
    date: '2025-07-09',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
    video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    trending: false,
    breaking: true,
    status: 'approved',
    views: 28000,
    likes: 1100,
    comments: []
  },
  {
    id: 29,
    title: 'Tesla Cybertruck Deliveries Begin in India',
    summary: 'The futuristic electric pickup truck has officially hit Indian roads, with the first 500 units delivered in Mumbai.',
    content: 'Tesla has commenced deliveries of its polarizing Cybertruck in India. The initial batch of 500 units was handed over to customers at a mega event in Mumbai.',
    category: 'Auto',
    author: 'Vikram Nair',
    date: '2025-07-02',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop',
    video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    trending: true,
    breaking: false,
    status: 'approved',
    views: 95000,
    likes: 4100,
    comments: []
  },
  {
    id: 31,
    title: 'NEET Reforms Proposed to Prevent Paper Leaks',
    summary: 'The Education Ministry proposes moving all national entrance exams to a secure, computer-based adaptive testing model.',
    content: 'In response to recent controversies, the Ministry of Education has proposed entirely scrapping paper-based testing for national entrance exams like NEET and JEE.',
    category: 'Education',
    author: 'Meera Singh',
    date: '2025-07-16',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop',
    video: null,
    trending: true,
    breaking: true,
    status: 'approved',
    views: 250000,
    likes: 12000,
    comments: []
  }
];

export async function seedDatabase() {
  // 1. Seed categories
  const categoriesCount = await Category.countDocuments();
  if (categoriesCount === 0) {
    const list = [
      'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health', 'World', 'Lifestyle', 'Auto', 'Education'
    ].map(name => ({ name }));
    await Category.insertMany(list);
    console.log('🌱 Seeded news categories.');
  }

  // 2. Seed default users
  const usersCount = await User.countDocuments();
  if (usersCount === 0) {
    const defaultUsers = [
      {
        name: 'Super Admin',
        email: 'admin@newsportal.com',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        savedNews: [],
        likedNews: []
      },
      {
        name: 'Senior Editor',
        email: 'editor@newsportal.com',
        password: bcrypt.hashSync('editor123', 10),
        role: 'editor',
        savedNews: [],
        likedNews: []
      },
      {
        name: 'Field Reporter',
        email: 'reporter@newsportal.com',
        password: bcrypt.hashSync('reporter123', 10),
        role: 'reporter',
        savedNews: [],
        likedNews: []
      },
      {
        name: 'Standard User',
        email: 'user@newsportal.com',
        password: bcrypt.hashSync('user123', 10),
        role: 'user',
        savedNews: [],
        likedNews: []
      }
    ];
    await User.insertMany(defaultUsers);
    console.log('🌱 Seeded staff & reader accounts.');
  }

  // 3. Seed news articles
  const newsCount = await News.countDocuments();
  if (newsCount === 0) {
    await News.insertMany(initialNewsSeed);
    console.log('🌱 Seeded initial news articles.');
  }

  // 4. Seed activities
  const activitiesCount = await Activity.countDocuments();
  if (activitiesCount === 0) {
    await Activity.create({
      user: 'Super Admin',
      action: 'System initialized and seeded MongoDB database.'
    });
    console.log('🌱 Seeded activity audit trail.');
  }
}
