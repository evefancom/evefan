import {useToast} from '../shadcn'

interface WithToastOptions {
  title?: string
  description?: string
}

export function useWithToast(defaultOptions: WithToastOptions = {}) {
  const {toast} = useToast()

  const onSuccessFn = (opts: WithToastOptions) => () =>
    toast({
      variant: 'success',
      title: opts.title ?? 'Success',
      description: opts.description,
    })

  const onErrorFn = (opts: WithToastOptions) => (err: unknown) =>
    toast({
      variant: 'destructive',
      title: `Error: ${err}`,
      description: opts.description,
    })

  const withToast = (
    fn: () => unknown,
    {
      showLoading = 'Running',
      ...options
    }: WithToastOptions & {
      showLoading?: string | false
    } = {},
  ) => {
    const opts = {...defaultOptions, ...options}
    const loadingToast = showLoading
      ? toast({variant: 'loading', title: showLoading})
      : null
    // TODO: useMutation hook here rather than tracking it ourselves...

    return Promise.resolve(fn())
      .then((res) => {
        loadingToast?.dismiss()
        onSuccessFn(opts)()
        return res
      })
      .catch((err) => {
        loadingToast?.dismiss()
        onErrorFn(opts)(err)
      })
  }
  const onSuccess = onSuccessFn(defaultOptions)
  const onError = onErrorFn(defaultOptions)

  return {withToast, onSuccess, onError, toast}
}
