import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to regular .env

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TEST_PORT = '4001';

beforeAll(() => {
  console.log('🧪 Setting up test environment...');
});

afterAll(() => {
  console.log('✅ Test environment cleanup complete');
});
