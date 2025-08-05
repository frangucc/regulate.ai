import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OCRDemo from '../OCRDemo.jsx';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: 'data:image/png;base64,mockImageData',
  onload: null
};

global.FileReader = vi.fn(() => mockFileReader);

// Wrapper component for React Router
const RouterWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('OCRDemo Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileReader.onload = null;
  });

  it('should render initial state correctly', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Check for main heading
    expect(screen.getByText('OCR + AI Validation Demo')).toBeInTheDocument();
    
    // Check for upload area
    expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
    
    // Check for file input
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
    
    // Initially no tabs should be visible
    expect(screen.queryByText('Original OCR')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Corrected')).not.toBeInTheDocument();
  });

  it('should handle file selection and show preview', async () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Create a mock file
    const mockFile = new File(['mock image data'], 'test-label.jpg', {
      type: 'image/jpeg'
    });

    const fileInput = screen.getByLabelText(/select file/i);
    
    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    await waitFor(() => {
      expect(screen.getByText('test-label.jpg')).toBeInTheDocument();
    });
  });

  it('should validate file types correctly', async () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Create an invalid file type
    const invalidFile = new File(['text content'], 'document.txt', {
      type: 'text/plain'
    });

    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/please select a valid image file/i)).toBeInTheDocument();
    });
  });

  it('should validate file size limits', async () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Create a file that's too large (>10MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg'
    });

    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument();
    });
  });

  it('should process OCR successfully and show results', async () => {
    const mockOCRResponse = {
      success: true,
      ocrResult: {
        text: 'NUTRITION FACTS\nServing Size 1 cup',
        confidence: 0.85,
        totalWords: 5,
        processingTime: 1200
      },
      aiValidation: {
        success: true,
        confidence: 0.92,
        completeness: 0.88,
        correctedText: 'NUTRITION FACTS\nServing Size 1 cup',
        aiProvider: 'anthropic',
        structuredData: {
          nutritionFacts: {
            servingSize: '1 cup'
          }
        },
        complianceIssues: [],
        recommendations: ['Consider higher resolution scan']
      },
      processingTime: 2500
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOCRResponse
    });

    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Upload a file
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Simulate FileReader
    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    // Click process button
    await waitFor(() => {
      const processButton = screen.getByRole('button', { name: /process with ai validation/i });
      fireEvent.click(processButton);
    });

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Original OCR')).toBeInTheDocument();
      expect(screen.getByText('AI Corrected')).toBeInTheDocument();
      expect(screen.getByText('Structured Data')).toBeInTheDocument();
      expect(screen.getByText('Issues & Recommendations')).toBeInTheDocument();
    });

    // Check stats
    expect(screen.getByText('85%')).toBeInTheDocument(); // OCR confidence
    expect(screen.getByText('92%')).toBeInTheDocument(); // AI confidence
  });

  it('should handle OCR processing errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });

    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Upload a file
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    // Click process button
    await waitFor(() => {
      const processButton = screen.getByRole('button', { name: /process with ai validation/i });
      fireEvent.click(processButton);
    });

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error processing image/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during processing', async () => {
    // Make fetch hang to test loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Upload a file
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    // Click process button
    await waitFor(() => {
      const processButton = screen.getByRole('button', { name: /process with ai validation/i });
      fireEvent.click(processButton);
    });

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });

  it('should switch between tabs correctly', async () => {
    const mockOCRResponse = {
      success: true,
      ocrResult: {
        text: 'Original OCR text',
        confidence: 0.8
      },
      aiValidation: {
        success: true,
        correctedText: 'Corrected AI text',
        structuredData: { test: 'data' },
        complianceIssues: ['Test issue'],
        recommendations: ['Test recommendation']
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOCRResponse
    });

    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Process a file first
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    await waitFor(() => {
      const processButton = screen.getByRole('button', { name: /process with ai validation/i });
      fireEvent.click(processButton);
    });

    // Wait for tabs to appear
    await waitFor(() => {
      expect(screen.getByText('Original OCR')).toBeInTheDocument();
    });

    // Click AI Corrected tab
    fireEvent.click(screen.getByText('AI Corrected'));
    expect(screen.getByText('Corrected AI text')).toBeInTheDocument();

    // Click Structured Data tab
    fireEvent.click(screen.getByText('Structured Data'));
    expect(screen.getByText(/"test": "data"/)).toBeInTheDocument();

    // Click Issues tab
    fireEvent.click(screen.getByText('Issues & Recommendations'));
    expect(screen.getByText('Test issue')).toBeInTheDocument();
    expect(screen.getByText('Test recommendation')).toBeInTheDocument();
  });

  it('should handle drag and drop functionality', async () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    const dropZone = screen.getByText(/click to upload or drag and drop/i).closest('div');
    
    // Test drag enter
    fireEvent.dragEnter(dropZone);
    // Should show drag over state (would need to check for visual changes)

    // Test drag leave
    fireEvent.dragLeave(dropZone);

    // Test drop
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [mockFile]
      }
    });

    // File should be processed similar to file input
  });
});
