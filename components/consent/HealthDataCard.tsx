'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/form'
import { loadDemoHealthData, queryDPStepsMean } from '@/app/dashboard/actions'

interface HealthDataCardProps {
  className?: string
}

export function HealthDataCard({ className = '' }: HealthDataCardProps) {
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isQueryingDP, setIsQueryingDP] = useState(false)
  const [dpResult, setDpResult] = useState<{ dpMean: number; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  const handleLoadDemoData = async () => {
    setIsLoadingData(true)
    setError(null)

    try {
      const result = await loadDemoHealthData()
      if (result.success) {
        setDataLoaded(true)
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError('Failed to load demo data')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleQueryDP = async () => {
    if (!dataLoaded) {
      setError('Please load demo health data first')
      return
    }

    setIsQueryingDP(true)
    setError(null)

    try {
      const result = await queryDPStepsMean()
      if (result.success) {
        setDpResult(result.data)
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError('Failed to query differential privacy mean')
    } finally {
      setIsQueryingDP(false)
    }
  }

  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Health Data Privacy</h3>
              <p className="text-sm text-gray-500">Differential privacy demonstration</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Demo Data Loading */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900">1. Load Demo Health Data</h4>
              <p className="text-xs text-gray-600 mt-1">
                Generate realistic step count and heart rate data for demonstration
              </p>
            </div>
            {dataLoaded && (
              <div className="flex items-center text-green-600">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs">Loaded</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleLoadDemoData}
            isLoading={isLoadingData}
            disabled={isLoadingData || dataLoaded}
            size="sm"
            variant={dataLoaded ? 'primary' : 'outline'}
          >
            {dataLoaded ? 'Demo Data Loaded' : 'Load Demo Data'}
          </Button>
        </div>

        {/* Differential Privacy Query */}
        <div className="mb-6">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900">2. Query with Differential Privacy</h4>
            <p className="text-xs text-gray-600 mt-1">
              Issues consent token for telemedicine and queries average steps with ε=1.0 privacy budget
            </p>
          </div>

          <Button
            onClick={handleQueryDP}
            isLoading={isQueryingDP}
            disabled={isQueryingDP || !dataLoaded}
            size="sm"
          >
            Query DP Mean Steps
          </Button>
        </div>

        {/* Results Display */}
        {dpResult && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Differential Privacy Results</h4>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-blue-900">DP Mean Steps</dt>
                  <dd className="text-lg font-semibold text-blue-700">
                    {dpResult.dpMean.toFixed(0)} steps/day
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-blue-900">Privacy Budget</dt>
                  <dd className="text-sm text-blue-700">ε = 1.0</dd>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200">
                <dt className="text-xs font-medium text-blue-900">Consent Token</dt>
                <dd className="text-xs font-mono text-blue-600 break-all">
                  {dpResult.token.substring(0, 50)}...
                </dd>
              </div>

              <div className="mt-3 text-xs text-blue-800">
                <p className="font-medium">About this result:</p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-blue-700">
                  <li>Noise added to protect individual privacy</li>
                  <li>Consent token issued for telemedicine purpose</li>
                  <li>Original data remains secure and private</li>
                  <li>Suitable for research and analytics</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h5 className="text-xs font-medium text-gray-900 mb-2">How it works:</h5>
          <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
            <li>Demo generates 30 days of realistic health data</li>
            <li>System issues consent token for telemedicine use</li>
            <li>PDP API applies differential privacy (Laplace noise)</li>
            <li>Result shows privacy-preserving mean with ε=1.0 budget</li>
          </ol>
        </div>
      </div>
    </div>
  )
}