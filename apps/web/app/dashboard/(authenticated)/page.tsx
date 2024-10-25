import {redirect} from 'next/navigation'

export default function HomePage() {
  return redirect('/dashboard/connector-configs')
  // return (
  //   <div className="p-6">
  //     <h2 className="mb-4 text-2xl font-semibold tracking-tight">
  //       Coming soon
  //     </h2>
  //     <p>
  //       A dashboard is coming soon. In the meantime check out entities section
  //       and magic link page
  //     </p>
  //   </div>
  // )
}
