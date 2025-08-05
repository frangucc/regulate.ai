#!/usr/bin/env node

import { performOCR, assessOCRQuality } from './activities/ocr.js';

/**
 * Test OCR functionality with more realistic regulatory content
 */
async function testRealisticOCR() {
  console.log('🏷️  reg.ulate.ai - Realistic OCR Test');
  console.log('====================================');
  
  try {
    // Test with a nutrition label or ingredient list (using a different test image)
    const testData = {
      filename: 'nutrition-facts-label.jpg',
      // Using a public nutrition facts image for testing
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Nutrition_Facts.svg/256px-Nutrition_Facts.svg.png',
      type: 'nutrition-label'
    };
    
    console.log('📖 Testing OCR with realistic label...');
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
        console.log(`📋 ${section.toUpperCase()}: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`);
      }
    } else {
      console.log('\\n📄 No specific regulatory sections detected');
      console.log('   (This is normal for nutrition facts format)');
    }
    
    // Show sample words with confidence for detailed analysis
    if (ocrResult.words.length > 0) {
      console.log('\\n📝 Sample Words with Confidence:');
      console.log('================================');
      const sampleWords = ocrResult.words.slice(0, 10);
      sampleWords.forEach(word => {
        const confidence = Math.round(word.confidence);
        const indicator = confidence > 80 ? '✅' : confidence > 60 ? '⚠️' : '❌';
        console.log(`${indicator} "${word.text}" (${confidence}%)`);
      });
    }
    
    console.log('\\n🎉 Realistic OCR test completed!');
    console.log('Ready for integration with Temporal workflows.');
    
  } catch (error) {
    console.error('💥 Realistic OCR test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRealisticOCR().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
