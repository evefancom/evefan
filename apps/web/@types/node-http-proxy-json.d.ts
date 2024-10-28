declare module 'node-http-proxy-json' {
  /**
   * Modify the response of json
   * @param res {Response} The http response
   * @param proxyRes {proxyRes|String} String: The http header content-encoding: gzip/deflate
   * @param callback {Function} Custom modified logic
   */
  export default function modifyResponse<T = unknown, U = T>(
    res: import('http').ServerResponse,
    proxyRes: unknown,
    callback: (json: T) => U | Promise<U>,
  ): void
}
