import { Client } from '@temporalio/client';
import { createConnection } from './connection.js';

/**
 * Basic Temporal client for testing connection
 */
export async function createTemporalClient() {
  try {
    // Create connection
    const connection = await createConnection();
    
    // Create client
    const client = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE,
    });
    
    console.log(`✅ Temporal client created for namespace: ${process.env.TEMPORAL_NAMESPACE}`);
    return client;
  } catch (error) {
    console.error('❌ Failed to create Temporal client:', error);
    throw error;
  }
}

/**
 * Test client connection
 */
export async function testConnection() {
  try {
    console.log('🔄 Testing Temporal connection...');
    
    const client = await createTemporalClient();
    
    // Try to list workflows (basic connectivity test)
    console.log('🔍 Testing client functionality...');
    const workflows = await client.workflow.list();
    
    console.log('✅ Temporal connection test successful!');
    console.log(`📊 Current workflows in namespace: ${workflows.length || 0}`);
    
    return {
      success: true,
      namespace: process.env.TEMPORAL_NAMESPACE,
      address: process.env.TEMPORAL_ADDRESS,
      workflowCount: workflows.length || 0
    };
    
  } catch (error) {
    console.error('❌ Temporal connection test failed:', error.message);
    return {
      success: false,
      error: error.message,
      namespace: process.env.TEMPORAL_NAMESPACE,
      address: process.env.TEMPORAL_ADDRESS
    };
  }
}
