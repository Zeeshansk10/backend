const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    // Documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'text/plain',
    // Spreadsheets
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    // Presentations
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint', // ppt
    // PDF
    'application/pdf'
  ];

  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp',
    '.docx', '.doc', '.txt',
    '.xlsx', '.xls',
    '.pptx', '.ppt',
    '.pdf'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype}. Allowed: images, Word, Excel, PowerPoint, text, PDF`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 20) * 1024 * 1024 // Convert MB to bytes
  }
});

module.exports = upload;
