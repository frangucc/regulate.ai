import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import fs from 'fs';
import path from 'path';

describe('OCR + AI Validation Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start server for testing
    const port = process.env.TEST_PORT || 4001;
    server = app.listen(port);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /ocr-validate', () => {
    it('should process OCR and AI validation end-to-end', async () => {
      // Create a test image file (minimal 1x1 PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post('/ocr-validate')
        .attach('file', testImageBuffer, 'test-label.png')
        .field('type', 'food-label')
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('ocrResult');
      expect(response.body).toHaveProperty('aiValidation');
      expect(response.body).toHaveProperty('processingTime');

      // Validate OCR result structure
      const { ocrResult } = response.body;
      expect(ocrResult).toHaveProperty('text');
      expect(ocrResult).toHaveProperty('confidence');
      expect(ocrResult).toHaveProperty('totalWords');
      expect(ocrResult).toHaveProperty('processingTime');

      // Validate AI validation structure
      const { aiValidation } = response.body;
      expect(aiValidation).toHaveProperty('success');
      if (aiValidation.success) {
        expect(aiValidation).toHaveProperty('confidence');
        expect(aiValidation).toHaveProperty('completeness');
        expect(aiValidation).toHaveProperty('correctedText');
        expect(aiValidation).toHaveProperty('aiProvider');
      }
    }, 30000); // 30 second timeout for AI processing

    it('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/ocr-validate')
        .field('type', 'food-label')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file');
    });

    it('should handle invalid file types', async () => {
      const textBuffer = Buffer.from('This is not an image', 'utf8');

      const response = await request(app)
        .post('/ocr-validate')
        .attach('file', textBuffer, 'test.txt')
        .field('type', 'food-label')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle large file uploads appropriately', async () => {
      // Create a large buffer (simulate large image)
      const largeBuf = Buffer.alloc(15 * 1024 * 1024); // 15MB

      const response = await request(app)
        .post('/ocr-validate')
        .attach('file', largeBuf, 'large-image.jpg')
        .field('type', 'food-label');

      // Should either process successfully or reject with appropriate error
      if (response.status === 413) {
        expect(response.body.error).toContain('too large');
      } else if (response.status === 400) {
        expect(response.body.error).toBeDefined();
      }
    });

    it('should maintain processing time within reasonable limits', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/ocr-validate')
        .attach('file', testImageBuffer, 'test-label.png')
        .field('type', 'food-label')
        .expect(200);

      const totalTime = Date.now() - startTime;
      
      // Processing should complete within 45 seconds
      expect(totalTime).toBeLessThan(45000);
      expect(response.body.processingTime).toBeGreaterThan(0);
    }, 50000);
  });

  describe('Health check endpoints', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    it('should check environment variables', async () => {
      const response = await request(app)
        .get('/env-check')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('variables');
      
      const { variables } = response.body;
      expect(variables).toHaveProperty('anthropicKey');
      expect(variables).toHaveProperty('databaseUrl');
    });
  });

  describe('GraphQL endpoint', () => {
    it('should handle GraphQL queries', async () => {
      const query = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('__schema');
    });

    it('should handle GraphQL errors gracefully', async () => {
      const invalidQuery = `
        query {
          nonExistentField
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: invalidQuery })
        .expect(200);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('File upload functionality', () => {
    it('should upload files to S3 successfully', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post('/upload')
        .attach('file', testImageBuffer, 'test-upload.png')
        .field('type', 'test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body).toHaveProperty('s3Url');
      expect(response.body).toHaveProperty('fileName', 'test-upload.png');
    });

    it('should validate file types on upload', async () => {
      const textBuffer = Buffer.from('Not an image', 'utf8');

      const response = await request(app)
        .post('/upload')
        .attach('file', textBuffer, 'test.txt')
        .field('type', 'test')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file type');
    });
  });

  describe('Database connectivity', () => {
    it('should connect to database successfully', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.services.database.status).toBe('OK');
    });
  });

  describe('Error handling', () => {
    it('should handle 404 routes gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/ocr-validate')
        .send('invalid json data')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
