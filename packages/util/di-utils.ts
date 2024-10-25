import type {Resolver} from 'awilix'
import {asValue, createContainer} from 'awilix'

import type {AnyFunction, Brand} from './type-utils'

export const container = createContainer()

export type InjectionToken<T> =
  | Brand<symbol, T>
  | Brand<string, T>
  | symbol
  | string

export function registerDependency<T>(
  token: InjectionToken<T>,
  registration: Resolver<T>,
) {
  return container.register(token, registration)
}

export function resolveDependency<T>(token: InjectionToken<T>) {
  return container.resolve<T>(token)
}

export function isDependencyRegistered<T>(token: InjectionToken<T>) {
  return container.hasRegistration(token)
}

export function resolveDependencyIfRegistered<T>(token: InjectionToken<T>) {
  if (isDependencyRegistered(token)) {
    return resolveDependency(token)
  }
  console.warn(`[di] ${token.toString()} not registered. Will return undefined`)
  return undefined
}

// Special handling for dependency injecting callable functions

export function implementProxyFn<TFn extends AnyFunction, TImpl extends TFn>(
  fn: TFn & {token: InjectionToken<TFn>},
  impl: TImpl,
  opts: {replaceExisting?: boolean} = {},
) {
  if (!fn.token) {
    throw new Error(`Expect function to have token when registering ${fn}`)
  }
  if (isDependencyRegistered(fn.token) && !opts.replaceExisting) {
    console.error(
      `[di] Function ${fn.token.toString()} has already been registered`,
    )
    // Was throwing before, but let's be kinder
  }
  registerDependency(fn.token, asValue(impl))
}

export function defineProxyFn<TFn extends AnyFunction>(
  _token: string,
  defaultImpl?: TFn,
): TFn & {token: InjectionToken<TFn>} {
  const token = _token as InjectionToken<TFn>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
  const fn = ((...args) => resolveDependency(token)(...args)) as TFn & {
    token: InjectionToken<TFn>
  }
  fn.token = token
  if (defaultImpl) {
    implementProxyFn(fn, defaultImpl)
  }
  return fn
}

export function resolveFn<TFn extends AnyFunction>(
  fn: TFn & {token: InjectionToken<TFn>},
): TFn {
  return resolveDependency(fn.token)
}

export function resolveFnIfRegistered<TFn extends AnyFunction>(
  fn: TFn & {token: InjectionToken<TFn>},
): TFn | undefined {
  return resolveDependencyIfRegistered(fn.token)
}
