import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize OpenAI client conditionally
let openai;
if (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
  });
}

/**
 * Parse AI response and extract JSON validation result
 */
function parseAIResponse(aiResponse, fallbackText) {
  try {
    // Try to extract JSON from code blocks first
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find JSON object in the response
    const jsonObjectMatch = aiResponse.match(/{[\s\S]*}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }
    
    // If no JSON found, try parsing entire response
    return JSON.parse(aiResponse);
    
  } catch (parseError) {
    console.warn('⚠️ Could not parse AI response as JSON:', parseError.message);
    
    return {
      isValid: false,
      confidence: 0.4,
      correctedText: fallbackText,
      extractedInformation: {},
      ocrIssuesFound: ['Could not parse AI validation response'],
      completenessScore: 4,
      complianceIssues: ['AI response parsing failed'],
      recommendations: ['Manual review recommended'],
      qualityImprovement: 'None',
      rawAiResponse: aiResponse.substring(0, 500) + '...'
    };
  }
}

/**
 * AI Validation Activity using Anthropic Claude
 * Validates and improves OCR results for regulatory compliance
 */
export async function performAIValidation(data) {
  console.log('🤖 Starting AI validation for OCR results...');
  
  try {
    const startTime = Date.now();
    
    const { ocrText, ocrQuality, imageUrl, labelType = 'product', detectedSections = {} } = data;
    
    // Create focused prompt for verbatim transcription and validation
    const prompt = `Please transcribe and validate this OCR-extracted text from a product label.

OCR-Extracted Text:
${ocrText}

TASK: Please provide verbatim transcription and analysis:

1. TRANSCRIBE the text exactly as it appears - line-by-line, preserving:
   - Line breaks and spacing
   - Capitalization and punctuation  
   - Symbols (⚠, ®, ™, etc.)
   - All text including codes, numbers, barcodes
   - Do NOT interpret or summarize - just transcribe exactly

2. IDENTIFY obvious OCR errors (garbled characters, impossible words)

3. EXTRACT key regulatory information if clearly visible

Respond ONLY in valid JSON format:
\`\`\`json
{
  "isValid": true,
  "confidence": 0.85,
  "correctedText": "Exact verbatim transcription with OCR errors fixed...",
  "extractedInformation": {
    "productName": "Product name if clearly visible",
    "brandName": "Brand if visible", 
    "ingredients": ["ingredient1", "ingredient2"],
    "warnings": "Warning text if present",
    "directions": "Usage directions if present",
    "nutritionalInfo": {
      "servingSize": "1 cup",
      "calories": "100"
    }
  },
  "ocrIssuesFound": ["Specific OCR errors identified"],
  "completenessScore": 7,
  "complianceIssues": ["Missing required information"],
  "recommendations": ["Specific suggestions"],
  "qualityImprovement": "Moderate"
}
\`\`\`

IMPORTANT: Return ONLY valid JSON - no explanation text before or after.`;

    let validationResult;
    let processingTime;
    let aiModel = 'claude-3-5-sonnet-20241022';
    
    // Try Anthropic Claude first
    try {
      console.log('🤖 Sending request to Claude...');
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const aiResponse = response.content[0].text;
      processingTime = Date.now() - startTime;
      
      validationResult = parseAIResponse(aiResponse, ocrText);
      
    } catch (claudeError) {
      console.warn('⚠️ Claude failed, trying OpenAI...', claudeError.message);
      
      // Fallback to OpenAI (if available)
      if (openai) {
        try {
          aiModel = 'gpt-4o-mini';
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4000
          });
          
          const aiResponse = response.choices[0].message.content;
          processingTime = Date.now() - startTime;
          
          validationResult = parseAIResponse(aiResponse, ocrText);
          
        } catch (openaiError) {
          console.error('❌ Both AI providers failed');
          processingTime = Date.now() - startTime;
          
          validationResult = {
            isValid: false,
            confidence: 0.3,
            correctedText: ocrText,
            extractedInformation: {},
            ocrIssuesFound: ['Both AI providers failed to process'],
            completenessScore: 3,
            complianceIssues: ['AI validation unavailable'],
            recommendations: ['Manual review required'],
            qualityImprovement: 'None',
            errors: {
              claude: claudeError.message,
              openai: openaiError.message
            }
          };
        }
      } else {
        console.warn('⚠️ OpenAI not available, using Claude error fallback');
        processingTime = Date.now() - startTime;
        
        validationResult = {
          isValid: false,
          confidence: 0.4,
          correctedText: ocrText,
          extractedInformation: {},
          ocrIssuesFound: ['Only Claude available, but failed to process'],
          completenessScore: 4,
          complianceIssues: ['AI validation partially unavailable'],
          recommendations: ['Configure OpenAI as backup or manual review'],
          qualityImprovement: 'None',
          errors: {
            claude: claudeError.message,
            openai: 'Not configured'
          }
        };
      }
    }
    
    // Add metadata
    const result = {
      ...validationResult,
      originalOcrText: ocrText,
      aiModel,
      processingTime,
      validatedAt: new Date().toISOString(),
      inputQuality: ocrQuality.overall,
      inputConfidence: ocrQuality.confidence
    };
    
    console.log(`✅ AI validation completed in ${processingTime}ms`);
    console.log(`🎯 Validation result: ${result.isValid ? 'VALID' : 'NEEDS_REVIEW'}`);
    console.log(`📊 AI confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`📈 Quality improvement: ${result.qualityImprovement}`);
    
    if (result.ocrIssuesFound && result.ocrIssuesFound.length > 0) {
      console.log(`⚠️ OCR issues found: ${result.ocrIssuesFound.length}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ AI validation failed:', error.message);
    
    return {
      isValid: false,
      confidence: 0,
      correctedText: data.ocrText,
      extractedInformation: {},
      ocrIssuesFound: [`AI validation error: ${error.message}`],
      completenessScore: 0,
      complianceIssues: ['AI validation failed - manual review required'],
      recommendations: ['Retry AI validation or perform manual review'],
      qualityImprovement: 'None',
      error: error.message,
      processingTime: 0,
      validatedAt: new Date().toISOString()
    };
  }
}

/**
 * Simplified AI text correction activity
 * Just focuses on correcting OCR errors without full regulatory analysis
 */
export async function correctOCRText(ocrText) {
  console.log('✏️ Starting simple OCR text correction...');
  
  try {
    const prompt = `Please correct the following OCR-extracted text by fixing obvious OCR errors, improving readability, and maintaining the original meaning. Keep the same structure and don't add information that wasn't there.

Original OCR text:
${ocrText}

Please provide only the corrected text without any explanation:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const correctedText = response.content[0].text.trim();
    
    console.log('✅ OCR text correction completed');
    
    return {
      originalText: ocrText,
      correctedText,
      correctedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ OCR text correction failed:', error.message);
    return {
      originalText: ocrText,
      correctedText: ocrText, // Return original if correction fails
      error: error.message,
      correctedAt: new Date().toISOString()
    };
  }
}

/**
 * Extract structured information from validated text
 */
export async function extractStructuredInfo(validatedText) {
  console.log('📋 Extracting structured information...');
  
  try {
    const prompt = `Extract structured information from this product label text. Focus on regulatory compliance elements:

Label text:
${validatedText}

Extract and return in JSON format:
\`\`\`json
{
  "productName": "Name of the product",
  "brandName": "Brand name",
  "ingredients": ["list", "of", "ingredients"],
  "activeIngredients": ["active", "ingredients"],
  "warnings": "Warning text",
  "directions": "Usage directions",
  "netWeight": "Product weight/volume",
  "nutritionalInfo": {
    "calories": "per serving",
    "other": "nutritional facts"
  },
  "regulatoryInfo": {
    "fdaDisclaimer": "FDA disclaimer if present",
    "allergens": ["list", "of", "allergens"],
    "claims": ["health", "claims"]
  }
}
\`\`\``;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const aiResponse = response.content[0].text;
    
    // Extract JSON from response
    let structuredInfo;
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        structuredInfo = JSON.parse(jsonMatch[1]);
      } else {
        structuredInfo = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      structuredInfo = { error: 'Could not parse structured information' };
    }
    
    console.log('✅ Structured information extraction completed');
    
    return {
      structuredInfo,
      extractedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Structured information extraction failed:', error.message);
    return {
      structuredInfo: { error: error.message },
      extractedAt: new Date().toISOString()
    };
  }
}
