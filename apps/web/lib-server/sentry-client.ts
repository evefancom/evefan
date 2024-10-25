export function makeSentryClient(opts: {dsn: string}) {
  if (!opts.dsn) {
    console.warn('Sentry DSN missing, sentry calls will be noop')
  }

  interface Checkin {
    /** Required. The status of your job execution and whether it was completed successfully or unsuccessfully. The values accepted are in_progress, ok or error. */
    status: 'in_progress' | 'ok' | 'error'
    /** Optional. The runtime of the job in milliseconds. If this value is not provided, a duration will be automatically calculated based on the amount of time elapsed from check-in creation to updating a check-in as successful or failed. */
    duration?: number

    dateCreated?: string // '2023-01-27T07:19:49.902586Z'
    id?: string // 'cb65a7ee-26ae-49a9-8c4f-4d17c5afa933'
  }

  const client = {
    cronCheckin: async (urlStr: string, data: Checkin) => {
      const url = new URL(urlStr)
      Object.entries(data).forEach(([k, v]) => {
        url.searchParams.append(k, String(v))
      })
      await fetch(url)
    },
  }
  return {
    ...client,
    withCheckin: async <T>(
      urlStr: string | undefined,
      fn: () => T | Promise<T>,
    ): Promise<T> => {
      if (!urlStr) {
        // if (process.env['VERCEL_ENV'] === 'production') {
        //   throw new Error('monitorId missing for withCheckin')
        // }
        return fn()
      }
      await client.cronCheckin(urlStr, {status: 'in_progress'}).catch((err) => {
        console.error('Failed to checkin (in_progress)', err)
      })

      try {
        const ret = await fn()
        await client.cronCheckin(urlStr, {status: 'ok'}).catch((err) => {
          console.error('Failed to checkin (ok)', err)
        })
        return ret
      } catch (err) {
        await client.cronCheckin(urlStr, {status: 'error'}).catch((err) => {
          console.error('Failed to checkin (error)', err)
        })
        throw err
      }
    },
  }
}
