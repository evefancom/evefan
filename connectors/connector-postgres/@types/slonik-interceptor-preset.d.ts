declare module 'slonik-interceptor-preset' {
  import type {Interceptor} from 'slonik'

  /**
   * @property benchmarkQueries Dictates whether to enable the [query benchmarking interceptor](https://github.com/gajus/slonik-interceptor-query-benchmarking). (Default: false)
   * @property logQueries Dictates whether to enable the [query logging interceptor](https://github.com/gajus/slonik-interceptor-query-logging). (Default: true)
   * @property normaliseQueries Dictates whether to enable the [query normalisation interceptor](https://github.com/gajus/slonik-interceptor-query-normalisation). (Default: true)
   * @property transformFieldNames Dictates whether to enable the [field name transformation interceptor](https://github.com/gajus/slonik-interceptor-field-name-transformation). (Default: true)
   */
  interface UserConfigurationType {
    benchmarkQueries?: boolean
    logQueries?: boolean
    normaliseQueries?: boolean
    transformFieldNames?: boolean
  }

  export function createInterceptors(
    config?: UserConfigurationType,
  ): Interceptor[]
}
