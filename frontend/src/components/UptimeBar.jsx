import React, { useState, useEffect } from 'react'

const UptimeBar = ({ testRuns, loading }) => {
  const [hoveredRun, setHoveredRun] = useState(null)
  
  const getBarColor = (run) => {
    switch (run.status) {
      case 'pass': return 'bg-green-500'
      case 'fail': return 'bg-red-500'  
      case 'incomplete': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  const getPerformanceColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600'
      case 'B': return 'text-green-500' 
      case 'C': return 'text-yellow-500'
      case 'D': return 'text-orange-500'
      case 'F': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✓'
      case 'fail': return '✗'
      case 'incomplete': return '○'
      default: return '?'
    }
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700">System Uptime History</h3>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
        <div className="flex space-x-1 h-8 bg-gray-100 rounded">
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i} className="flex-1 bg-gray-300 animate-pulse rounded-sm" />
          ))}
        </div>
      </div>
    )
  }

  if (!testRuns || testRuns.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700">System Uptime History</h3>
          <div className="text-sm text-gray-500">No test runs yet</div>
        </div>
        <div className="flex items-center justify-center h-8 bg-gray-100 rounded text-gray-500 text-sm">
          Run your first integration test to see uptime history
        </div>
      </div>
    )
  }

  // Take last 50 runs and reverse to show chronologically
  const displayRuns = testRuns.slice(0, 50).reverse()
  
  // Calculate overall uptime percentage
  const passCount = displayRuns.filter(run => run.status === 'pass').length
  const uptimePercentage = displayRuns.length > 0 ? (passCount / displayRuns.length * 100).toFixed(1) : 0

  return (
    <div className="mb-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700">System Uptime History</h3>
        <div className="text-sm text-gray-600">
          {uptimePercentage}% uptime • {displayRuns.length} tests
        </div>
      </div>
      
      <div className="flex space-x-1 h-8 bg-gray-100 rounded p-1 relative">
        {displayRuns.map((run, index) => (
          <div
            key={run.id}
            className={`flex-1 ${getBarColor(run)} rounded-sm cursor-pointer transition-all hover:scale-110 hover:z-10 relative`}
            onMouseEnter={() => setHoveredRun({ run, index })}
            onMouseLeave={() => setHoveredRun(null)}
            style={{ minWidth: '4px' }}
          />
        ))}
        
        {/* Tooltip */}
        {hoveredRun && (
          <div 
            className="absolute bottom-full mb-2 left-0 bg-black text-white text-xs rounded p-3 shadow-lg z-20 min-w-64"
            style={{ 
              left: `${(hoveredRun.index / displayRuns.length) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold mb-2">
              {getStatusIcon(hoveredRun.run.status)} {hoveredRun.run.status.toUpperCase()} • {formatTime(hoveredRun.run.createdAt)}
            </div>
            
            <div className="space-y-1 text-xs">
              <div>Overall Health: <span className="font-medium">{hoveredRun.run.overallHealth}</span></div>
              
              {hoveredRun.run.performanceGrade && (
                <div>Performance: <span className={`font-medium ${getPerformanceColor(hoveredRun.run.performanceGrade)}`}>
                  Grade {hoveredRun.run.performanceGrade}
                </span></div>
              )}
              
              {hoveredRun.run.totalTestTime && (
                <div>Test Duration: <span className="font-medium">{hoveredRun.run.totalTestTime}ms</span></div>
              )}
              
              {hoveredRun.run.failedComponents && hoveredRun.run.failedComponents.length > 0 && (
                <div>Failed: <span className="font-medium text-red-300">
                  {hoveredRun.run.failedComponents.join(', ')}
                </span></div>
              )}
              
              {hoveredRun.run.culprits && hoveredRun.run.culprits.length > 0 && (
                <div>Culprits: <span className="font-medium text-yellow-300">
                  {hoveredRun.run.culprits.join(', ')}
                </span></div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div>Triggered by: <span className="font-medium">{hoveredRun.run.triggeredBy}</span></div>
              </div>
            </div>
            
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 mt-2 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span>Pass</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
          <span>Incomplete</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span>Fail</span>
        </div>
      </div>
    </div>
  )
}

export default UptimeBar
