const path = require('path');
const fs = require('fs');
const { convertFile } = require('../utils/converter');
const { deleteFile } = require('../utils/cleanup');

const usersFilePath = path.join(__dirname, '../data/users.json');
const convertedDir = path.join(__dirname, '..', process.env.CONVERTED_DIR || 'converted');

// Helper functions
const readUsers = () => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Upload and convert file
exports.convertFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const originalName = path.parse(req.file.originalname).name;
    const timestamp = Date.now();
    const outputFilename = `${timestamp}-${originalName}.pdf`;
    const outputPath = path.join(convertedDir, outputFilename);

    console.log(`Converting: ${req.file.originalname} -> ${outputFilename}`);

    // Ensure converted directory exists
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    try {
      // Convert the file
      await convertFile(inputPath, outputPath);

      // Delete the original uploaded file
      deleteFile(inputPath);

      // Save file info to user's record
      const users = readUsers();
      const userIndex = users.findIndex(u => u.id === req.user.id);

      if (userIndex !== -1) {
        if (!users[userIndex].files) {
          users[userIndex].files = [];
        }

        users[userIndex].files.push({
          id: timestamp.toString(),
          originalName: req.file.originalname,
          convertedName: outputFilename,
          size: req.file.size,
          convertedAt: new Date().toISOString()
        });

        writeUsers(users);
      }

      res.json({
        message: 'File converted successfully',
        file: {
          id: timestamp.toString(),
          originalName: req.file.originalname,
          convertedName: outputFilename,
          downloadUrl: `/api/files/download/${outputFilename}`
        }
      });
    } catch (conversionError) {
      // Delete uploaded file on conversion error
      deleteFile(inputPath);
      throw conversionError;
    }
  } catch (error) {
    console.error('Convert file error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }

    res.status(500).json({ 
      error: 'Conversion failed', 
      details: error.message 
    });
  }
};

// Get user's converted files
exports.getFiles = (req, res) => {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Filter out files that no longer exist
    const existingFiles = (user.files || []).filter(file => {
      const filePath = path.join(convertedDir, file.convertedName);
      return fs.existsSync(filePath);
    });

    // Update user's file list if some were removed
    if (existingFiles.length !== (user.files || []).length) {
      const userIndex = users.findIndex(u => u.id === req.user.id);
      users[userIndex].files = existingFiles;
      writeUsers(users);
    }

    res.json({
      files: existingFiles.map(file => ({
        ...file,
        downloadUrl: `/api/files/download/${file.convertedName}`
      }))
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Download converted file
exports.downloadFile = (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(convertedDir, filename);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(convertedDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify user owns this file
    const users = readUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userFile = (user.files || []).find(f => f.convertedName === filename);

    if (!userFile) {
      return res.status(403).json({ error: 'You do not have permission to download this file' });
    }

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      }
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a converted file
exports.deleteFile = (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(convertedDir, filename);

    // Verify user owns this file
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fileIndex = (users[userIndex].files || []).findIndex(f => f.convertedName === filename);

    if (fileIndex === -1) {
      return res.status(403).json({ error: 'File not found or access denied' });
    }

    // Delete physical file
    if (fs.existsSync(filePath)) {
      deleteFile(filePath);
    }

    // Remove from user's file list
    users[userIndex].files.splice(fileIndex, 1);
    writeUsers(users);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
