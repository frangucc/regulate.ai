#!/usr/bin/env node

import { performOCR, assessOCRQuality } from './activities/ocr.js';
import path from 'path';

/**
 * Test OCR functionality with a sample image
 */
async function testOCR() {
  console.log('🚀 reg.ulate.ai - OCR Test');
  console.log('=========================');
  
  try {
    // Test with a sample label image URL (public domain test image)
    const testData = {
      filename: 'sample-label.jpg',
      imageUrl: 'https://tesseract.projectnaptha.com/img/eng_bw.png', // Tesseract.js demo image
      type: 'food-label'
    };
    
    console.log('📖 Testing OCR with sample image...');
    console.log('Image URL:', testData.imageUrl);
    
    // Perform OCR
    const ocrResult = await performOCR(testData);
    
    if (ocrResult.success === false) {
      console.log('❌ OCR processing failed:', ocrResult.error);
      return;
    }
    
    // Display results
    console.log('\\n✅ OCR Results:');
    console.log('================');
    console.log(`📊 Confidence: ${Math.round(ocrResult.confidence * 100)}%`);
    console.log(`⏱️  Processing time: ${ocrResult.processingTime}ms`);
    console.log(`📝 Total words: ${ocrResult.totalWords}`);
    console.log(`📄 Lines: ${ocrResult.lines.length}`);
    console.log(`⚠️  Low confidence words: ${ocrResult.lowConfidenceWords}`);
    
    console.log('\\n📖 Extracted Text:');
    console.log('==================');
    console.log(ocrResult.text);
    
    // Test quality assessment
    console.log('\\n🔍 Testing quality assessment...');
    const qualityAssessment = await assessOCRQuality(ocrResult);
    
    console.log('\\n✅ Quality Assessment:');
    console.log('======================');
    console.log(`📊 Overall: ${qualityAssessment.overall}`);
    console.log(`🎯 Confidence: ${Math.round(qualityAssessment.confidence * 100)}%`);
    
    if (qualityAssessment.issues.length > 0) {
      console.log('\\n⚠️  Issues:');
      qualityAssessment.issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    if (qualityAssessment.recommendations.length > 0) {
      console.log('\\n💡 Recommendations:');
      qualityAssessment.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    // Show detected sections if any
    if (Object.keys(ocrResult.detectedSections).length > 0) {
      console.log('\\n🏷️  Detected Regulatory Sections:');
      console.log('=================================');
      for (const [section, content] of Object.entries(ocrResult.detectedSections)) {
        console.log(`${section}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      }
    }
    
    console.log('\\n🎉 OCR test completed successfully!');
    
  } catch (error) {
    console.error('💥 OCR test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOCR().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
