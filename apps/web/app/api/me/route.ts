import type {NextRequest} from 'next/server'
import {NextResponse} from 'next/server'

import {withErrorHandler} from '@/lib-server'
import {serverComponentGetViewer} from '@/lib-server/server-component-helpers'

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const viewer = await serverComponentGetViewer(request.nextUrl)
    return NextResponse.json(viewer)
  })
}
