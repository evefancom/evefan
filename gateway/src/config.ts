import { Connector, loadConnector } from './connectors';
import configJson from './../config.json';
import { Config, Destination, DestinationType } from '@evefan/evefan-config';

export type GatewayConfig = Omit<Config, 'destinations'> & {
  destinations: Array<
    Destination<DestinationType, any> & { handler: Connector }
  >;
};

let config: GatewayConfig;

export async function getConfig(): Promise<GatewayConfig> {
  // cache it for the lifetime of the gateway
  if (config) {
    return config;
  }

  config = configJson as unknown as GatewayConfig;
  const handlerPromises = config.destinations.map(async (destination) => {
    try {
      const handler = (await loadConnector(destination.type)) as unknown as {
        default: new () => Connector;
      };
      return { ...destination, handler: new handler.default() };
    } catch (error) {
      console.error(`Failed to load handler for ${destination.type}:`, error);
      return { ...destination, handler: null };
    }
  });

  // @ts-expect-error
  config.destinations = await Promise.all(handlerPromises);
  return config;
}
