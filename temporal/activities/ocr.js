import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * OCR processing activity using Tesseract.js
 * Extracts text from label images for regulatory compliance analysis
 */
export async function performOCR(labelData) {
  console.log('📖 Starting OCR processing for:', labelData.filename);
  
  try {
    const startTime = Date.now();
    
    // Configure Tesseract for optimal text extraction
    const ocrConfig = {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`📖 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      // Optimize for regulatory text (clean, structured labels)
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      // Improve accuracy for regulatory text
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:%-()[]{}/"\'\\n\\t ',
    };
    
    let imageSource;
    
    // Handle different input types
    if (labelData.imageUrl) {
      // If it's a URL (S3 or external)
      imageSource = labelData.imageUrl;
      console.log('📖 Processing image from URL:', labelData.imageUrl);
    } else if (labelData.imagePath) {
      // If it's a local file path
      imageSource = labelData.imagePath;
      console.log('📖 Processing local image file:', labelData.imagePath);
    } else if (labelData.imageBuffer) {
      // If it's a buffer (from upload)
      imageSource = labelData.imageBuffer;
      console.log('📖 Processing image from buffer');
    } else {
      throw new Error('No valid image source provided (imageUrl, imagePath, or imageBuffer)');
    }
    
    // Perform OCR
    console.log('📖 Running Tesseract OCR...');
    const { data } = await Tesseract.recognize(imageSource, 'eng', ocrConfig);
    
    const processingTime = Date.now() - startTime;
    
    // Extract additional metadata
    const result = {
      // Raw text extraction
      text: data.text.trim(),
      
      // Confidence metrics
      confidence: data.confidence / 100, // Convert to 0-1 scale
      meanConfidence: data.confidence,
      
      // Word-level details for quality assessment
      words: (data.words || []).map(word => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox
      })),
      
      // Processing metadata
      processingTime,
      filename: labelData.filename,
      imageSource: labelData.imageUrl || labelData.imagePath || 'buffer',
      
      // Structured text analysis
      lines: (data.lines || []).map(line => line.text.trim()).filter(line => line.length > 0),
      totalWords: (data.words || []).length,
      
      // Quality indicators
      lowConfidenceWords: (data.words || []).filter(word => word.confidence < 60).length,
      averageWordConfidence: (data.words || []).length > 0 ? 
        (data.words || []).reduce((sum, word) => sum + word.confidence, 0) / (data.words || []).length : 0,
      
      // Timestamps
      extractedAt: new Date().toISOString(),
      
      // Additional label-specific parsing
      detectedSections: parseRegulatoryStructure(data.text)
    };
    
    // Log OCR results
    console.log(`✅ OCR completed in ${processingTime}ms`);
    console.log(`📊 Text confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`📝 Extracted ${result.totalWords} words, ${result.lines.length} lines`);
    console.log(`⚠️  Low confidence words: ${result.lowConfidenceWords}`);
    
    // Preview extracted text (first 200 chars)
    const preview = result.text.length > 200 ? result.text.substring(0, 200) + '...' : result.text;
    console.log('📖 Extracted text preview:', preview);
    
    return result;
    
  } catch (error) {
    console.error('❌ OCR processing failed:', error.message);
    
    return {
      success: false,
      error: error.message,
      filename: labelData.filename,
      processingTime: Date.now() - (labelData.startTime || Date.now()),
      extractedAt: new Date().toISOString()
    };
  }
}

/**
 * Parse regulatory structure from OCR text
 * Identifies common regulatory sections like ingredients, warnings, etc.
 */
function parseRegulatoryStructure(text) {
  const sections = {};
  const lowerText = text.toLowerCase();
  
  // Common regulatory patterns
  const patterns = {
    ingredients: /ingredients?[:\s-]*(.*?)(?=\n|$|directions|warnings|caution)/si,
    directions: /directions?[:\s-]*(.*?)(?=\n|$|ingredients|warnings|caution)/si,
    warnings: /warnings?[:\s-]*(.*?)(?=\n|$|ingredients|directions)/si,
    caution: /caution[:\s-]*(.*?)(?=\n|$|ingredients|directions|warnings)/si,
    dosage: /dosage[:\s-]*(.*?)(?=\n|$|ingredients|directions|warnings)/si,
    activeIngredients: /active ingredients?[:\s-]*(.*?)(?=\n|$|inactive|directions)/si,
    inactiveIngredients: /inactive ingredients?[:\s-]*(.*?)(?=\n|$|active|directions)/si
  };
  
  // Extract sections
  for (const [section, pattern] of Object.entries(patterns)) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      sections[section] = match[1].trim();
    }
  }
  
  return sections;
}

/**
 * OCR preprocessing activity - handles image optimization before OCR
 */
export async function preprocessImageForOCR(labelData) {
  console.log('🔧 Preprocessing image for OCR:', labelData.filename);
  
  try {
    // For now, return the original data
    // TODO: Add image preprocessing (contrast, noise reduction, etc.)
    return {
      ...labelData,
      preprocessed: true,
      preprocessedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Image preprocessing failed:', error.message);
    throw error;
  }
}

/**
 * OCR quality assessment activity
 */
export async function assessOCRQuality(ocrResult) {
  console.log('🔍 Assessing OCR quality...');
  
  try {
    const assessment = {
      overall: 'good', // good, fair, poor
      confidence: ocrResult.confidence,
      issues: [],
      recommendations: []
    };
    
    // Quality checks
    if (ocrResult.confidence < 0.7) {
      assessment.overall = 'poor';
      assessment.issues.push('Low overall confidence');
      assessment.recommendations.push('Consider image preprocessing or manual review');
    } else if (ocrResult.confidence < 0.85) {
      assessment.overall = 'fair';
      assessment.issues.push('Moderate confidence');
      assessment.recommendations.push('Verify critical sections manually');
    }
    
    if (ocrResult.lowConfidenceWords > ocrResult.totalWords * 0.2) {
      assessment.issues.push('High number of low confidence words');
      assessment.recommendations.push('Review text for accuracy');
    }
    
    if (ocrResult.text.length < 50) {
      assessment.issues.push('Very short text extracted');
      assessment.recommendations.push('Check if image contains readable text');
    }
    
    console.log(`✅ OCR quality assessment: ${assessment.overall} (${Math.round(assessment.confidence * 100)}%)`);
    
    return {
      ...assessment,
      assessedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ OCR quality assessment failed:', error.message);
    throw error;
  }
}
