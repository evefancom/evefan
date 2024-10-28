import {clerkMiddleware} from '@clerk/nextjs/server'

// Disable redirects
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Skip fothe connect route
    '/((?!connect|api|debug).*)',
    // Always run for API routes
    '/(api|trpc|connector)(.*)',
  ],
}
