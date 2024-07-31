import { Connector, loadConnector } from "./connectors";
import configJson from "./../config.json";
import { Config, Destination, DestinationType } from "@evefan/evefan-config";

export type WorkerConfig = Omit<Config, "destinations"> & {
  destinations: Array<
    Destination<DestinationType, any> & { handler: Connector }
  >;
};

let config: WorkerConfig;

export async function getConfig(): Promise<WorkerConfig> {
  // cache it for the lifetime of the worker
  if (config) {
    return config;
  }

  config = configJson as unknown as WorkerConfig;
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

  // @ts-ignore
  config.destinations = await Promise.all(handlerPromises);
  return config;
}
