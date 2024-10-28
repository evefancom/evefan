import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers, zEntityPayload} from '@openint/cdk'
import {isAmountUnit, z} from '@openint/util'

export type BeancountDestOptions = z.infer<typeof zBeancountDestOptions>
export const zBeancountDestOptions = z.object({
  outPath: z.string(),
  separateByPeriod: z.boolean().optional(),
  saveStdJson: z.boolean().optional(),
  debugSaveBeanJson: z.boolean().optional(),
  operatingCurrency: z.string().refine(isAmountUnit).optional(),
})

export const beancountSchemas = {
  name: z.literal('beancount'),
  destinationState: zBeancountDestOptions,
  destinationInputEntity: zEntityPayload,
} satisfies ConnectorSchemas

export const beancountHelpers = connHelpers(beancountSchemas)

export const beancountDef = {
  schemas: beancountSchemas,
  name: 'beancount',
  metadata: {
    verticals: [
      'personal-finance',
      // Add other relevant verticals if needed
    ],
    platforms: ['local'],
    logoUrl: '/_assets/logo-beancount.svg',
  },
} satisfies ConnectorDef<typeof beancountSchemas>

export default beancountDef
