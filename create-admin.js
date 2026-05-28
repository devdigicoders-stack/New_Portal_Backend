import { connectDB, User, Activity } from './db.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const args = process.argv.slice(2);
  
  let name = args[0];
  let email = args[1];
  let password = args[2];

  if (!name || !email || !password) {
    console.log('\n❌ Error: Missing required arguments.');
    console.log('👉 Usage: node create-admin.js <FullName> <Email> <Password>');
    console.log('📝 Example: node create-admin.js "Super Admin" "admin@newsportal.com" "securepass123"\n');
    process.exit(1);
  }

  try {
    // 1. Establish database connection
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    
    if (existing) {
      // If user exists, promote them to Admin
      console.log(`⚠️ User "${email}" already exists. Upgrading their role to "admin"...`);
      existing.role = 'admin';
      await existing.save();
      console.log(`✅ Success! User "${existing.name}" is now an Admin!`);
    } else {
      // Create new Admin account
      const hashed = bcrypt.hashSync(password, 10);
      const newAdmin = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashed,
        role: 'admin',
        savedNews: [],
        likedNews: []
      });

      // Audit log the creation
      await Activity.create({
        user: 'System CLI',
        action: `Created new Admin account via CLI: "${name}" (${email})`
      });

      console.log(`\n================================================`);
      console.log(`🎉 SUCCESS: Admin Account Created!`);
      console.log(`================================================`);
      console.log(`👤 Name:     ${newAdmin.name}`);
      console.log(`📧 Email:    ${newAdmin.email}`);
      console.log(`🛡️ Role:     ${newAdmin.role}`);
      console.log(`================================================\n`);
    }
  } catch (error) {
    console.error('❌ Error creating Admin account:', error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
