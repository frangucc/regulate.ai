# Project Architecture — reg.ulate.ai

## Frontend
- React with Vite
- Tailwind CSS
- Canvas rendering using konva.js, react-konva

## OCR & Layout Parsing
- Tesseract.js (for OCR)
- LayoutParser

## AI Orchestration
- MCP (Model Context Protocol) - Anthropic's native protocol
- Direct Anthropic SDK integration
- Node.js runtime for validation agents

## Backend
- Node.js
- GraphQL Yoga

## Database
- Neon (PostgreSQL)
- Prisma ORM

## Authentication
- Auth.js

## File Storage
- Amazon S3 (for label images, SDS files, and attachments)

## Workflow Engine
- Temporal Cloud for distributed workflow orchestration
- Durable workflow execution for long-running validation processes
- Activity functions for OCR processing, agent validation, file parsing
- Workflow versioning and rollback capabilities
- State management for complex multi-step validation pipelines

## Microservices
- Node.js workers for validator agents, Separate Node.js Processes

## Deployment
- Railway (for both frontend and backend)

## Environment Configuration
- `.env` file using dotenv
- dotenv-safe for env validation
- Keys for Anthropic (primary), OpenAI (optional), AWS, Auth.js, Neon, S3, Temporal Cloud, and system-specific secrets
- Temporal Cloud configuration: API key, namespace (quickstart-regulate.sgw25), address (us-east-2.aws.api.temporal.io:7233)

## Logging
- Pino for structured JSON logging
- Centralized logger instance used across API and workers
- Logs piped to Railway logs or external collector

## Testing
- Vitest for unit and integration tests
- Coverage for validators, backend logic, GraphQL operations, and React components

## Rate Limiting
- express-rate-limit to throttle API usage and prevent abuse
- Applied to all public-facing endpoints

## CORS Configuration
- cors middleware configured to allow frontend domain only (e.g., https://reg.ulate.ai)
- Preflight OPTIONS requests supported

## Health Checks
- `/health` endpoint returning 200 OK with app status, timestamp, and version info
- Used for uptime and deployment monitoring

## Migrations
- Prisma Migrate for schema versioning
- Neon preview branches used for safe dev/test migrations
- Migration commands managed via scripts
