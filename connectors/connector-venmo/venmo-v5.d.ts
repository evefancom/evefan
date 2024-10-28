/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace VenmoV5 {
  export interface GetMeResponse {
    balance: number
    cancelled: boolean
    date_created: string
    email: string
    external_id: string
    firstname: string
    has_agreed_privacy_policy: boolean
    has_agreed_user_agreement: boolean
    id: string
    is_business: boolean
    lastname: string
    name: string
    phone: string
    picture: string
    username: string
  }

  export interface GetFeedResponse {
    notification: {count: number}
    paging: {next: string; previous: string}
    balance: number
    data: FeedItem[]
  }

  /**
   * There's no single persistent ID that ties a v5 feed item to v1 story.
   * However, in practice we can use created_time, message / note,
   * actor / target, and type to correlate with near 100% accuracy between
   * `FeedItem` and `Story`
   */
  export interface FeedItem {
    payment_id: number
    /** e.g. `story/5e40603476ab3339b7a7698e` */
    permalink: string
    via: string
    action_links: ActionLinks
    /** Not the same as v1 story id.  */
    story_id: string
    comments: Comment[]
    updated_time: string
    audience: string
    actor: Actor
    transactions: Transaction[]
    /** 2019-12-14T01:50:19Z (include `Z` relative to v1 datetime format) */
    created_time: string
    mentions: any[]
    message: string
    type: string
    likes: {
      count: number
      data: Like[]
    }
  }

  export interface ActionLinks {}

  export interface Comment {
    comment_id: string
    actor: Actor
    created_time: string
    mentions: any[]
    message: string
  }

  export interface Actor {
    username: string
    picture: string
    is_business: boolean
    name: string
    firstname: string
    lastname: string
    cancelled: boolean
    date_created: string
    external_id: string
    id: string
  }

  export interface Transaction {
    amount: number
    target: Target
  }

  export interface Target {
    username: string
    picture: string
    is_business: boolean
    name: string
    firstname: string
    lastname: string
    cancelled: boolean
    date_created: string
    external_id: string
    id: string
  }

  export interface Like {
    username: string
    picture: string
    is_business: boolean
    name: string
    firstname: string
    lastname: string
    cancelled: boolean
    date_created: string
    external_id: string
    id: string
  }
}
