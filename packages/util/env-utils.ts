import {sort} from 'fast-sort'
import * as R from 'remeda'
import type {JsonValue} from 'type-fest'
import {z} from 'zod'

import {
  javascriptStringify,
  safeJSONParse,
  safeJSONStringify,
} from './json-utils'
import {setAt} from './object-utils'
import {zGuard} from './zod-utils'

/** TODO: Consider making this work beyond envVars? */
export function zEnvVars<T extends z.ZodRawShape>(shape: T) {
  // Zod is super opinionated, therefore we do not have access to description
  // during error formattign :(
  // @see https://github.com/colinhacks/zod/pull/1241
  // At some point we probably want a custom zod.parse type anyways
  R.forEachObj.indexed(shape, (schema, _key) => {
    const key = _key.toString()
    const def = schema._def as z.ZodTypeDef
    def.errorMap = (_issue, ctx) => {
      if (_issue.code === 'invalid_type' && ctx.data == null) {
        return {message: `env.${key} is required`}
      }
      return {message: `env.${key}: ${ctx.defaultError}`}
    }
  })
  return z.object(shape)
}

/** Flatten a zod schema for loading from env... */
// TODO: How do we handle array values?
export function zFlattenForEnv<T extends z.ZodTypeAny>(
  schema: T,
  {
    prefix,
    separator = '.',
    stringify = true,
  }: {
    prefix?: string
    separator?: string
    stringify?: boolean
  },
) {
  const flatSchema = z.object(
    flattenShapeForEnv(schema, {
      prefixes: prefix ? [prefix] : [],
      separator,
      stringify,
    }),
  )

  return flatSchema.transform(
    zGuard((input) => {
      const nested: Record<string, unknown> = unflattenEnv(input, {separator})
      // console.log('beforeafter', input, nested, prefix)
      // Notably this does not work with optional...
      return schema.parse(prefix ? nested[prefix] : nested) as unknown
    }),
  )
}

// TODO: Can we convert to JSON schema and flatten that instead?
// Maybe there are tools that would help
/** Get a flat shape suitable for passing into z.object  */
function flattenShapeForEnv<T extends z.ZodTypeAny>(
  schema: T,
  {
    prefixes,
    separator,
    stringify,
  }: {
    prefixes: string[]
    separator: string
    stringify: boolean
  },
): z.ZodRawShape {
  // console.log('flattenShapeForEnv', schema, prefixes)
  // if (!schema) {
  //   return {}
  // }
  // Need better solution here...
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const unwrapped = schema.unwrap()
    if (
      unwrapped instanceof z.ZodObject ||
      unwrapped instanceof z.ZodRecord ||
      stringify
    ) {
      return flattenShapeForEnv(
        (unwrapped as z.ZodTypeAny).describe(
          // TODO: Get '(required)' working too , right now this is only ever optional...
          `${schema.isOptional() ? '(Optional)' : '(Required)'} ${
            schema.description ?? ''
          }`,
        ),
        {stringify, separator, prefixes},
      )
    }
  }
  if (schema instanceof z.ZodObject || schema instanceof z.ZodRecord) {
    const shape: z.ZodRawShape =
      schema instanceof z.ZodObject
        ? (schema.shape as z.ZodRawShape)
        : R.pipe(
            schema.keySchema,
            (ks) => (ks instanceof z.ZodEnum ? (ks.options as string[]) : []),
            R.mapToObj((key) => [
              key,
              (schema.valueSchema as z.ZodTypeAny).optional(),
            ]),
          )

    // console.log('shape', shape)
    return R.pipe(
      shape,
      R.toPairs,
      R.map(([key, value]) =>
        flattenShapeForEnv(value, {
          stringify,
          separator,
          prefixes: [...prefixes, key],
        }),
      ),
      R.mergeAll,
    ) as z.ZodRawShape
  }

  const hint = schemaHint(schema)
  // console.log('prefixes', prefixes.join('.'), schema)
  return {
    [prefixes.join(separator)]: !stringify
      ? schema
      : z
          .string()
          .optional()
          // Handle things like array etc.
          .transform((str) => safeJSONParse(str) ?? str)
          .describe(
            R.compact([
              hint && '`',
              hint,
              hint && '`',
              hint && schema.description && ' - ',
              schema.description,
            ]).join(''),
          ),
  }
}

function schemaHint(schema: z.ZodTypeAny): string {
  if (schema instanceof z.ZodEnum) {
    return (schema.options as string[]).join(' | ')
  } else if (schema instanceof z.ZodNativeEnum) {
    return Object.values(schema.enum as Record<string, string>).join(' | ')
  } else if (schema instanceof z.ZodString) {
    return 'string'
  } else if (schema instanceof z.ZodNumber) {
    return 'number'
  } else if (schema instanceof z.ZodBoolean) {
    return 'boolean'
  } else if (schema instanceof z.ZodOptional) {
    return schemaHint(schema.unwrap() as z.ZodTypeAny) + ' | undefined'
  } else if (schema instanceof z.ZodNullable) {
    return schemaHint(schema.unwrap() as z.ZodTypeAny) + ' | null'
  } else if (schema instanceof z.ZodArray) {
    return `Array<${schemaHint(schema.element as z.ZodTypeAny)}>`
  } else if (schema instanceof z.ZodDefault) {
    return (
      schemaHint(schema.removeDefault() as z.ZodTypeAny) +
      ` = ${
        safeJSONStringify(schema._def.defaultValue()) ??
        javascriptStringify(schema._def.defaultValue())
      }`
    )
  }
  return ''
}

/** Prepare env for parsing into nested json from simple values */
function unflattenEnv(
  env: Record<string, string | undefined>,
  {separator}: {separator: string},
) {
  const nested = {}
  // Sorting keys such that we set the deepest paths first
  // So plaid="" will always override plaid.client_id="id..."
  for (const [key, v] of sort(R.toPairs(env)).desc(([k]) => k.length)) {
    // Remove empty strings...
    setAt(
      nested,
      key.split(separator).join('.'),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      (typeof v === 'string' ? v.trim() : v) || undefined,
    )
  }
  return nested
}

// MARK: - Unsafe env access

/** Do not use together with webpack Define plugin (including NEXT_PUBLIC_...) */
export function getEnvVars(): Record<string, string | undefined> {
  return (
    (typeof window !== 'undefined' && window.localStorage) ||
    (typeof process !== 'undefined' && process.env) ||
    {}
  )
}

/** Do not use together with webpack Define plugin (including NEXT_PUBLIC_...) */
export function getEnvVar(
  key: string,
  opts?: {json?: false; required?: false},
): string | undefined
export function getEnvVar(
  key: string,
  opts?: {json?: false; required: true},
): string
export function getEnvVar(
  key: string,
  opts: {json: true; required?: false},
): JsonValue | undefined
export function getEnvVar(
  key: string,
  opts: {json: true; required: true},
): JsonValue
export function getEnvVar(
  key: string,
  opts?: {json?: boolean; required?: boolean},
): JsonValue | undefined {
  const ret = R.pipe(
    getEnvVars()[key] ?? undefined,
    (val) => (opts?.json ? safeJSONParse(val) : val) as JsonValue | undefined,
  )
  if (opts?.required && ret === undefined) {
    throw new Error(`Missing required env var ${key}`)
  }
  return ret
}
