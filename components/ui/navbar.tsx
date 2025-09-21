'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOutAction } from '@/lib/signout'

interface NavBarProps {
  userEmail?: string
}

export default function NavBar({ userEmail }: NavBarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOutAction()
    } catch (error) {
      // Fallback: redirect to signin even if server action fails
      router.push('/signin')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
              Privacy First
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/clients" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Clients
            </Link>
            <Link href="/audit" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Audit
            </Link>
            
            {userEmail && (
              <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200">
                <span className="text-sm text-gray-600">{userEmail}</span>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}