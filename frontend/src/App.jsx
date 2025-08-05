import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import SchemaViewer from './components/SchemaViewer'
import UploaderTest from './pages/UploaderTest'
import OCRDemo from './components/OCRDemo'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/schema" element={<SchemaViewer />} />
      <Route path="/uploader-test" element={<UploaderTest />} />
      <Route path="/ocr-demo" element={<OCRDemo />} />
    </Routes>
  )
}

export default App
