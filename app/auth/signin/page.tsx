import { SignInForm } from '@/components/auth/SignInForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In - Hearth',
  description: 'Sign in to your Hearth family account',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SignInForm />
    </div>
  )
}
