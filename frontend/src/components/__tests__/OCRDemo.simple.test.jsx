import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Router wrapper for testing
const RouterWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('OCRDemo Component (Simple Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should render the main heading', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    expect(screen.getByText('OCR Demo')).toBeInTheDocument();
  });

  it('should render upload section', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    expect(screen.getByText('📷 Upload Label Image')).toBeInTheDocument();
    expect(screen.getByText('Upload your label image')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop or click to browse')).toBeInTheDocument();
  });

  it('should render OCR analysis section', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    expect(screen.getByText('🤖 OCR + AI Analysis')).toBeInTheDocument();
    expect(screen.getByText(/Upload an image and click "Run OCR"/)).toBeInTheDocument();
  });

  it('should render instructions section', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    expect(screen.getByText('💡 How to use')).toBeInTheDocument();
    expect(screen.getByText(/Upload a clear image of a product label/)).toBeInTheDocument();
  });

  it('should have a file input', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('should handle file selection', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Find the file input
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Create a mock file
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    
    // Test that we can create a change event without errors
    expect(() => {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
    }).not.toThrow();
    
    // Verify file input properties
    expect(fileInput.accept).toBe('image/*');
    expect(fileInput.type).toBe('file');
  });

  it('should validate component structure', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Check for main container
    expect(document.querySelector('.min-h-screen')).toBeInTheDocument();
    
    // Check for grid layout
    expect(document.querySelector('.grid')).toBeInTheDocument();
    
    // Check for upload area
    expect(document.querySelector('.border-dashed')).toBeInTheDocument();
    
    // Check for instructions
    expect(document.querySelector('ol')).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Verify Tailwind classes are applied
    expect(document.querySelector('.bg-gray-50')).toBeInTheDocument();
    expect(document.querySelector('.rounded-lg')).toBeInTheDocument();
    expect(document.querySelector('.shadow')).toBeInTheDocument();
  });

  it('should display emoji icons', () => {
    render(
      <RouterWrapper>
        <OCRDemo />
      </RouterWrapper>
    );

    // Check for emoji content
    expect(screen.getByText('📁')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should handle component mounting without errors', () => {
    expect(() => {
      render(
        <RouterWrapper>
          <OCRDemo />
        </RouterWrapper>
      );
    }).not.toThrow();
  });
});
