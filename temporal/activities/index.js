/**
 * Activity functions for label validation workflow
 */

// Import OCR functions from dedicated module
import { performOCR, preprocessImageForOCR, assessOCRQuality } from './ocr.js';

// Import AI validation functions
import { performAIValidation, correctOCRText, extractStructuredInfo } from './aiValidation.js';

// Export OCR functions
export { performOCR, preprocessImageForOCR, assessOCRQuality };

// Export AI validation functions
export { performAIValidation, correctOCRText, extractStructuredInfo };

/**
 * Perform compliance check against regulations
 */
export async function performComplianceCheck(data) {
  console.log('✅ Performing compliance check');
  
  // TODO: Implement regulatory compliance logic
  // For now, return mock data
  return {
    compliant: true,
    violations: [],
    warnings: [],
    score: 95,
    checkedAt: new Date().toISOString()
  };
}
