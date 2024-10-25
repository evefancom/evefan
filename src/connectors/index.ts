import { DestinationType } from '@evefan/evefan-config';
import { GatewayConfig } from '../config';
import { DestinationEvent } from '../schema/event';
import { FanOutResult } from '../writer';

export interface Connector {
  write(
    config: GatewayConfig,
    events: DestinationEvent[],
    destinationType: DestinationType
  ): Promise<FanOutResult>;
}

// NOTE: DO NOT CHANGE THIS FUNCTION OR ADD A LINE TO THIS FILE.
// IT MUST BE BELOW otherwise the builds will fail

export async function loadConnector(type: string) {}