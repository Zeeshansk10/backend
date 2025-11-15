const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const libre = require('libreoffice-convert');
const { PDFDocument, rgb } = require('pdf-lib');

const libreConvert = promisify(libre.convert);

// Convert image to PDF
async function convertImageToPDF(inputPath, outputPath) {
  try {
    const imageBytes = fs.readFileSync(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    
    const pdfDoc = await PDFDocument.create();
    
    let image;
    if (ext === '.png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      image = await pdfDoc.embedJpg(imageBytes);
    } else {
      // For other formats (gif, bmp), we'll use jpg embedding as fallback
      // In production, you might want to use a library like sharp to convert first
      throw new Error(`Image format ${ext} requires conversion. Please use JPG or PNG.`);
    }
    
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    return true;
  } catch (error) {
    console.error('Image to PDF conversion error:', error);
    throw error;
  }
}

// Convert text to PDF
async function convertTextToPDF(inputPath, outputPath) {
  try {
    const textContent = fs.readFileSync(inputPath, 'utf8');
    const pdfDoc = await PDFDocument.create();
    
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { height } = page.getSize();
    const fontSize = 12;
    const lineHeight = fontSize + 2;
    const margin = 50;
    const maxWidth = 495; // 595 - 2*margin
    
    const lines = textContent.split('\n');
    let yPosition = height - margin;
    
    for (const line of lines) {
      if (yPosition < margin) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = newPage.getSize().height - margin;
      }
      
      // Simple text wrapping
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = testLine.length * (fontSize * 0.5); // Rough estimate
        
        if (testWidth > maxWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
          });
          yPosition -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
        });
        yPosition -= lineHeight;
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    return true;
  } catch (error) {
    console.error('Text to PDF conversion error:', error);
    throw error;
  }
}

// Convert Office documents (Word, Excel, PowerPoint) to PDF using LibreOffice
async function convertOfficeToPDF(inputPath, outputPath) {
  try {
    const inputBuffer = fs.readFileSync(inputPath);
    const outputBuffer = await libreConvert(inputBuffer, '.pdf', undefined);
    fs.writeFileSync(outputPath, outputBuffer);
    return true;
  } catch (error) {
    console.error('Office to PDF conversion error:', error);
    throw new Error('LibreOffice conversion failed. Make sure LibreOffice is installed and accessible.');
  }
}

// Copy PDF file (if already PDF)
async function copyPDF(inputPath, outputPath) {
  try {
    fs.copyFileSync(inputPath, outputPath);
    return true;
  } catch (error) {
    console.error('PDF copy error:', error);
    throw error;
  }
}

// Main conversion function
async function convertFile(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  
  try {
    // Image files
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
      return await convertImageToPDF(inputPath, outputPath);
    }
    
    // Text files
    if (ext === '.txt') {
      return await convertTextToPDF(inputPath, outputPath);
    }
    
    // Office documents (Word, Excel, PowerPoint)
    if (['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].includes(ext)) {
      return await convertOfficeToPDF(inputPath, outputPath);
    }
    
    // Already PDF
    if (ext === '.pdf') {
      return await copyPDF(inputPath, outputPath);
    }
    
    throw new Error(`Unsupported file type: ${ext}`);
  } catch (error) {
    console.error('Conversion error:', error);
    throw error;
  }
}

module.exports = {
  convertFile,
  convertImageToPDF,
  convertTextToPDF,
  convertOfficeToPDF,
  copyPDF
};
