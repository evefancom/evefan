'use client'

import 'next/image'
import '../global.css'
import {useSearchParams} from 'next/navigation'
import {Suspense} from 'react'
import {OpenIntConnectEmbed} from '@openint/connect'

function DemoInner() {
  const params = useSearchParams()
  const token = params?.get('token')
  return (
    <div className="flex h-screen w-screen flex-col">
      {token ? (
        <OpenIntConnectEmbed
          className="flex-1"
          params={{token}}
          baseUrl={null}
        />
      ) : (
        <p>
          Please pass a valid OpenInt connect token in the url as query param
          `?token=`
        </p>
      )}
    </div>
  )
}

export default function Demo() {
  return (
    <Suspense>
      <DemoInner />
    </Suspense>
  )
}
