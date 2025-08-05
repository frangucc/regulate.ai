import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const SchemaViewer = () => {
  const [schemaContent, setSchemaContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchSchema()
  }, [])

  const fetchSchema = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:4000/schema')
      const data = await response.json()
      
      if (data.status === 'OK') {
        setSchemaContent(data.schema)
        setLastUpdated(data.timestamp)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch schema')
      }
    } catch (err) {
      setError('Failed to connect to backend: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const parseSchemaModels = (schema) => {
    const models = []
    const modelMatches = schema.match(/model\s+(\w+)\s*{([^}]*)}/g)
    
    if (!modelMatches) return models
    
    modelMatches.forEach(modelBlock => {
      const nameMatch = modelBlock.match(/model\s+(\w+)/)
      if (!nameMatch) return
      
      const modelName = nameMatch[1]
      const fieldsBlock = modelBlock.match(/{([^}]*)}/)[1]
      
      const fields = []
      const fieldLines = fieldsBlock.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'))
      
      fieldLines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed.includes('@@') || !trimmed.includes(' ')) return
        
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 2) {
          const fieldName = parts[0]
          const fieldType = parts[1]
          const isPrimary = trimmed.includes('@id')
          const isOptional = fieldType.includes('?')
          const hasDefault = trimmed.includes('@default')
          
          fields.push({
            name: fieldName,
            type: fieldType,
            primary: isPrimary,
            optional: isOptional,
            hasDefault: hasDefault,
            rawLine: trimmed
          })
        }
      })
      
      models.push({
        name: modelName,
        fields: fields,
        rawContent: modelBlock
      })
    })
    
    return models
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading schema...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Error loading schema:</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={fetchSchema}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const models = parseSchemaModels(schemaContent)

  const getFieldTypeColor = (type) => {
    if (type.includes('String')) return 'text-blue-600 bg-blue-100'
    if (type.includes('DateTime')) return 'text-purple-600 bg-purple-100'
    if (type.includes('Boolean')) return 'text-green-600 bg-green-100'
    if (type.includes('Json')) return 'text-orange-600 bg-orange-100'
    if (type.includes('Float')) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🗄️ Database Schema
              </h1>
              <p className="text-xl text-gray-600">
                Live Prisma schema for reg.ulate.ai regulatory compliance system
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <button 
              onClick={fetchSchema}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Schema Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Schema Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {models.map((model, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg">{model.name}</h3>
                <p className="text-sm text-gray-600">{model.fields.length} fields</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Models */}
        <div className="space-y-8">
          {models.map((model, modelIndex) => (
            <div key={modelIndex} className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {model.name}
                </h2>
              </div>

              {/* Fields */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Fields</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Field</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Attributes</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {model.fields.map((field, fieldIndex) => (
                        <tr key={fieldIndex}>
                          <td className="px-4 py-2 font-mono text-sm">
                            {field.name}
                            {field.primary && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded">PK</span>}
                            {field.optional && <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1 rounded">?</span>}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getFieldTypeColor(field.type)}`}>
                              {field.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {field.hasDefault && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1">
                                @default
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 font-mono text-xs">
                            {field.rawLine}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw Schema */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Raw Schema</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code>{model.rawContent}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SchemaViewer
