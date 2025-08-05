import React, { useState, useRef } from 'react';
import { Upload, FileImage, X, Check, AlertCircle, Loader2 } from 'lucide-react';

const LabelUploader = ({ onUploadComplete, onUploadError, testMode = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Supported file types for label images
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file) => {
    if (!supportedTypes.includes(file.type)) {
      return `File type ${file.type} not supported. Please use JPG, PNG, WebP, or PDF.`;
    }
    if (file.size > maxFileSize) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit.`;
    }
    return null;
  };

  const uploadToS3 = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'label');
    
    const response = await fetch('http://localhost:4000/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    return await response.json();
  };

  const handleFiles = async (files) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Validate all files first
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setUploading(true);
    const uploadResults = [];

    try {
      for (const file of fileArray) {
        if (testMode) {
          // Simulate upload in test mode
          await new Promise(resolve => setTimeout(resolve, 1000));
          const mockResult = {
            success: true,
            fileName: file.name,
            fileSize: file.size,
            s3Key: `test/labels/${Date.now()}_${file.name}`,
            s3Url: `https://mock-bucket.s3.amazonaws.com/test/labels/${Date.now()}_${file.name}`,
            uploadedAt: new Date().toISOString()
          };
          uploadResults.push(mockResult);
        } else {
          const result = await uploadToS3(file);
          uploadResults.push(result);
        }
      }

      setUploadedFiles(prev => [...prev, ...uploadResults]);
      
      if (onUploadComplete) {
        onUploadComplete(uploadResults);
      }
    } catch (err) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">Uploading to S3...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while your labels are processed</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop label images here or click to select
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports JPG, PNG, WebP, PDF up to 10MB
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Choose Files
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Results */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <FileImage className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(file.uploadedAt).toLocaleTimeString()}
                  </p>
                  {file.s3Url && (
                    <a
                      href={file.s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View in S3
                    </a>
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Mode Indicator */}
      {testMode && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Test Mode:</strong> Files will be simulated, not actually uploaded to S3.
          </p>
        </div>
      )}
    </div>
  );
};

export default LabelUploader;
