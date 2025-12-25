'use client'

import { useState } from 'react'
import Link from 'next/link'

type TerrainResult = {
  name: string
  center: [number, number]
  elevations: number[]
  minElev: number
  maxElev: number
  grid: number
}

export default function TerrainAPIPage() {
  const [query, setQuery] = useState('')
  const [size, setSize] = useState(10)
  const [grid, setGrid] = useState(20)
  const [result, setResult] = useState<TerrainResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchTerrain = async () => {
    if (!query) {
      setError('Please enter a location')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const params = new URLSearchParams({
        q: query,
        size: size.toString(),
        grid: grid.toString(),
      })
      const response = await fetch(`https://map-api.psiegel.org?${params}`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setResult(data)
    } catch {
      setError('Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  const copyApiUrl = () => {
    const url = `https://map-api.psiegel.org?q=${encodeURIComponent(query || 'Mount Everest')}&size=${size}&grid=${grid}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const setExampleLocation = (location: string) => {
    setQuery(location)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              <i className="fas fa-arrow-left mr-2" />
              Back to Home
            </Link>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
              Public API
            </span>
          </div>

          <h1 className="text-3xl font-bold text-center mb-4">
            <i className="fas fa-mountain text-indigo-400 mr-3" />
            Terrain Elevation API
          </h1>

          <p className="text-gray-400 text-center mb-6">
            A free public API that returns elevation data for any location on Earth.
            Powers the{' '}
            <a
              href="https://3d-map.psiegel.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              3D Terrain Explorer
            </a>.
          </p>

          {/* API Endpoint Display */}
          <div className="bg-dark-400 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Base URL</span>
              <button
                onClick={copyApiUrl}
                className="text-xs text-gray-400 hover:text-white"
              >
                {copied ? '✓ Copied!' : 'Copy URL'}
              </button>
            </div>
            <code className="text-green-400 text-sm">
              https://map-api.psiegel.org
            </code>
          </div>

          {/* Try It Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2">Location</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Grand Canyon, Mount Fuji"
                  className="flex-1 px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg focus:outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && fetchTerrain()}
                />
                <button
                  onClick={fetchTerrain}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <i className="fas fa-spinner animate-spin" />
                  ) : (
                    'Try It'
                  )}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">
                  Area Size (km): {size}
                </label>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">
                  Grid Resolution
                </label>
                <select
                  value={grid}
                  onChange={(e) => setGrid(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  <option value={20}>20x20 (Fast)</option>
                  <option value={30}>30x30 (Medium)</option>
                  <option value={40}>40x40 (Detailed)</option>
                </select>
              </div>
            </div>

            {/* Example Locations */}
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-500 text-sm">Try:</span>
              <button
                onClick={() => setExampleLocation('Grand Canyon')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                Grand Canyon
              </button>
              <button
                onClick={() => setExampleLocation('Mount Everest')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                Mount Everest
              </button>
              <button
                onClick={() => setExampleLocation('Swiss Alps')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                Swiss Alps
              </button>
              <button
                onClick={() => setExampleLocation('Mount Fuji')}
                className="text-xs bg-dark-400 px-2 py-1 rounded hover:bg-dark-300"
              >
                Mount Fuji
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
              <i className="fas fa-exclamation-circle mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Main Result Card */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">
                <i className="fas fa-map-marker-alt text-indigo-400 mr-2" />
                {result.name}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Min Elevation</p>
                  <p className="text-2xl font-bold text-blue-400">{result.minElev}m</p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Max Elevation</p>
                  <p className="text-2xl font-bold text-orange-400">{result.maxElev}m</p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Elevation Range</p>
                  <p className="text-2xl font-bold text-green-400">{result.maxElev - result.minElev}m</p>
                </div>
                <div className="bg-dark-400/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Data Points</p>
                  <p className="text-2xl font-bold text-purple-400">{result.elevations.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Center Latitude</p>
                  <p className="text-lg font-semibold">{result.center[0].toFixed(4)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Center Longitude</p>
                  <p className="text-lg font-semibold">{result.center[1].toFixed(4)}</p>
                </div>
              </div>
            </div>

            {/* View in 3D */}
            <div className="card p-6 bg-gradient-to-r from-indigo-500/10 to-amber-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    <i className="fas fa-cube text-indigo-400 mr-2" />
                    View in 3D
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Explore this terrain in the interactive 3D viewer
                  </p>
                </div>
                <a
                  href={`https://3d-map.psiegel.org?q=${encodeURIComponent(query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Open 3D Map
                  <i className="fas fa-external-link-alt ml-2" />
                </a>
              </div>
            </div>

            {/* Raw JSON */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  <i className="fas fa-code text-gray-400 mr-2" />
                  API Response (JSON)
                </h3>
                <button
                  onClick={() => {
                    const displayResult = {
                      ...result,
                      elevations: `[${result.elevations.slice(0, 3).join(', ')}, ... ${result.elevations.length} total values]`,
                    }
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="btn-secondary text-xs"
                >
                  {copied ? '✓ Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="bg-dark-400 rounded-lg p-4 overflow-x-auto text-xs text-gray-300">
{`{
  "name": "${result.name}",
  "center": [${result.center[0]}, ${result.center[1]}],
  "elevations": [${result.elevations.slice(0, 5).join(', ')}, ... ${result.elevations.length} total],
  "minElev": ${result.minElev},
  "maxElev": ${result.maxElev},
  "grid": ${result.grid}
}`}
              </pre>
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div className="card p-6 mt-8">
          <h2 className="text-xl font-semibold mb-6">
            <i className="fas fa-book text-blue-400 mr-2" />
            API Documentation
          </h2>

          <div className="space-y-6">
            {/* Authentication */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Authentication</h3>
              <p className="text-sm text-gray-400">
                No authentication required. The API is open for public use.
              </p>
            </div>

            {/* Rate Limiting */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Rate Limiting</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Uses Open-Topo-Data backend with automatic request batching</li>
                <li>• Responses are cached for 30 days via Cloudflare KV</li>
                <li>• Please be respectful with request frequency</li>
              </ul>
            </div>

            {/* Request */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Endpoint</h3>
              <code className="block bg-dark-400 rounded p-3 text-sm">
                GET https://map-api.psiegel.org
              </code>
            </div>

            {/* Parameters */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Query Parameters</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-dark-100">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Required</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-dark-100/50">
                      <td className="py-2"><code>q</code></td>
                      <td className="py-2">string</td>
                      <td className="py-2">Yes*</td>
                      <td className="py-2">Location search query (e.g., &quot;Mount Everest&quot;)</td>
                    </tr>
                    <tr className="border-b border-dark-100/50">
                      <td className="py-2"><code>lat</code></td>
                      <td className="py-2">number</td>
                      <td className="py-2">Yes*</td>
                      <td className="py-2">Latitude coordinate</td>
                    </tr>
                    <tr className="border-b border-dark-100/50">
                      <td className="py-2"><code>lon</code></td>
                      <td className="py-2">number</td>
                      <td className="py-2">Yes*</td>
                      <td className="py-2">Longitude coordinate</td>
                    </tr>
                    <tr className="border-b border-dark-100/50">
                      <td className="py-2"><code>size</code></td>
                      <td className="py-2">number</td>
                      <td className="py-2">No</td>
                      <td className="py-2">Area size in km (default: 10, max: 200)</td>
                    </tr>
                    <tr>
                      <td className="py-2"><code>grid</code></td>
                      <td className="py-2">number</td>
                      <td className="py-2">No</td>
                      <td className="py-2">Grid resolution (default: 20, options: 20, 30, 40)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Either <code>q</code> OR both <code>lat</code> and <code>lon</code> are required.
              </p>
            </div>

            {/* Response Fields */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Response Fields</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><code className="text-green-400">name</code> - Resolved location name from geocoding</li>
                <li><code className="text-green-400">center</code> - Center coordinates [lat, lon] of the terrain area</li>
                <li><code className="text-green-400">elevations</code> - Flat array of elevation values (grid × grid) in meters</li>
                <li><code className="text-green-400">minElev</code> - Minimum elevation in the area (meters)</li>
                <li><code className="text-green-400">maxElev</code> - Maximum elevation in the area (meters)</li>
                <li><code className="text-green-400">grid</code> - Grid resolution used</li>
              </ul>
            </div>

            {/* Example Requests */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Example Requests</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1"># Search by location name</p>
                  <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`curl "https://map-api.psiegel.org?q=Grand%20Canyon&size=20&grid=20"`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1"># Search by coordinates</p>
                  <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`curl "https://map-api.psiegel.org?lat=36.0544&lon=-112.1401&size=20&grid=20"`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Success Response */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Success Response</h3>
              <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`{
  "name": "Grand Canyon Village, Coconino County, Arizona, United States",
  "center": [36.0544, -112.1401],
  "elevations": [1800, 1850, 1900, ...],
  "minElev": 750,
  "maxElev": 2200,
  "grid": 20
}`}
              </pre>
            </div>

            {/* Error Response */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Error Response</h3>
              <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`{
  "error": "Location not found"
}`}
              </pre>
            </div>

            {/* JavaScript Example */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">JavaScript Example</h3>
              <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`async function getTerrainData(location, options = {}) {
  const params = new URLSearchParams({
    q: location,
    size: options.size || 10,
    grid: options.grid || 20
  });

  const response = await fetch(\`https://map-api.psiegel.org?\${params}\`);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// Example usage
const terrain = await getTerrainData('Mount Fuji', { size: 30, grid: 30 });
console.log(\`Elevation range: \${terrain.minElev}m - \${terrain.maxElev}m\`);`}
              </pre>
            </div>

            {/* Python Example */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Python Example</h3>
              <pre className="bg-dark-400 rounded p-3 text-sm overflow-x-auto">
{`import requests

def get_terrain_data(location, size=10, grid=20):
    response = requests.get('https://map-api.psiegel.org', params={
        'q': location,
        'size': size,
        'grid': grid
    })
    data = response.json()

    if 'error' in data:
        raise Exception(data['error'])

    return data

# Example usage
terrain = get_terrain_data('Swiss Alps', size=50)
print(f"Center: {terrain['center']}")
print(f"Elevation range: {terrain['minElev']}m - {terrain['maxElev']}m")`}
              </pre>
            </div>

            {/* Data Sources */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Data Sources</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li><strong>Geocoding:</strong> OpenStreetMap Nominatim</li>
                <li><strong>Elevation:</strong> Open-Topo-Data SRTM 90m dataset</li>
              </ul>
            </div>

            {/* Notes */}
            <div>
              <h3 className="font-semibold text-primary-400 mb-2">Notes</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• The <code>elevations</code> array is in row-major order (top-left to bottom-right)</li>
                <li>• Grid size affects both detail and response time (larger = slower)</li>
                <li>• Very large areas ({'>'}100km) may have lower effective resolution due to SRTM data limits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
