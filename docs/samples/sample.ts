/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable unicorn/prefer-top-level-await */
import {initSDK} from '@opensdks/runtime'
import discordSdkDef from '@opensdks/sdk-discord'
import openaiSdkDef from '@opensdks/sdk-openai'
import slackSdkDef from '@opensdks/sdk-slack'
import {veniceSdkDef} from '@opensdks/sdk-venice'

const discord = initSDK(discordSdkDef, {
  headers: {authorization: `Bearer ${process.env['DISCORD_TOKEN']}`},
})

void discord
  .GET('/channels/{channel_id}', {params: {path: {channel_id: ''}}})
  .then((r) => {
    r.data.flags
  })

const slack = initSDK(slackSdkDef, {
  headers: {token: process.env['SLACK_TOKEN']!},
})
void slack
  .GET('/admin.teams.admins.list', {
    params: {query: {team_id: ''}},
  })
  .then((r) => {
    r.data?.ok
  })

const openai = initSDK(openaiSdkDef, {
  headers: {authorization: `Bearer ${process.env['OPENAI_API_KEY']}`},
})
void openai
  .POST('/chat/completions', {
    body: {
      model: 'gpt-3.5-turbo',
      max_tokens: 1000,
      messages: [{role: 'user', content: 'What is OpenAPI'}],
    },
  })
  .then((r) => {
    console.log(r.data.choices[0]?.message)
    r.data.choices[0]?.message
  })

const venice = initSDK(veniceSdkDef, {headers: {}})

void venice.GET('/core/resource').then((r) => {
  r.data[0]?.connectorConfigId
})
