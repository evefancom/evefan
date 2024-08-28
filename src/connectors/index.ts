import { DestinationType } from '@evefan/evefan-config';
import { WorkerConfig } from '../config';
import { DestinationEvent } from '../event';
import { FanOutResult } from '../writer';

export interface Connector {
  write(
    config: WorkerConfig,
    events: DestinationEvent[],
    destinationType: DestinationType
  ): Promise<FanOutResult>;
}

// NOTE: DO NOT CHANGE THIS FUNCTION OR ADD A LINE TO THIS FILE.
// IT MUST BE BELOW otherwise the builds will fail

export async function loadConnector(type: string) {}
