import React, { useState, useRef } from 'react';

const OCRDemo = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('original');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileSelect = (file) => {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, WebP)');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    setUploadedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Clear previous OCR results
    setOcrResult(null);
  };
  
  // Handle drag and drop
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };
  
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // OCR + AI Validation using backend endpoint
  const runOCR = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first');
      return;
    }
    
    setIsProcessing(true);
    setOcrResult(null);
    
    try {
      const startTime = Date.now();
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', uploadedImage);
      
      // Send to backend OCR + AI validation endpoint
      const response = await fetch('http://localhost:4000/ocr-validate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR processing failed');
      }
      
      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      // Format results for UI
      const result = {
        success: true,
        
        // OCR Results
        text: data.ocr.text,
        confidence: data.ocr.confidence,
        processingTime: data.ocr.processingTime,
        totalWords: data.ocr.totalWords,
        lines: data.ocr.lines?.length || 0,
        detectedSections: data.ocr.detectedSections,
        qualityAssessment: data.ocr.qualityAssessment,
        
        // AI Validation Results
        aiValidation: {
          isValid: data.aiValidation.isValid,
          confidence: data.aiValidation.confidence,
          correctedText: data.aiValidation.correctedText,
          extractedInformation: data.aiValidation.extractedInformation,
          ocrIssuesFound: data.aiValidation.ocrIssuesFound || [],
          completenessScore: data.aiValidation.completenessScore,
          complianceIssues: data.aiValidation.complianceIssues || [],
          recommendations: data.aiValidation.recommendations || [],
          qualityImprovement: data.aiValidation.qualityImprovement,
          processingTime: data.aiValidation.processingTime
        },
        
        // Overall processing time
        totalProcessingTime: processingTime
      };
      
      setOcrResult(result);
      
    } catch (error) {
      console.error('OCR + AI validation failed:', error);
      setOcrResult({ 
        success: false, 
        error: error.message,
        text: '',
        confidence: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OCR Demo</h1>
          <p className="text-lg text-gray-600">
            Upload a label image and see OCR text extraction in action
          </p>
        </div>

        {/* Main Upload + OCR Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Image Upload & Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📷 Upload Label Image</h2>
            
            {!imagePreview ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-4">
                  <div className="text-6xl">📁</div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">Upload your label image</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Drag & drop or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports JPG, PNG, WebP (max 10MB)
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Uploaded label" 
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Change Image
                  </button>
                  <button
                    onClick={runOCR}
                    disabled={isProcessing}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        Processing OCR...
                      </span>
                    ) : (
                      '🔍 Run OCR'
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Right Side - OCR + AI Results */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🤖 OCR + AI Analysis</h2>
            
            {!ocrResult ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500">Upload an image and click "Run OCR" to see AI-enhanced text extraction</p>
              </div>
            ) : ocrResult.success === false ? (
              <div className="border border-red-200 bg-red-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600 text-xl">❌</span>
                  <h3 className="font-medium text-red-800">Processing Failed</h3>
                </div>
                <p className="text-red-700 text-sm">{ocrResult.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Processing Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">OCR Confidence</p>
                    <p className="text-lg font-bold text-green-600">
                      {Math.round((ocrResult.confidence || 0) * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI Confidence</p>
                    <p className="text-lg font-bold text-blue-600">
                      {Math.round((ocrResult.aiValidation?.confidence || 0) * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Time</p>
                    <p className="text-lg font-bold text-purple-600">
                      {ocrResult.totalProcessingTime || 0}ms
                    </p>
                  </div>
                </div>

                {/* AI Validation Status */}
                {ocrResult.aiValidation && (
                  <div className={`p-4 rounded-lg border ${
                    ocrResult.aiValidation.isValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">
                        {ocrResult.aiValidation.isValid ? '✅' : '⚠️'}
                      </span>
                      <h3 className={`font-medium ${
                        ocrResult.aiValidation.isValid 
                          ? 'text-green-800' 
                          : 'text-yellow-800'
                      }`}>
                        AI Validation: {ocrResult.aiValidation.isValid ? 'Passed' : 'Needs Review'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Completeness Score</p>
                        <p className="font-medium">{ocrResult.aiValidation.completenessScore}/10</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Quality Improvement</p>
                        <p className="font-medium capitalize">{ocrResult.aiValidation.qualityImprovement}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tabs for different views */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button 
                      onClick={() => setActiveTab('original')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'original'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📖 Original OCR
                    </button>
                    <button 
                      onClick={() => setActiveTab('corrected')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'corrected'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🤖 AI Corrected
                    </button>
                    <button 
                      onClick={() => setActiveTab('structured')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'structured'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📋 Structured Data
                    </button>
                    <button 
                      onClick={() => setActiveTab('issues')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'issues'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      ⚠️ Issues
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-4">
                  {activeTab === 'original' && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Original OCR Text:</h3>
                      <div className="border rounded-lg p-4 bg-gray-50 max-h-80 overflow-y-auto">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                          {ocrResult.text || 'No text detected'}
                        </pre>
                      </div>
                      <div className="mt-3 text-sm text-gray-600">
                        {ocrResult.totalWords} words • {ocrResult.lines} lines
                      </div>
                    </div>
                  )}

                  {activeTab === 'corrected' && ocrResult.aiValidation && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">AI-Corrected Text:</h3>
                      <div className="border rounded-lg p-4 bg-green-50 max-h-80 overflow-y-auto">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {ocrResult.aiValidation.correctedText || 'No corrections applied'}
                        </pre>
                      </div>
                      {ocrResult.aiValidation.ocrIssuesFound?.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">OCR Issues Found:</h4>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {ocrResult.aiValidation.ocrIssuesFound.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'structured' && ocrResult.aiValidation?.extractedInformation && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Structured Information:</h3>
                      <div className="space-y-4">
                        {Object.entries(ocrResult.aiValidation.extractedInformation).map(([key, value]) => {
                          if (!value || (Array.isArray(value) && value.length === 0)) return null;
                          return (
                            <div key={key} className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 capitalize mb-2">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <div className="text-sm text-blue-700">
                                {Array.isArray(value) ? (
                                  <ul className="list-disc list-inside">
                                    {value.map((item, idx) => (
                                      <li key={idx}>{typeof item === 'object' ? JSON.stringify(item, null, 2) : item}</li>
                                    ))}
                                  </ul>
                                ) : typeof value === 'object' ? (
                                  <div className="space-y-1">
                                    {Object.entries(value).map(([subKey, subValue]) => (
                                      <div key={subKey} className="flex justify-between">
                                        <span className="font-medium capitalize">
                                          {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                                        </span>
                                        <span>{subValue}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p>{value}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'issues' && ocrResult.aiValidation && (
                    <div>
                      <div className="space-y-4">
                        {ocrResult.aiValidation.complianceIssues?.length > 0 && (
                          <div>
                            <h3 className="font-medium text-red-900 mb-3">🚨 Compliance Issues:</h3>
                            <ul className="space-y-2">
                              {ocrResult.aiValidation.complianceIssues.map((issue, idx) => (
                                <li key={idx} className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {ocrResult.aiValidation.recommendations?.length > 0 && (
                          <div>
                            <h3 className="font-medium text-blue-900 mb-3">💡 Recommendations:</h3>
                            <ul className="space-y-2">
                              {ocrResult.aiValidation.recommendations.map((rec, idx) => (
                                <li key={idx} className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(!ocrResult.aiValidation.complianceIssues?.length && !ocrResult.aiValidation.recommendations?.length) && (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">✅</div>
                            <p>No issues or recommendations found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">💡 How to use</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li>Upload a clear image of a product label (food, cosmetics, etc.)</li>
            <li>Click "Run OCR" to extract text using Tesseract.js</li>
            <li>Review the extracted text and confidence scores</li>
            <li>Use the results for regulatory compliance checking</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default OCRDemo;
