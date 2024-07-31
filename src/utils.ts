/**
 * Delay the execution of the function by ms milliseconds
 * @param ms - The number of milliseconds to delay the function by
 **/
export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert all nested objects into a single level object by appending the keys with _
 * @param eventObj - The object to flatten
 * @returns The flattened object
 **/
export function flattenObject(eventObj: Record<string, any>) {
  const flattenedObj: Record<string, any> = {};
  for (const key in eventObj) {
    if (typeof eventObj[key] === "object" && eventObj[key] !== null) {
      const flatObject = flattenObject(eventObj[key]);
      for (const flatKey in flatObject) {
        flattenedObj[`${key}_${flatKey}`] = flatObject[flatKey];
      }
    } else {
      flattenedObj[key] = eventObj[key];
    }
  }
  return flattenedObj;
}

/**
 * Remove keys from an object
 * @param obj - The object to remove keys from
 * @param keysToRemove - The keys to remove
 * @returns The object with the keys removed
 **/
export function removeKeysFromObject(
  obj: Record<string, any>,
  keysToRemove: string[]
) {
  return Object.keys(obj)
    .filter((key) => !keysToRemove.includes(key))
    .reduce((acc, curr) => {
      acc[curr] = obj[curr];
      return acc;
    }, {} as Record<string, any>);
}

/**
 * Take an object and replace the keys in the keyMap with keyMap[value]
 * @param keyMap - The key map
 * @param obj - The object to map keys
 * @returns The object with the keys mapped
 **/
export function mapKeys(keyMap: Record<string, any>, obj: Record<string, any>) {
  let res: Record<string, any> = {};
  for (let key of Object.keys(obj)) {
    if (key in keyMap) {
      res[keyMap[key]] = obj[key]; //this is ES7 changes issue - will fix later
    } else {
      res[key] = obj[key];
    }
  }
  return res;
}

/**
 * Get the value of a nested object property
 * @param obj - The object to get the property from
 * @param path - The dot-separated path to the property
 * @returns The value of the property or null if it doesn't exist
 */
export function propertyWithPath(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((a, v) => (a && v in a ? a[v] : null), obj);
}
