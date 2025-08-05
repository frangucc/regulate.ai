import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock functions
const mockAnthropicCreate = vi.fn();
const mockOpenAICreate = vi.fn();

// Mock the SDK modules before importing
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate
      }
    }))
  };
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    }))
  };
});

// Import the module after setting up mocks
import { performAIValidation, correctOCRText, extractStructuredInfo } from '../aiValidation.js';

describe('AI Validation Activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performAIValidation', () => {
    const mockOCRData = {
      text: 'NUTRITION FACTS\nServing Size 1 cup\nCalories 150',
      confidence: 0.85,
      totalWords: 7,
      lowConfidenceWords: 1
    };

    it('should successfully validate with Anthropic', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            confidence: 0.92,
            completeness: 0.88,
            correctedText: 'NUTRITION FACTS\nServing Size 1 cup\nCalories 150',
            structuredData: {
              nutritionFacts: {
                servingSize: '1 cup',
                calories: 150
              }
            },
            complianceIssues: [],
            recommendations: ['Consider higher resolution scan']
          })
        }]
      };

      mockAnthropicCreate.mockResolvedValue(mockResponse);

      const result = await performAIValidation(mockOCRData);

      expect(result.success).toBe(true);
      expect(result.aiProvider).toBe('anthropic');
      expect(result.confidence).toBe(0.92);
      expect(result.completeness).toBe(0.88);
      expect(result.correctedText).toContain('NUTRITION FACTS');
      expect(result.structuredData.nutritionFacts.calories).toBe(150);
    });

    it('should fallback to OpenAI when Anthropic fails', async () => {
      mockAnthropicCreate.mockRejectedValue(new Error('Anthropic API error'));

      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.89,
              completeness: 0.85,
              correctedText: 'NUTRITION FACTS\nServing Size 1 cup (240ml)\nCalories 150',
              improvements: ['Used OpenAI fallback'],
              structuredData: {
                nutritionFacts: {
                  servingSize: '1 cup (240ml)',
                  calories: 150
                }
              },
              complianceIssues: [],
              recommendations: []
            })
          }
        }]
      };

      mockOpenAICreate.mockResolvedValue(mockOpenAIResponse);

      const result = await performAIValidation(mockOCRData);

      expect(result.success).toBe(true);
      expect(result.aiProvider).toBe('openai');
      expect(result.confidence).toBe(0.89);
      expect(mockAnthropicCreate).toHaveBeenCalled();
      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it('should handle invalid JSON response gracefully', async () => {
      const mockClaudeResponse = {
        content: [{
          text: 'This is not valid JSON'
        }]
      };

      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse);

      const result = await performAIValidation(mockOCRData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse AI response');
      expect(result.fallbackValidation).toBeDefined();
      expect(result.fallbackValidation.isValid).toBe(true);
      expect(result.fallbackValidation.confidence).toBe(0.7);
    });

    it('should handle missing OpenAI key gracefully', async () => {
      delete process.env.OPENAI_API_KEY;
      mockAnthropicCreate.mockRejectedValue(new Error('Anthropic failed'));

      const result = await performAIValidation(mockOCRData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Both AI providers failed');
      expect(result.fallbackValidation).toBeDefined();
    });

    it('should extract JSON from markdown code blocks', async () => {
      const mockClaudeResponse = {
        content: [{
          text: '```json\n{"isValid": true, "confidence": 0.95}\n```'
        }]
      };

      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse);

      const result = await performAIValidation(mockOCRData);

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.95);
    });

    it('should validate required response fields', async () => {
      const mockClaudeResponse = {
        content: [{
          text: JSON.stringify({
            // Missing required fields like isValid, confidence, etc.
            someOtherField: 'value'
          })
        }]
      };

      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse);

      const result = await performAIValidation(mockOCRData);

      expect(result.success).toBe(false);
      expect(result.fallbackValidation).toBeDefined();
    });
  });

  describe('correctOCRText', () => {
    it('should correct OCR text using AI validation', async () => {
      const mockValidationResult = {
        success: true,
        correctedText: 'CORRECTED NUTRITION FACTS\nServing Size 1 cup (240ml)',
        improvements: ['Fixed capitalization', 'Corrected serving size']
      };

      // Mock performAIValidation for this test
      vi.doMock('../aiValidation.js', () => ({
        performAIValidation: vi.fn().mockResolvedValue(mockValidationResult)
      }));

      const ocrData = {
        text: 'nutrition facts\nserving size 1cup 240ml',
        confidence: 0.7
      };

      const result = await correctOCRText(ocrData);

      expect(result.correctedText).toBe('CORRECTED NUTRITION FACTS\nServing Size 1 cup (240ml)');
      expect(result.improvements).toHaveLength(2);
    });
  });

  describe('extractStructuredInfo', () => {
    it('should extract structured information from validated text', async () => {
      const mockValidationResult = {
        success: true,
        structuredData: {
          nutritionFacts: {
            servingSize: '1 cup (240ml)',
            calories: 150,
            totalFat: '5g'
          },
          ingredients: ['Water', 'Sugar', 'Natural Flavors']
        }
      };

      vi.doMock('../aiValidation.js', () => ({
        performAIValidation: vi.fn().mockResolvedValue(mockValidationResult)
      }));

      const ocrData = {
        text: 'NUTRITION FACTS\nServing Size 1 cup\nCalories 150\nTotal Fat 5g\nINGREDIENTS: Water, Sugar, Natural Flavors'
      };

      const result = await extractStructuredInfo(ocrData);

      expect(result.nutritionFacts).toBeDefined();
      expect(result.nutritionFacts.calories).toBe(150);
      expect(result.ingredients).toContain('Water');
    });
  });
});
