import { Client, Connection } from '@temporalio/client';
import { labelValidationWorkflow } from '../workflows/labelValidation.js';

let client;

/**
 * Initialize Temporal client
 */
async function getTemporalClient() {
  if (!client) {
    try {
      const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'us-east-2.aws.api.temporal.io:7233',
        tls: true,
        apiKey: process.env.TEMPORAL_API_KEY,
      });

      client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'quickstart-regulate.sgw25',
      });

      console.log('✅ Temporal client connected');
    } catch (error) {
      console.error('❌ Failed to connect to Temporal:', error.message);
      throw error;
    }
  }
  return client;
}

/**
 * Run OCR + AI validation workflow
 */
export async function runOCRValidationWorkflow(imageData) {
  console.log('🚀 Starting OCR + AI validation workflow...');
  
  try {
    const temporalClient = await getTemporalClient();
    
    // Create unique workflow ID
    const workflowId = `ocr-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare workflow input
    const workflowInput = {
      workflowId,
      filename: imageData.filename || 'uploaded-image',
      imageBuffer: imageData.buffer,
      imageUrl: imageData.url,
      type: imageData.type || 'product-label',
      regulations: imageData.regulations || ['FDA', 'general'],
      startedAt: new Date().toISOString()
    };
    
    console.log(`🔄 Starting workflow: ${workflowId}`);
    
    // Start the workflow
    const handle = await temporalClient.workflow.start(labelValidationWorkflow, {
      args: [workflowInput],
      taskQueue: 'label-validation',
      workflowId,
      workflowRunTimeout: '5 minutes',
    });
    
    console.log(`⏳ Workflow started, waiting for result...`);
    
    // Wait for completion
    const result = await handle.result();
    
    console.log(`✅ Workflow completed: ${result.status}`);
    
    return {
      success: true,
      workflowId,
      result
    };
    
  } catch (error) {
    console.error('❌ OCR validation workflow failed:', error.message);
    
    return {
      success: false,
      error: error.message,
      workflowId: null,
      result: null
    };
  }
}

/**
 * Simple OCR processing without full workflow (for testing)
 */
export async function runSimpleOCR(imageData) {
  console.log('📖 Running simple OCR processing...');
  
  try {
    // For testing, we'll use the local OCR function directly
    const { performOCR } = await import('../activities/ocr.js');
    
    const ocrResult = await performOCR({
      filename: imageData.filename || 'test-image',
      imageBuffer: imageData.buffer,
      imageUrl: imageData.url
    });
    
    return {
      success: true,
      ocrResult
    };
    
  } catch (error) {
    console.error('❌ Simple OCR failed:', error.message);
    
    return {
      success: false,
      error: error.message,
      ocrResult: null
    };
  }
}

/**
 * Simple AI validation without workflow
 */
export async function runSimpleAIValidation(ocrResult) {
  console.log('🤖 Running simple AI validation...');
  
  try {
    const { performAIValidation } = await import('../activities/aiValidation.js');
    
    const validationResult = await performAIValidation({
      ocrText: ocrResult.text,
      ocrQuality: {
        overall: ocrResult.confidence > 0.8 ? 'good' : ocrResult.confidence > 0.6 ? 'fair' : 'poor',
        confidence: ocrResult.confidence,
        issues: []
      },
      detectedSections: ocrResult.detectedSections || {}
    });
    
    return {
      success: true,
      validationResult
    };
    
  } catch (error) {
    console.error('❌ Simple AI validation failed:', error.message);
    
    return {
      success: false,
      error: error.message,
      validationResult: null
    };
  }
}

/**
 * Get workflow status
 */
export async function getWorkflowStatus(workflowId) {
  try {
    const temporalClient = await getTemporalClient();
    const handle = temporalClient.workflow.getHandle(workflowId);
    
    const status = await handle.describe();
    
    return {
      workflowId,
      status: status.status.name,
      runId: status.runId,
      startTime: status.startTime,
      executionTime: status.executionTime,
    };
    
  } catch (error) {
    console.error('❌ Failed to get workflow status:', error.message);
    return {
      workflowId,
      status: 'UNKNOWN',
      error: error.message
    };
  }
}
