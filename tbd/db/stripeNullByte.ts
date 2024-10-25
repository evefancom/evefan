/**
 * Workaround for postgres not accepting null byte in jsonb / json / text columns as it uses it to terminate text
 * It's a good idea to do this sanitization in the application level to reduce load on the database anyways.
 * @see https://vladimir.varank.in/notes/2021/01/you-dont-insert-unicode-null-character-as-postgres-jsonb/
 * https://github.com/sequelize/sequelize/issues/6485#issuecomment-241675496
 * https://github.com/brianc/node-postgres/issues/2080
 * https://github.com/porsager/postgres/issues/238
 */
export function stripNullByte(value: unknown) {
  if (typeof value === 'string') {
    value = value.replaceAll('\0', '')
  }

  if (Array.isArray(value)) {
    value.forEach((element: any, index: number, array: any[]) => {
      array[index] = stripNullByte(element)
    })
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      Object.assign(value, {[key]: stripNullByte(val)})
    }
  }
  return value
}
