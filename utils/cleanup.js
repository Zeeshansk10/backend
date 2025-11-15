const fs = require('fs');
const path = require('path');

// Clean up old files
function cleanupOldFiles(retentionMinutes = 30) {
  const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
  const convertedDir = path.join(__dirname, '..', process.env.CONVERTED_DIR || 'converted');
  
  const directories = [uploadDir, convertedDir];
  const now = Date.now();
  const retentionMs = retentionMinutes * 60 * 1000;
  
  let deletedCount = 0;
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > retentionMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old file: ${file}`);
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error.message);
      }
    });
  });
  
  if (deletedCount > 0) {
    console.log(`✅ Cleanup complete: ${deletedCount} files deleted`);
  } else {
    console.log('✅ Cleanup complete: No old files to delete');
  }
  
  return deletedCount;
}

// Delete specific file
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
    return false;
  }
}

module.exports = {
  cleanupOldFiles,
  deleteFile
};
