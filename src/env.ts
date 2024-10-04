import { DestinationType } from '@evefan/evefan-config';
import { DestinationEvent } from './schema/event';
import { Batcher } from './batcher';
import { HealthChecker } from './health';

type QueueBindings = {
  [t in Uppercase<DestinationType>]: Queue<DestinationEvent>;
};

export type Bindings = {
  BATCHER: DurableObjectNamespace<Batcher>;
  HEALTH: DurableObjectNamespace<HealthChecker>;
  S3_HIVE_BUCKET: R2Bucket;
} & QueueBindings;
