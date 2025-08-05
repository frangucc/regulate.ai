import { proxyActivities } from '@temporalio/workflow';

// Proxy activities with timeout settings
const activities = proxyActivities({
  startToCloseTimeout: '1 minute',
});

/**
 * Label Validation Workflow
 * Orchestrates the entire label validation process
 */
export async function labelValidationWorkflow(labelData) {
  console.log('🏭 Starting label validation workflow for:', labelData.filename);
  
  try {
    // Step 1: Image Preprocessing
    console.log('🔧 Step 1: Image Preprocessing...');
    const preprocessedData = await activities.preprocessImageForOCR(labelData);
    
    // Step 2: OCR Processing
    console.log('📖 Step 2: OCR Processing...');
    const ocrResult = await activities.performOCR(preprocessedData);
    
    // Step 3: OCR Quality Assessment
    console.log('🔍 Step 3: OCR Quality Assessment...');
    const qualityAssessment = await activities.assessOCRQuality(ocrResult);
    
    // Step 4: AI Validation
    console.log('🤖 Step 4: AI Validation...');
    const validationResult = await activities.performAIValidation({
      ocrText: ocrResult.text,
      ocrQuality: qualityAssessment,
      imageUrl: labelData.imageUrl,
      labelType: labelData.type,
      detectedSections: ocrResult.detectedSections
    });
    
    // Step 5: Compliance Check
    console.log('✅ Step 5: Compliance Check...');
    const complianceResult = await activities.performComplianceCheck({
      validationResult,
      regulations: labelData.regulations
    });
    
    // Return final result
    const finalResult = {
      workflowId: labelData.workflowId,
      filename: labelData.filename,
      status: complianceResult.compliant ? 'APPROVED' : 'REQUIRES_REVIEW',
      ocrResult,
      qualityAssessment,
      validationResult,
      complianceResult,
      processingSteps: {
        preprocessing: preprocessedData.preprocessed,
        ocrCompleted: !!ocrResult.text,
        qualityAssessed: !!qualityAssessment.overall,
        aiValidated: !!validationResult.isValid,
        complianceChecked: !!complianceResult.compliant
      },
      completedAt: new Date().toISOString()
    };
    
    console.log('🎉 Label validation workflow completed:', finalResult.status);
    return finalResult;
    
  } catch (error) {
    console.error('❌ Label validation workflow failed:', error);
    throw error;
  }
}
