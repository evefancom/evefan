'use client'

import type {AppRouter} from '@openint/api'
import {zOrganization} from '@openint/engine-backend/services/AuthProvider'
import type {TRPCReact} from '@openint/engine-frontend'
import {_trpcReact, useMutationToast} from '@openint/engine-frontend'
import {SchemaForm} from '@openint/ui'

const trpcReact = _trpcReact as unknown as TRPCReact<AppRouter>

export default function SettingsPage() {
  const res = trpcReact.getCurrentOrganization.useQuery()

  const updateOrg = trpcReact.updateCurrentOrganization.useMutation({
    ...useMutationToast({
      successMessage: 'Organization updated',
      errorMessage: 'Failed to save organization',
    }),
  })

  if (!res.data) {
    return null
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">Settings</h2>
      <SchemaForm
        schema={zOrganization.shape.publicMetadata}
        uiSchema={{
          // Would be nice if this can be extracted from example field of the openapi spec
          database_url: {
            'ui:placeholder': 'postgres://username:password@host:port/database',
          },
          webhook_url: {'ui:placeholder': 'https://yourapp.com/webhook'},
        }}
        formData={res.data.publicMetadata}
        loading={updateOrg.isLoading}
        onSubmit={({formData}) => {
          updateOrg.mutate({publicMetadata: formData})
        }}
      />
    </div>
  )
}
