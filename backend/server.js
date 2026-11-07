import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Start HTTP Server immediately so port 5000 is open without delay
const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` Dairy Asset Suite Backend Running on Port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Health Endpoint: http://localhost:${PORT}/api/v1/health`);
  console.log(`================================================================`);
});

// Handle port collision gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use by another process.`);
    console.error(`To stop the existing process holding port ${PORT}, run this in PowerShell:`);
    console.error(`Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
  } else {
    console.error('Server error:', err);
  }
});

// Connect to Database concurrently
connectDB().catch((err) => {
  console.error(`[Database Warning] Async DB connection error: ${err.message}`);
});

