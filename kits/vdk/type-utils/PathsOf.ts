/** @see https://github.com/microsoft/TypeScript/issues/31751 */
export type DefaultIfNever<T, U> = [T] extends [never] ? U : T

/**
 * Generates a union of "dotted paths" for the given type.
 * Capped at 3 levels of depth by default
 */
export type PathsOf<T, TMaxDepth extends number = 2> = DefaultIfNever<
  NonNullable<PathsOfObject<T, T, TMaxDepth>>,
  string
>

export type PathsOfObject<
  T,
  // Keep track of self and ancestors to prevent circular reference issues
  TSelf = T,
  TMaxDepth extends number = 2,
  TDepth extends number = 0,
> =
  // Array
  number extends keyof T
    ? PathsOfProp<number, NonNullable<T[number]>, TSelf, TMaxDepth, TDepth>
    : // Map
      string extends keyof T
      ? PathsOfProp<string, NonNullable<T[string]>, TSelf, TMaxDepth, TDepth>
      : // Plain object
        {
          [P in keyof T]: T[P] extends infer V | null | undefined
            ? PathsOfProp<P, V, TSelf, TMaxDepth, TDepth>
            : never
        }[keyof T]

export type PathsOfProp<
  P,
  V,
  TSelf,
  TMaxDepth extends number = 2,
  TDepth extends number = 0,
> = V extends unknown
  ? {
      0: `${string & P}`
      1:
        | `${string & P}`
        | `${string & P}.${PathsOfObject<
            V,
            V | TSelf,
            TMaxDepth,
            Increment<TDepth>
          >}`
    }[TDepth extends TMaxDepth
      ? 0
      : V extends object
        ? V extends string
          ? 0
          : TSelf extends V
            ? V extends TSelf
              ? 0
              : 1
            : 1
        : 0]
  : never

type Increment<T extends number> = T extends keyof IncrementMap
  ? IncrementMap[T]
  : never

interface IncrementMap {
  0: 1
  1: 2
  2: 3
  3: 4
  4: 5
  5: 6
  6: 7
  7: 8
  8: 9
  9: 10
}
