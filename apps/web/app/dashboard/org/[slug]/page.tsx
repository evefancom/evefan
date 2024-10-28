import {auth as serverComponentGetAuth} from '@clerk/nextjs/server'

export default function OrgHomePage() {
  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        You are logged in as
      </h2>
      <pre>{JSON.stringify(serverComponentGetAuth(), null, 2)}</pre>
    </div>
  )
}
