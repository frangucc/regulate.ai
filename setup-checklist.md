# 🚀 reg.ulate.ai Setup Checklist

## 🎯 Goal
Set up all environment variables, libraries, and services systematically, then build a status page to verify everything is working before core development begins.

---

## 📋 Phase 1: Environment Variables & API Keys

### Authentication & Security
- [ ] **Anthropic API Key** (`ANTHROPIC_API_KEY`) - **Primary for regulatory validation**
  - Sign up at https://console.anthropic.com/
  - Generate API key
  - Set usage limits
- [ ] **OpenAI API Key** (`OPENAI_API_KEY`) - **Optional for user-facing features**
  - Sign up at https://platform.openai.com/
  - Generate API key
  - Set billing limits
- [ ] **Auth.js Secret** (`AUTH_SECRET`)
  - Generate: `openssl rand -base64 32`
- [ ] **Auth.js URL** (`AUTH_URL`)
  - Set to your domain (e.g., `https://regulate-ai.railway.app`)

### Database
- [ ] **Neon Database** (`DATABASE_URL`)
  - Sign up at https://neon.tech/
  - Create new project
  - Copy connection string
- [ ] **Direct Database URL** (`DIRECT_URL`)
  - Get direct connection for Prisma migrations

### File Storage
- [ ] **AWS S3 Credentials**
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY` 
  - [ ] `AWS_REGION`
  - [ ] `S3_BUCKET_NAME`
  - Create IAM user with S3 permissions
  - Create S3 bucket with CORS policy

### Deployment
- [ ] **Railway Setup**
  - Connect GitHub repo
  - Set up environment variables in Railway dashboard

---

## 📦 Phase 2: Package Dependencies Setup

### Frontend Dependencies
- [ ] **Core React/Vite Setup**
  ```json
  {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vite": "^5.0.0"
  }
  ```
- [ ] **UI & Styling**
  ```json
  {
    "tailwindcss": "^3.4.0",
    "react-konva": "^18.2.10",
    "konva": "^9.2.0"
  }
  ```
- [ ] **GraphQL Client**
  ```json
  {
    "@apollo/client": "^3.8.0",
    "graphql": "^16.8.0"
  }
  ```
- [ ] **OCR & File Processing**
  ```json
  {
    "tesseract.js": "^5.0.0"
  }
  ```

### Backend Dependencies
- [ ] **Core Backend**
  ```json
  {
    "graphql-yoga": "^5.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
  ```
- [ ] **Database & ORM**
  ```json
  {
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0"
  }
  ```
- [ ] **Authentication**
  ```json
  {
    "@auth/core": "^0.18.0",
    "@auth/express": "^0.5.0"
  }
  ```
- [ ] **Environment & Config**
  ```json
  {
    "dotenv": "^16.3.0",
    "dotenv-safe": "^9.1.0"
  }
  ```
- [ ] **Logging**
  ```json
  {
    "pino": "^8.17.0",
    "pino-pretty": "^10.3.0"
  }
  ```
- [ ] **Job Queue**
  ```json
  {
    "pg-boss": "^9.0.0"
  }
  ```
- [ ] **Rate Limiting**
  ```json
  {
    "express-rate-limit": "^7.1.0"
  }
  ```
- [ ] **AI Integration** (Choose one approach)
  ```json
  // Option 1: MCP (Recommended for regulatory compliance)
  {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "@anthropic-ai/sdk": "^0.17.0"
  }
  
  // Option 2: Vercel AI SDK (Modern alternative)
  {
    "ai": "^3.0.0",
    "@ai-sdk/anthropic": "^0.0.0"
  }
  
  // Option 3: Direct SDK (Maximum control)
  {
    "@anthropic-ai/sdk": "^0.17.0"
  }
  ```
- [ ] **AWS SDK**
  ```json
  {
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0"
  }
  ```

### Testing & Development
- [ ] **Testing Framework**
  ```json
  {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
  ```
- [ ] **Development Tools**
  ```json
  {
    "nodemon": "^3.0.0",
    "concurrently": "^8.0.0"
  }
  ```

---

## 🏗️ Phase 3: Project Structure Setup

### Directory Structure
- [ ] **Create project structure**
  ```
  regulate.ai/
  ├── frontend/          # React/Vite app
  ├── backend/           # Node.js GraphQL API
  ├── shared/            # Shared types/utilities
  ├── prisma/            # Database schema & migrations
  ├── workers/           # Background job workers
  └── docs/              # Documentation
  ```

### Configuration Files
- [ ] **Environment Files**
  - [ ] `.env.example` with all required keys
  - [ ] `.env.local` for development
  - [ ] `dotenv-safe` config
- [ ] **Database Setup**
  - [ ] `prisma/schema.prisma`
  - [ ] Initial migration
- [ ] **Testing Config**
  - [ ] `vitest.config.ts`
  - [ ] Test setup files

---

## 🧪 Phase 4: Status Page Components

### Backend Health Checks
- [ ] **Database Connection Test**
  - Test Prisma connection to Neon
  - Query execution test
- [ ] **S3 Connection Test**
  - Upload/download test file
  - Verify permissions
- [ ] **Anthropic API Test**
  - Simple completion request with Claude
  - Token usage check
- [ ] **OpenAI API Test** (if using)
  - Simple completion request
  - Token usage check
- [ ] **PG-Boss Queue Test**
  - Create and process test job
  - Queue health status
- [ ] **Auth.js Configuration Test**
  - Session handling
  - Provider configuration

### Frontend Integration Tests
- [ ] **GraphQL API Connection**
  - Query/mutation tests
  - Error handling
- [ ] **File Upload Component**
  - Drag/drop functionality
  - S3 upload integration
- [ ] **Canvas Component**
  - Konva.js rendering
  - Interactive overlays
- [ ] **OCR Integration**
  - Tesseract.js processing
  - Text extraction demo

---

## 🎛️ Phase 5: Status Dashboard

### Status Page Features
- [ ] **Overall System Status**
  - Green/Yellow/Red indicator
  - Timestamp of last check
- [ ] **Individual Component Status**
  - Database: Connection + Query time
  - S3: Upload/Download test
  - OpenAI: API response time
  - Queue: Job processing status
  - Auth: Session validation
- [ ] **Performance Metrics**
  - API response times
  - Database query performance
  - File upload speeds
- [ ] **Error Logging**
  - Recent errors with timestamps
  - Error categorization
- [ ] **Environment Info**
  - Node.js version
  - Package versions
  - Environment variables (masked)

---

## 🔄 Phase 6: Automated Testing

### Test Coverage
- [ ] **Unit Tests**
  - API endpoints
  - Database operations
  - Utility functions
- [ ] **Integration Tests**
  - Full workflow tests
  - External API mocking
- [ ] **E2E Tests**
  - File upload → OCR → display
  - Authentication flow
- [ ] **Health Check Tests**
  - All status page components
  - Failure scenario handling

---

## 📊 Success Criteria

- [ ] All status indicators are green
- [ ] File upload → S3 → OCR workflow works
- [ ] GraphQL API responds correctly
- [ ] Authentication flow completes
- [ ] Background jobs process successfully
- [ ] Tests pass with >80% coverage
- [ ] No environment variable errors
- [ ] All external APIs respond within SLA

---

## 🚨 Troubleshooting Checklist

### Common Issues
- [ ] **CORS errors**: Check frontend/backend origins
- [ ] **Database connection**: Verify Neon URL format
- [ ] **S3 permissions**: Check IAM policy
- [ ] **OpenAI rate limits**: Monitor usage
- [ ] **Environment variables**: Use dotenv-safe validation
- [ ] **Port conflicts**: Use different ports for services

---

## 📝 Notes

- Keep all API keys in Railway environment variables, not in code
- Use Neon preview branches for testing database changes
- Set up monitoring/alerting for production deployment
- Document any manual setup steps for team onboarding
