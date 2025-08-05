import { describe, it, expect } from 'vitest';

// Test utility functions that don't require external dependencies
describe('Validation Utilities', () => {
  describe('JSON Parsing Functions', () => {
    const extractJSONFromText = (text) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        return null;
      }
    };

    it('should extract JSON from markdown text', () => {
      const markdownText = `Here is the extracted data:
      \`\`\`json
      {"ingredients": ["water", "sugar"], "confidence": 0.95}
      \`\`\``;
      
      const result = extractJSONFromText(markdownText);
      expect(result).toEqual({
        ingredients: ["water", "sugar"],
        confidence: 0.95
      });
    });

    it('should extract JSON from plain text', () => {
      const plainText = 'The result is {"status": "success", "data": [1,2,3]} and here is more text';
      const result = extractJSONFromText(plainText);
      expect(result).toEqual({
        status: "success",
        data: [1, 2, 3]
      });
    });

    it('should return null for invalid JSON', () => {
      const invalidText = 'This has no JSON content at all';
      const result = extractJSONFromText(invalidText);
      expect(result).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedText = 'Here is broken JSON: {invalid json}';
      const result = extractJSONFromText(malformedText);
      expect(result).toBeNull();
    });
  });

  describe('OCR Quality Assessment', () => {
    const assessOCRQuality = (ocrResult) => {
      if (!ocrResult || !ocrResult.data) {
        return { quality: 'poor', confidence: 0, issues: ['No OCR data'] };
      }

      const { confidence, text } = ocrResult.data;
      const issues = [];
      let quality = 'good';

      // Check confidence level
      if (confidence < 60) {
        quality = 'poor';
        issues.push('Low confidence score');
      } else if (confidence < 80) {
        quality = 'fair';
        issues.push('Moderate confidence score');
      }

      // Check text length
      if (!text || text.trim().length < 10) {
        quality = 'poor';
        issues.push('Very short or empty text');
      }

      // Check for common OCR artifacts
      const commonIssues = /[|}{~`@#$%^&*+=\\]/g;
      if (commonIssues.test(text)) {
        if (quality === 'good') quality = 'fair';
        issues.push('Contains OCR artifacts');
      }

      return { quality, confidence, issues };
    };

    it('should assess high quality OCR results', () => {
      const ocrResult = {
        data: {
          confidence: 95,
          text: 'Ingredients: Water, Sugar, Natural Flavors'
        }
      };

      const assessment = assessOCRQuality(ocrResult);
      expect(assessment.quality).toBe('good');
      expect(assessment.confidence).toBe(95);
      expect(assessment.issues).toHaveLength(0);
    });

    it('should detect low confidence issues', () => {
      const ocrResult = {
        data: {
          confidence: 45,
          text: 'Some unclear text'
        }
      };

      const assessment = assessOCRQuality(ocrResult);
      expect(assessment.quality).toBe('poor');
      expect(assessment.issues).toContain('Low confidence score');
    });

    it('should detect OCR artifacts', () => {
      const ocrResult = {
        data: {
          confidence: 85,
          text: 'Ingred|ents: W@ter, Sug@r, N@tur@l Fl@vors'
        }
      };

      const assessment = assessOCRQuality(ocrResult);
      expect(assessment.quality).toBe('fair');
      expect(assessment.issues).toContain('Contains OCR artifacts');
    });

    it('should handle empty OCR results', () => {
      const ocrResult = null;
      const assessment = assessOCRQuality(ocrResult);
      expect(assessment.quality).toBe('poor');
      expect(assessment.issues).toContain('No OCR data');
    });

    it('should detect short text issues', () => {
      const ocrResult = {
        data: {
          confidence: 90,
          text: 'Hi'
        }
      };

      const assessment = assessOCRQuality(ocrResult);
      expect(assessment.quality).toBe('poor');
      expect(assessment.issues).toContain('Very short or empty text');
    });
  });

  describe('Data Sanitization Functions', () => {
    const sanitizeExtractedData = (data) => {
      if (!data || typeof data !== 'object') {
        return { ingredients: [], allergens: [], nutritionFacts: {}, warnings: [] };
      }

      const sanitized = {
        ingredients: Array.isArray(data.ingredients) ? data.ingredients.filter(item => 
          typeof item === 'string' && item.trim().length > 0
        ) : [],
        allergens: Array.isArray(data.allergens) ? data.allergens.filter(item => 
          typeof item === 'string' && item.trim().length > 0
        ) : [],
        nutritionFacts: data.nutritionFacts && typeof data.nutritionFacts === 'object' ? 
          data.nutritionFacts : {},
        warnings: Array.isArray(data.warnings) ? data.warnings.filter(item => 
          typeof item === 'string' && item.trim().length > 0
        ) : []
      };

      return sanitized;
    };

    it('should sanitize valid data correctly', () => {
      const rawData = {
        ingredients: ['Water', 'Sugar', '', 'Natural Flavors', null],
        allergens: ['Contains Nuts', ''],
        nutritionFacts: { calories: 120, fat: '2g' },
        warnings: ['Keep refrigerated', '']
      };

      const result = sanitizeExtractedData(rawData);
      expect(result.ingredients).toEqual(['Water', 'Sugar', 'Natural Flavors']);
      expect(result.allergens).toEqual(['Contains Nuts']);
      expect(result.nutritionFacts).toEqual({ calories: 120, fat: '2g' });
      expect(result.warnings).toEqual(['Keep refrigerated']);
    });

    it('should handle null input gracefully', () => {
      const result = sanitizeExtractedData(null);
      expect(result).toEqual({
        ingredients: [],
        allergens: [],
        nutritionFacts: {},
        warnings: []
      });
    });

    it('should handle invalid data types', () => {
      const rawData = {
        ingredients: 'not an array',
        allergens: 123,
        nutritionFacts: 'not an object',
        warnings: true
      };

      const result = sanitizeExtractedData(rawData);
      expect(result).toEqual({
        ingredients: [],
        allergens: [],
        nutritionFacts: {},
        warnings: []
      });
    });
  });

  describe('Error Handling Utilities', () => {
    const createErrorResponse = (error, context = 'general') => {
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error occurred',
          type: error.name || 'Error',
          context,
          timestamp: new Date().toISOString(),
          code: error.code || 'UNKNOWN'
        },
        data: null
      };
    };

    it('should create proper error responses', () => {
      const error = new Error('API request failed');
      error.code = 'API_ERROR';
      
      const response = createErrorResponse(error, 'ai_validation');
      
      expect(response.success).toBe(false);
      expect(response.error.message).toBe('API request failed');
      expect(response.error.type).toBe('Error');
      expect(response.error.context).toBe('ai_validation');
      expect(response.error.code).toBe('API_ERROR');
      expect(response.data).toBeNull();
      expect(response.error.timestamp).toBeDefined();
    });

    it('should handle errors without message', () => {
      const error = {};
      const response = createErrorResponse(error);
      
      expect(response.error.message).toBe('Unknown error occurred');
      expect(response.error.code).toBe('UNKNOWN');
    });
  });
});
