'use client'

import {SignIn} from '@clerk/nextjs'
import {FullScreenCenter} from '@/components/FullScreenCenter'

export default function SignInScreen() {
  return (
    <FullScreenCenter>
      <SignIn signUpUrl="/dashboard/sign-up" />
    </FullScreenCenter>
  )
}
