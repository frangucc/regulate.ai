import { Connection } from '@temporalio/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create Temporal Cloud connection
 */
export async function createConnection() {
  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS,
      tls: {
        // For Temporal Cloud, we need TLS
        serverNameOverride: 'us-east-2.aws.api.temporal.io',
      },
      apiKey: process.env.TEMPORAL_API_KEY,
    });
    
    console.log('✅ Connected to Temporal Cloud');
    return connection;
  } catch (error) {
    console.error('❌ Failed to connect to Temporal:', error);
    throw error;
  }
}
