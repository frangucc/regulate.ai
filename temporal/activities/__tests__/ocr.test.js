import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock functions
const mockTesseractRecognize = vi.fn();
const mockTesseractGetLogger = vi.fn();

// Mock Tesseract.js before importing
vi.mock('tesseract.js', () => ({
  default: {
    recognize: mockTesseractRecognize,
    getLogger: mockTesseractGetLogger
  }
}));

// Import after mocking
import { performOCR, assessOCRQuality } from '../ocr.js';

describe('OCR Activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performOCR', () => {
    const mockImageData = {
      filename: 'test-label.jpg',
      imageUrl: 'https://example.com/test-image.jpg',
      type: 'food-label'
    };

    it('should successfully process OCR with high confidence', async () => {
      const mockTesseractResult = {
        data: {
          text: 'NUTRITION FACTS\nServing Size 1 cup (240ml)\nCalories 150\nTotal Fat 5g',
          confidence: 87,
          words: [
            { text: 'NUTRITION', confidence: 92 },
            { text: 'FACTS', confidence: 89 },
            { text: 'Serving', confidence: 85 },
            { text: 'Size', confidence: 88 },
            { text: '1', confidence: 95 },
            { text: 'cup', confidence: 82 },
            { text: '(240ml)', confidence: 78 },
            { text: 'Calories', confidence: 90 },
            { text: '150', confidence: 94 }
          ],
          lines: [
            { text: 'NUTRITION FACTS' },
            { text: 'Serving Size 1 cup (240ml)' },
            { text: 'Calories 150' },
            { text: 'Total Fat 5g' }
          ]
        }
      };

      mockTesseractRecognize.mockResolvedValue(mockTesseractResult);

      const result = await performOCR(mockImageData);

      expect(result.success).toBe(true);
      expect(result.text).toBe('NUTRITION FACTS\nServing Size 1 cup (240ml)\nCalories 150\nTotal Fat 5g');
      expect(result.confidence).toBe(0.87);
      expect(result.totalWords).toBe(9);
      expect(result.lowConfidenceWords).toBe(1); // (240ml) at 78%
      expect(result.lines).toHaveLength(4);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should detect nutritional information sections', async () => {
      const mockTesseractResult = {
        data: {
          text: 'NUTRITION FACTS\nServing Size 1 cup\nCalories 150\nTotal Fat 5g\nSodium 200mg\nINGREDIENTS: Water, Sugar',
          confidence: 85,
          words: [],
          lines: []
        }
      };

      mockTesseractRecognize.mockResolvedValue(mockTesseractResult);

      const result = await performOCR(mockImageData);

      expect(result.detectedSections.nutritionFacts).toBeDefined();
      expect(result.detectedSections.nutritionFacts).toContain('Serving Size');
      expect(result.detectedSections.ingredients).toBeDefined();
      expect(result.detectedSections.ingredients).toContain('Water, Sugar');
    });

    it('should handle OCR processing errors', async () => {
      mockTesseractRecognize.mockRejectedValue(new Error('OCR processing failed'));

      const result = await performOCR(mockImageData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OCR processing failed');
      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
    });

    it('should handle empty OCR results', async () => {
      const mockTesseractResult = {
        data: {
          text: '',
          confidence: 0,
          words: [],
          lines: []
        }
      };

      mockTesseractRecognize.mockResolvedValue(mockTesseractResult);

      const result = await performOCR(mockImageData);

      expect(result.success).toBe(true);
      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.totalWords).toBe(0);
    });

    it('should identify low confidence words correctly', async () => {
      const mockTesseractResult = {
        data: {
          text: 'Some clear text and blurry text',
          confidence: 75,
          words: [
            { text: 'Some', confidence: 95 },
            { text: 'clear', confidence: 92 },
            { text: 'text', confidence: 88 },
            { text: 'and', confidence: 85 },
            { text: 'blurry', confidence: 65 }, // Low confidence
            { text: 'text', confidence: 70 }    // Low confidence
          ],
          lines: []
        }
      };

      mockTesseractRecognize.mockResolvedValue(mockTesseractResult);

      const result = await performOCR(mockImageData);

      expect(result.lowConfidenceWords).toBe(2);
    });
  });

  describe('assessOCRQuality', () => {
    it('should assess high quality OCR results', async () => {
      const highQualityOCR = {
        text: 'NUTRITION FACTS\nServing Size 1 cup (240ml)\nCalories 150',
        confidence: 0.92,
        totalWords: 8,
        lowConfidenceWords: 0,
        detectedSections: {
          nutritionFacts: 'Serving Size 1 cup (240ml)\nCalories 150'
        }
      };

      const assessment = await assessOCRQuality(highQualityOCR);

      expect(assessment.overall).toBe('excellent');
      expect(assessment.confidence).toBeGreaterThan(0.9);
      expect(assessment.issues).toHaveLength(0);
      expect(assessment.recommendations).toHaveLength(0);
    });

    it('should assess medium quality OCR results', async () => {
      const mediumQualityOCR = {
        text: 'nutrition facts\nserving size 1 cup\ncalories 150',
        confidence: 0.75,
        totalWords: 7,
        lowConfidenceWords: 2,
        detectedSections: {}
      };

      const assessment = await assessOCRQuality(mediumQualityOCR);

      expect(assessment.overall).toBe('good');
      expect(assessment.confidence).toBeBetween(0.7, 0.8);
      expect(assessment.issues.length).toBeGreaterThan(0);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should assess poor quality OCR results', async () => {
      const poorQualityOCR = {
        text: 'nutr1t10n f4cts\ns3rv1ng s1z3',
        confidence: 0.45,
        totalWords: 4,
        lowConfidenceWords: 3,
        detectedSections: {}
      };

      const assessment = await assessOCRQuality(poorQualityOCR);

      expect(assessment.overall).toBe('poor');
      expect(assessment.confidence).toBeLessThan(0.6);
      expect(assessment.issues).toContain('Very low OCR confidence (45%)');
      expect(assessment.issues).toContain('High number of low-confidence words (75%)');
      expect(assessment.recommendations).toContain('Consider rescanning with higher resolution');
    });

    it('should identify empty text issues', async () => {
      const emptyOCR = {
        text: '',
        confidence: 0,
        totalWords: 0,
        lowConfidenceWords: 0,
        detectedSections: {}
      };

      const assessment = await assessOCRQuality(emptyOCR);

      expect(assessment.overall).toBe('poor');
      expect(assessment.issues).toContain('No text detected');
      expect(assessment.recommendations).toContain('Check image quality and try again');
    });

    it('should detect regulatory section issues', async () => {
      const ocrWithoutSections = {
        text: 'Some random text without regulatory sections',
        confidence: 0.85,
        totalWords: 7,
        lowConfidenceWords: 0,
        detectedSections: {}
      };

      const assessment = await assessOCRQuality(ocrWithoutSections);

      expect(assessment.issues).toContain('No regulatory sections detected');
      expect(assessment.recommendations).toContain('Verify this is a product label');
    });
  });
});
