import { SignUpWizard } from '@/components/auth/SignUpWizard'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up - Hearth',
  description: 'Create your Hearth family account',
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SignUpWizard />
    </div>
  )
}
