import { createYoga } from 'graphql-yoga'
import { createServer } from 'http'
import cors from 'cors'
import express from 'express'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import Anthropic from '@anthropic-ai/sdk'
import pino from 'pino'
import { makeExecutableSchema } from '@graphql-tools/schema'
import multer from 'multer'

// Load environment variables
dotenv.config({ path: '../.env' })

// Log startup info
console.log('🚀 Starting reg.ulate.ai backend server v1.0.0...')

// Initialize services
const prisma = new PrismaClient()
const logger = pino({ 
  transport: { target: 'pino-pretty' }
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// GraphQL Schema
const typeDefs = /* GraphQL */ `
  type Query {
    health: HealthStatus!
    systemStatus: SystemStatus!
    systemTestRuns(limit: Int = 50): [SystemTestRun!]!
  }

  type Mutation {
    saveTestRun(input: SaveTestRunInput!): SystemTestRun!
  }

  type HealthStatus {
    status: String!
    timestamp: String!
    version: String!
  }

  type SystemStatus {
    database: ServiceStatus!
    s3: ServiceStatus!
    anthropic: ServiceStatus!
    overall: String!
  }

  type ServiceStatus {
    status: String!
    responseTime: Int
    error: String
  }

  type SystemTestRun {
    id: ID!
    status: String!
    overallHealth: String!
    systemStatus: String!
    environmentStatus: String!
    databaseStatus: String!
    apiStatus: String!
    frontendStatus: String!
    integrationStatus: String!
    databaseTime: Int
    s3Time: Int
    anthropicTime: Int
    totalTestTime: Int
    failedComponents: [String!]
    errorMessages: String
    culprits: [String!]
    performanceGrade: String
    triggeredBy: String!
    environment: String!
    createdAt: String!
  }

  input SaveTestRunInput {
    status: String!
    overallHealth: String!
    systemStatus: String!
    environmentStatus: String!
    databaseStatus: String!
    apiStatus: String!
    frontendStatus: String!
    integrationStatus: String!
    dbHealth: String
    s3Health: String
    anthropicHealth: String
    databaseTime: Int
    s3Time: Int
    anthropicTime: Int
    totalTestTime: Int
    failedComponents: [String!]
    errorMessages: String
    culprits: [String!]
    performanceGrade: String
    triggeredBy: String!
    browserInfo: String
  }
`

// Resolvers
const resolvers = {
  Query: {
    health: () => ({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }),
    
    systemStatus: async () => {
      const results = {
        database: await testDatabase(),
        s3: await testS3(),
        anthropic: await testAnthropic(),
      }
      
      const allHealthy = Object.values(results).every(r => r.status === 'OK')
      
      return {
        ...results,
        overall: allHealthy ? 'HEALTHY' : 'DEGRADED'
      }
    },

    systemTestRuns: async (_, { limit }) => {
      const runs = await prisma.systemTestRun.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
      
      return runs.map(run => ({
        ...run,
        failedComponents: run.failedComponents || [],
        culprits: run.culprits || [],
        errorMessages: run.errorMessages ? JSON.stringify(run.errorMessages) : null,
        createdAt: run.createdAt.toISOString()
      }))
    }
  },

  Mutation: {
    saveTestRun: async (_, { input }) => {
      const testRun = await prisma.systemTestRun.create({
        data: {
          ...input,
          failedComponents: input.failedComponents || [],
          errorMessages: input.errorMessages ? JSON.parse(input.errorMessages) : null,
          culprits: input.culprits || []
        }
      })
      
      return {
        ...testRun,
        failedComponents: testRun.failedComponents || [],
        culprits: testRun.culprits || [],
        errorMessages: testRun.errorMessages ? JSON.stringify(testRun.errorMessages) : null,
        createdAt: testRun.createdAt.toISOString()
      }
    }
  }
}

// Health check functions
async function testDatabase() {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'OK',
      responseTime: Date.now() - start,
      error: null
    }
  } catch (error) {
    logger.error('Database health check failed:', error)
    return {
      status: 'ERROR',
      responseTime: Date.now() - start,
      error: error.message
    }
  }
}

async function testS3() {
  const start = Date.now()
  try {
    const testKey = `health-check-${Date.now()}.txt`
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: testKey,
      Body: 'Health check test',
      ContentType: 'text/plain'
    })
    
    await s3Client.send(command)
    return {
      status: 'OK',
      responseTime: Date.now() - start,
      error: null
    }
  } catch (error) {
    logger.error('S3 health check failed:', error)
    return {
      status: 'ERROR',
      responseTime: Date.now() - start,
      error: error.message
    }
  }
}

async function testAnthropic() {
  const start = Date.now()
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say OK' }],
    })
    
    return {
      status: 'OK',
      responseTime: Date.now() - start,
      error: null
    }
  } catch (error) {
    logger.error('Anthropic health check failed:', error)
    return {
      status: 'ERROR',
      responseTime: Date.now() - start,
      error: error.message
    }
  }
}

// Create GraphQL schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

// Create GraphQL server
const yoga = createYoga({
  schema,
  cors: {
    origin: ['http://localhost:9000', 'http://localhost:4000'],
    credentials: true
  }
})

// Create Express app
const app = express()
app.use(cors())
app.use(express.json())

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false)
    }
  }
})

// Schema endpoint - serves the current Prisma schema
app.get('/schema', async (req, res) => {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const schemaPath = path.join(__dirname, '../prisma/schema.prisma')
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    res.json({
      status: 'OK',
      schema: schemaContent,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Schema endpoint error:', error)
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const { file } = req
    const { type = 'label' } = req.body
    
    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    const s3Key = `${type}s/${timestamp}_${sanitizedName}`
    
    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        type: type
      }
    })
    
    await s3Client.send(uploadCommand)
    
    // Generate S3 URL
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`
    
    logger.info(`File uploaded successfully: ${s3Key}`)
    
    res.json({
      success: true,
      fileName: file.originalname,
      fileSize: file.size,
      contentType: file.mimetype,
      s3Key: s3Key,
      s3Url: s3Url,
      uploadedAt: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Upload error:', error)
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
    }
    
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    })
  }
})

// OCR + AI Validation endpoint
app.post('/ocr-validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const { file } = req
    
    logger.info(`Starting OCR + AI validation for: ${file.originalname}`)
    
    // Import OCR client functions
    const { runSimpleOCR, runSimpleAIValidation } = await import('../../temporal/clients/ocrClient.js')
    
    // Step 1: Run OCR
    const ocrResponse = await runSimpleOCR({
      filename: file.originalname,
      buffer: file.buffer
    })
    
    if (!ocrResponse.success) {
      return res.status(500).json({
        error: 'OCR processing failed',
        details: ocrResponse.error
      })
    }
    
    const ocrResult = ocrResponse.ocrResult
    
    // Step 2: Run AI Validation (if OCR succeeded)
    let aiValidation = null
    if (ocrResult.text && ocrResult.text.trim().length > 0) {
      const aiResponse = await runSimpleAIValidation(ocrResult)
      
      if (aiResponse.success) {
        aiValidation = aiResponse.validationResult
      } else {
        logger.warn('AI validation failed:', aiResponse.error)
      }
    }
    
    // Prepare response
    const response = {
      success: true,
      filename: file.originalname,
      fileSize: file.size,
      contentType: file.mimetype,
      processedAt: new Date().toISOString(),
      
      // OCR Results
      ocr: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        totalWords: ocrResult.totalWords,
        lines: ocrResult.lines,
        detectedSections: ocrResult.detectedSections,
        qualityAssessment: {
          overall: ocrResult.confidence > 0.8 ? 'good' : ocrResult.confidence > 0.6 ? 'fair' : 'poor',
          issues: [],
          recommendations: []
        }
      },
      
      // AI Validation Results
      aiValidation: aiValidation ? {
        isValid: aiValidation.isValid,
        confidence: aiValidation.confidence,
        correctedText: aiValidation.correctedText,
        extractedInformation: aiValidation.extractedInformation,
        ocrIssuesFound: aiValidation.ocrIssuesFound,
        completenessScore: aiValidation.completenessScore,
        complianceIssues: aiValidation.complianceIssues,
        recommendations: aiValidation.recommendations,
        qualityImprovement: aiValidation.qualityImprovement,
        processingTime: aiValidation.processingTime
      } : {
        error: 'AI validation not performed - no text extracted',
        isValid: false
      }
    }
    
    logger.info(`OCR + AI validation completed successfully for: ${file.originalname}`)
    
    res.json(response)
    
  } catch (error) {
    logger.error('OCR + AI validation error:', error)
    
    res.status(500).json({
      error: 'OCR + AI validation failed',
      details: error.message
    })
  }
})

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Environment variables check endpoint
app.get('/env-check', (req, res) => {
  const requiredVars = {
    anthropicKey: !!process.env.ANTHROPIC_API_KEY,
    databaseUrl: !!process.env.DATABASE_URL,
    directUrl: !!process.env.DIRECT_URL,
    awsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: !!process.env.AWS_REGION,
    authSecret: !!process.env.AUTH_SECRET,
    authUrl: !!process.env.AUTH_URL,
    s3Bucket: !!process.env.S3_BUCKET_NAME,
    temporalApiKey: !!process.env.TEMPORAL_API_KEY,
    temporalNamespace: !!process.env.TEMPORAL_NAMESPACE,
    temporalAddress: !!process.env.TEMPORAL_ADDRESS
  }
  
  const allPresent = Object.values(requiredVars).every(present => present)
  
  res.json({
    status: allPresent ? 'OK' : 'MISSING_VARS',
    variables: requiredVars,
    timestamp: new Date().toISOString()
  })
})

// GraphQL endpoint
app.use('/graphql', yoga)

// Start server
const PORT = process.env.PORT || 4000
const server = createServer(app)

server.listen(PORT, () => {
  logger.info(`🚀 Server ready at http://localhost:${PORT}`)
  logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`)
  logger.info(`❤️ Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...')
  await prisma.$disconnect()
  server.close()
  process.exit(0)
})
