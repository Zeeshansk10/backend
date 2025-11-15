const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  convertFile,
  getFiles,
  downloadFile,
  deleteFile
} = require('../controllers/fileController');

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 uploads per window
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/files/convert
// @desc    Upload and convert file to PDF
// @access  Private
router.post('/convert', auth, uploadLimiter, upload.single('file'), convertFile);

// @route   GET /api/files/list
// @desc    Get user's converted files
// @access  Private
router.get('/list', auth, getFiles);

// @route   GET /api/files/download/:filename
// @desc    Download converted PDF file
// @access  Private
router.get('/download/:filename', auth, downloadFile);

// @route   DELETE /api/files/:filename
// @desc    Delete a converted file
// @access  Private
router.delete('/:filename', auth, deleteFile);

module.exports = router;
