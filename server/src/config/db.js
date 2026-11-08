import { setServers } from 'node:dns';
import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance-tax-community';

  if (!process.env.MONGO_URI) {
    console.log('MongoDB URI not configured. Running in local dev fallback mode.');
    return null;
  }

  const dnsServers = process.env.MONGODB_DNS_SERVERS
    ?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers?.length) {
    setServers(dnsServers);
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);

    if (mongoUri.startsWith('mongodb+srv://') && error.message.includes('querySrv')) {
      console.error(
        'Atlas SRV DNS lookup failed. Configure MONGODB_DNS_SERVERS in server/.env and restart the server.'
      );
    }

    return null;
  }
};
