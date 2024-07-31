import { MixpanelDestination } from "@evefan/evefan-config";
import { Connector } from "..";
import { WorkerConfig } from "../../config";
import { DestinationEvent } from "../../event";
import { mapKeys } from "../../utils";
import { FanOutResult } from "../../writer";

/**
 *
    time: new Date(event._timestamp).getTime(),
    $insert_id: event.eventn_ctx_event_id || context.event_id,
    $current_url: context.url,
    $referrer: context.referer,
    $referring_domain: refDomain,
    $identified_id: user.id || user.internal_id || user.email,
    $anon_id: user.anonymous_id || user.hashed_anonymous_id,
    $distinct_id:
        user.id || user.internal_id ||
        user.email ||
        user.anonymous_id ||
        user.hashed_anonymous_id,
    distinct_id:
        user.id || user.internal_id ||
        user.email ||
        user.anonymous_id ||
        user.hashed_anonymous_id,
    $email: user.email,
    ip: event.source_ip,
    $browser: ua.ua_family,
    $browser_version: ua.ua_version,
    $os: ua.os_family,
    $city: location.city,
    $region: location.region,
    $country_code: location.country,
    mp_country_code: location.country,
    $screen_width: context.screen_resolution?.split("x")[0],
    $screen_height: context.screen_resolution?.split("x")[1],
    utm_medium: utm.medium,
    utm_source: utm.source,
    utm_campaign: utm.campaign,
    utm_content: utm.content,
    utm_term: utm.term,
    Revenue: conversion.revenue || event.revenue,
 * 
 * */

// Get this from mixpanel.com/settings/project

interface MixpanelResponse {
  code: number;
  num_records_imported: number;
  status: string;
  error?: string;
  failed_records?: Array<{
    index: number;
    $insert_id: string;
    field: string;
    message: string;
  }>;
}

export class MixpanelConnector implements Connector {
  private transformTraits(traitsObj: object): object {
    var reservedTraitAlias = {
      created: "$created",
      email: "$email",
      avatar: "$avatar",
      firstName: "$first_name",
      lastName: "$last_name",
      lastSeen: "$last_seen",
      name: "$name",
      username: "$username",
      phone: "$phone",
      //rest same - event the reserved ones below
      plan: "plan",
      birthday: "birthday",
      company: "company",
      age: "age",
      logins: "logins",
      gender: "gender",
      id: "id",
      website: "website",
      address: "address",
      createdAt: "createdAt",
      description: "description",
    };

    return mapKeys(reservedTraitAlias, traitsObj);
  }

  // in mixpanel all the custom properties just go one after the other.

  private transformEvent(event: DestinationEvent): object {
    let eventToSend = {};
    let properties = {
      ...event.extraParams.campaign,
      ...event.extraParams.context,
      time: new Date(event.timestamp).getTime(),
      distinct_id: event.userId || event.anonymousId,
      $anon_id: event.anonymousId,
      $insert_id: event.messageId,
      //$timezone add if possible
      $city: event.location.city,
      $region: event.location.region,
      $country_code: event.location.country,
      mp_country_code: event.location.country,
      $browser: event.useragent.browser_family,
      $browser_version: event.useragent.browser_family,
      $os: event.useragent.os_family,
      utm_medium: event.context.campaign ? event.context.campaign.medium : null,
      utm_source: event.context.campaign ? event.context.campaign.source : null,
      utm_campaign: event.context.campaign ? event.context.campaign.name : null,
      utm_content: event.context.campaign
        ? event.context.campaign.content
        : null,
      utm_term: event.context.campaign ? event.context.campaign.term : null,
    };
    if (event.userId) {
      (properties as any)["$identified_id"] = event.userId;
      //only send identified id if there is a userId
    }

    if (event.type === "page" || event.type === "screen") {
      eventToSend = {
        event: "page_view",
        properties: properties,
      };
    } else if (event.type === "track") {
      eventToSend = {
        event: event.event,
        properties: properties,
      };
    } else if (event.type === "identify") {
      //add traits here
      const transformedTraits = this.transformTraits(event.traits);
      properties = {
        ...transformedTraits,
        ...properties,
      };
      eventToSend = {
        event: "$identify",
        properties: properties,
      };
    } else {
      throw new Error(`Unknown Event type ${(event as any).type}`);
    }

    return eventToSend;
  }

  async write(
    config: WorkerConfig,
    events: DestinationEvent[]
  ): Promise<FanOutResult> {
    console.log("Sending events to Mixpanel");
    const mixpanelDestination = config.destinations.find(
      (d) => d.type === "mixpanel"
    ) as MixpanelDestination;

    if (!mixpanelDestination) {
      console.error("Could not find mixpanel Config");
      return {
        destinationType: "mixpanel",
        failedEvents: events.map((e) => ({
          error: "Destination config not found",
          body: e,
        })),
      };
    }

    try {
      const transformedEvents = events.map(this.transformEvent);

      const failedEvents = await fetch(
        `https://api.mixpanel.com/import?strict=${mixpanelDestination.config.strict}&project_id=${mixpanelDestination.config.projectId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " +
              btoa(mixpanelDestination.config._secret_credentials.token + ":"),
          },
          method: "POST",
          body: JSON.stringify(transformedEvents),
        }
      )
        .then((res) => res.json() as Promise<MixpanelResponse>)
        .then((res: MixpanelResponse) => {
          if (
            res.code !== 200 ||
            res.status?.toLowerCase() !== "success" ||
            res.num_records_imported !== transformedEvents.length
          ) {
            console.error("Mixpanel error", res);
            if (res.failed_records && res.failed_records.length > 0) {
              return res.failed_records.map((r) => ({
                body: events[r.index],
                error: r.message,
              }));
            }
            return events.map((e) => ({
              body: e,
              error: "Unknown mixpanel processing error",
            }));
          }
          return [];
        });

      return {
        destinationType: "mixpanel",
        failedEvents,
      };
    } catch (error) {
      return {
        destinationType: "mixpanel",
        failedEvents: events.map((e) => ({
          // @ts-ignore
          error: error?.message || "Unknown error",
          body: e,
        })),
      };
    }
  }
}
