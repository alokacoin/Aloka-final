import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';

const promoteAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error('Set ADMIN_EMAIL in server/.env to the email of an existing account.');
  }

  const connection = await connectDB();
  if (!connection) throw new Error('MongoDB is unavailable; administrator role was not changed.');

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`No account found for ${email}. Register that account first, then run this command again.`);
  }

  user.role = 'admin';
  await user.save();
  console.log(`Administrator access enabled for ${user.email}. No password was created or changed.`);
};

promoteAdmin()
  .catch((error) => {
    console.error('Administrator promotion failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
