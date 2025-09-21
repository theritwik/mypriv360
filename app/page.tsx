import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      {/* Hero Section */}
      <div className="max-w-4xl space-y-6">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Privacy-First App
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Secure data management with comprehensive privacy controls.
          Built with modern technology and a commitment to your data protection.
        </p>

        {/* Button Row */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg font-semibold transition-all hover:shadow-xl"
          >
            Get Started
          </Link>
          <Link
            href="/signin"
            className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 px-8 py-3 rounded-xl shadow font-semibold transition-all hover:shadow-md"
          >
            Sign In
          </Link>
          <Link
            href="/audit"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl shadow font-semibold transition-all"
          >
            View Audit Logs
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Consent Management</h3>
          <p className="text-gray-600">Complete control over data permissions and user consent</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-2">API Security</h3>
          <p className="text-gray-600">Robust API client management with comprehensive audit trails</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Privacy by Design</h3>
          <p className="text-gray-600">Built-in privacy controls and differential privacy techniques</p>
        </div>
      </div>
    </div>
  )
}