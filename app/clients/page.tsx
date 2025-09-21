import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import NavBar from '@/components/ui/navbar'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar userEmail={session.email} />
      <ClientsClient />
    </div>
  )
}