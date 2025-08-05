import 'dotenv/config';
import { Worker } from '@temporalio/worker';
import { Connection } from '@temporalio/client';
import * as activities from './activities/index.js';

/**
 * Temporal Worker - Registers workflows and activities with Temporal Cloud
 * This will make workflows visible in cloud.temporal.io dashboard
 */
async function run() {
  try {
    console.log('🚀 Starting Temporal Worker...');
    
    const address = process.env.TEMPORAL_ADDRESS || 'us-east-2.aws.api.temporal.io:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE || 'quickstart-regulate.sgw25';
    const apiKey = process.env.TEMPORAL_API_KEY;
    
    console.log('🌍 Connecting to:', address);
    console.log('🏢 Namespace:', namespace);
    console.log('🔑 API Key:', apiKey ? 'Configured' : 'Missing');
    
    if (!apiKey) {
      throw new Error('TEMPORAL_API_KEY environment variable is required');
    }
    
    // Create connection to Temporal Cloud
    const connection = await Connection.connect({
      address,
      tls: true,
      apiKey,
    });
    
    console.log('✅ Connected to Temporal Cloud');
    
    // Create and run the Worker
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue: 'label-validation',
      workflowsPath: new URL('./workflows/index.js', import.meta.url).pathname,
      activities,
      enableLogsInReplay: true,
    });

    console.log('✅ Temporal Worker registered and running...');
    console.log('📊 Check cloud.temporal.io to see registered workflows');
    
    await worker.run();
    
  } catch (error) {
    console.error('❌ Worker failed to start:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Unhandled worker error:', err);
  process.exit(1);
});
