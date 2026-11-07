import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly ensure .env is loaded from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fix for Node.js on Windows: Use Google & Cloudflare DNS to reliably resolve
// MongoDB Atlas SRV records (prevents 'querySrv ETIMEOUT' on local routers/firewalls)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  // Graceful fallback
}

/**
 * MongoDB Connection Handler with Auto-reconnect & Graceful Fallback
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dairy_asset_suite';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Warning] MongoDB connection error: ${error.message}`);
    console.warn(`[Database Notice] Application will continue running. Ensure MongoDB Atlas or local daemon is running.`);
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database Error] Mongoose error: ${err.message}`);
});
