const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { cleanupOldFiles } = require('./utils/cleanup');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create required directories
const dirs = [
  path.join(__dirname, process.env.UPLOAD_DIR || 'uploads'),
  path.join(__dirname, process.env.CONVERTED_DIR || 'converted'),
  path.join(__dirname, 'data')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize users.json if it doesn't exist
const usersFilePath = path.join(__dirname, 'data', 'users.json');
if (!fs.existsSync(usersFilePath)) {
  fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2));
}

// Middleware - CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://backend-pdf-three.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // In production, also allow any vercel.app domain
      if (origin.endsWith('.vercel.app') || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PDF Converter API is running' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Schedule cleanup job - runs every 10 minutes
const retentionMinutes = parseInt(process.env.FILE_RETENTION_MINUTES) || 30;
cron.schedule('*/10 * * * *', () => {
  console.log('Running scheduled cleanup...');
  cleanupOldFiles(retentionMinutes);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${dirs[0]}`);
  console.log(`📄 Converted directory: ${dirs[1]}`);
  console.log(`🧹 Auto-cleanup: Every 10 minutes (files older than ${retentionMinutes} minutes)`);
});
