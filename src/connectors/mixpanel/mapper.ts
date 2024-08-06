import { DestinationEvent } from '../../event';
import { propertyWithPath } from '../../utils';
import { Mapping } from './config';

const getValue = (event: DestinationEvent, sourceKeys: string | string[]) => {
  if (Array.isArray(sourceKeys) && sourceKeys.length > 0) {
    // got the possible sourceKeys
    for (const sourceKey of sourceKeys) {
      const val = propertyWithPath(event, sourceKey);
      if (val || val === false || val === 0) {
        // return only if the value is valid.
        // else look for next possible source in precedence
        return val;
      }
    }
  } else if (typeof sourceKeys === 'string') {
    // got a single key
    // - we don't need to iterate over a loop for a single possible value
    return propertyWithPath(event, sourceKeys);
  }
  return null;
};

export const constructPayload = (
  event: DestinationEvent,
  mappingSchema: Mapping[]
): Record<string, any> => {
  if (mappingSchema.length > 0) {
    const payload = {};

    mappingSchema.forEach((mapping) => {
      const { sourceKeys, destKey, required } = mapping;
      const value = getValue(event, sourceKeys);

      if (value || value === 0 || value === false) {
        if (destKey) {
          // set the value only if correct
          Object.assign(payload, { [destKey]: value });
        }
      } else if (required) {
        // throw error if required value is missing
        throw new Error(
          `Missing required value from ${JSON.stringify(sourceKeys)}`
        );
      }
    });

    return payload;
  }

  // invalid mappingSchema
  return {};
};
