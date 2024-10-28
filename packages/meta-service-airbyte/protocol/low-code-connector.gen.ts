/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * via https://app.quicktype.io/?l=ts
 * Generated from MIT Licensed source at https://github.com/airbytehq/airbyte/blob/master/airbyte-cdk/python/airbyte_cdk/sources/declarative/declarative_component_schema.yaml
 */

/**
 * An API source that extracts data according to its declarative components.
 */
export interface LowCodeConnector {
  check:        StreamsToCheck;
  definitions?: { [key: string]: any };
  /**
   * For internal Airbyte use only - DO NOT modify manually. Used by consumers of declarative
   * manifests for storing related metadata.
   */
  metadata?: { [key: string]: any };
  schemas?:  { [key: string]: any };
  spec?:     Spec;
  streams:   DeclarativeStream[];
  type:      LowCodeConnectorType;
  version:   string;
}

/**
* Defines the streams to try reading when running a check operation.
*/
export interface StreamsToCheck {
  /**
   * Names of the streams to try reading from when running a check operation.
   */
  stream_names: string[];
  type:         CheckType;
  [property: string]: any;
}

export type CheckType = "CheckStream";

/**
* A source specification made up of connector metadata and how it can be configured.
*/
export interface Spec {
  /**
   * Advanced specification for configuring the authentication flow.
   */
  advanced_auth?: AuthFlow;
  /**
   * A connection specification describing how a the connector can be configured.
   */
  connection_specification: { [key: string]: any };
  /**
   * URL of the connector's documentation page.
   */
  documentation_url?: string;
  type:               SpecType;
  [property: string]: any;
}

/**
* Advanced specification for configuring the authentication flow.
*
* Additional and optional specification object to describe what an 'advanced' Auth flow
* would need to function.
* - A connector should be able to fully function with the configuration as described by the
* ConnectorSpecification in a 'basic' mode.
* - The 'advanced' mode provides easier UX for the user with UI improvements and
* automations. However, this requires further setup on the
* server side by instance or workspace admins beforehand. The trade-off is that the user
* does not have to provide as many technical
* inputs anymore and the auth process is faster and easier to complete.
*/
export interface AuthFlow {
  /**
   * The type of auth to use
   */
  auth_flow_type?:             AuthFlowType;
  oauth_config_specification?: OAuthConfigSpecification;
  /**
   * JSON path to a field in the connectorSpecification that should exist for the advanced
   * auth to be applicable.
   */
  predicate_key?: string[];
  /**
   * Value of the predicate_key fields for the advanced auth to be applicable.
   */
  predicate_value?: string;
  [property: string]: any;
}

/**
* The type of auth to use
*/
export type AuthFlowType = "oauth2.0" | "oauth1.0";

/**
* Specification describing how an 'advanced' Auth flow would need to function.
*/
export interface OAuthConfigSpecification {
  /**
   * OAuth specific blob. This is a Json Schema used to validate Json configurations produced
   * by the OAuth flows as they are
   * returned by the distant OAuth APIs.
   * Must be a valid JSON describing the fields to merge back to
   * `ConnectorSpecification.connectionSpecification`.
   * For each field, a special annotation `path_in_connector_config` can be specified to
   * determine where to merge it,
   * Examples:
   * complete_oauth_output_specification={
   * refresh_token: {
   * type: string,
   * path_in_connector_config: ['credentials', 'refresh_token']
   * }
   * }
   */
  complete_oauth_output_specification?: { [key: string]: any };
  /**
   * OAuth specific blob. This is a Json Schema used to validate Json configurations persisted
   * as Airbyte Server configurations.
   * Must be a valid non-nested JSON describing additional fields configured by the Airbyte
   * Instance or Workspace Admins to be used by the
   * server when completing an OAuth flow (typically exchanging an auth code for refresh
   * token).
   * Examples:
   * complete_oauth_server_input_specification={
   * client_id: {
   * type: string
   * },
   * client_secret: {
   * type: string
   * }
   * }
   */
  complete_oauth_server_input_specification?: { [key: string]: any };
  /**
   * OAuth specific blob. This is a Json Schema used to validate Json configurations persisted
   * as Airbyte Server configurations that
   * also need to be merged back into the connector configuration at runtime.
   * This is a subset configuration of `complete_oauth_server_input_specification` that
   * filters fields out to retain only the ones that
   * are necessary for the connector to function with OAuth. (some fields could be used during
   * oauth flows but not needed afterwards, therefore
   * they would be listed in the `complete_oauth_server_input_specification` but not
   * `complete_oauth_server_output_specification`)
   * Must be a valid non-nested JSON describing additional fields configured by the Airbyte
   * Instance or Workspace Admins to be used by the
   * connector when using OAuth flow APIs.
   * These fields are to be merged back to `ConnectorSpecification.connectionSpecification`.
   * For each field, a special annotation `path_in_connector_config` can be specified to
   * determine where to merge it,
   * Examples:
   * complete_oauth_server_output_specification={
   * client_id: {
   * type: string,
   * path_in_connector_config: ['credentials', 'client_id']
   * },
   * client_secret: {
   * type: string,
   * path_in_connector_config: ['credentials', 'client_secret']
   * }
   * }
   */
  complete_oauth_server_output_specification?: { [key: string]: any };
  /**
   * OAuth specific blob. This is a Json Schema used to validate Json configurations used as
   * input to OAuth.
   * Must be a valid non-nested JSON that refers to properties from
   * ConnectorSpecification.connectionSpecification
   * using special annotation 'path_in_connector_config'.
   * These are input values the user is entering through the UI to authenticate to the
   * connector, that might also shared
   * as inputs for syncing data via the connector.
   * Examples:
   * if no connector values is shared during oauth flow,
   * oauth_user_input_from_connector_config_specification=[]
   * if connector values such as 'app_id' inside the top level are used to generate the API
   * url for the oauth flow,
   * oauth_user_input_from_connector_config_specification={
   * app_id: {
   * type: string
   * path_in_connector_config: ['app_id']
   * }
   * }
   * if connector values such as 'info.app_id' nested inside another object are used to
   * generate the API url for the oauth flow,
   * oauth_user_input_from_connector_config_specification={
   * app_id: {
   * type: string
   * path_in_connector_config: ['info', 'app_id']
   * }
   * }
   */
  oauth_user_input_from_connector_config_specification?: { [key: string]: any };
  [property: string]: any;
}

export type SpecType = "Spec";

/**
* Partition router component whose behavior is derived from a custom code implementation of
* the connector.
*
* A Partition router that specifies a list of attributes where each attribute describes a
* portion of the complete data set for a stream. During a sync, each value is iterated over
* and can be used as input to outbound API requests.
*
* Partition router that is used to retrieve records that have been partitioned according to
* records from the specified parent streams. An example of a parent stream is automobile
* brands and the substream would be the various car models associated with each branch.
*/
export interface PartitionRouter {
  $parameters?: { [key: string]: any };
  /**
   * Fully-qualified name of the class that will be implementing the custom partition router.
   * The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  type:        PartitionRouterType;
  /**
   * While iterating over list values, the name of field used to reference a list value. The
   * partition value can be accessed with string interpolation. e.g. "{{
   * stream_partition['my_key'] }}" where "my_key" is the value of the cursor_field.
   */
  cursor_field?: string;
  /**
   * A request option describing where the list value should be injected into and under what
   * field name if applicable.
   */
  request_option?: RequestOption;
  /**
   * The list of attributes being iterated over and used as input for the requests made to the
   * source API.
   */
  values?: string[] | string;
  /**
   * Specifies which parent streams are being iterated over and how parent records should be
   * used to partition the child stream data set.
   */
  parent_stream_configs?: ParentStreamConfig[];
  [property: string]: any;
}

/**
* Describes how to construct partitions from the records retrieved from the parent stream..
*/
export interface ParentStreamConfig {
  $parameters?: { [key: string]: any };
  /**
   * The primary key of records from the parent stream that will be used during the retrieval
   * of records for the current substream. This parent identifier field is typically a
   * characteristic of the child records being extracted from the source API.
   */
  parent_key: string;
  /**
   * While iterating over parent records during a sync, the parent_key value can be referenced
   * by using this field.
   */
  partition_field: string;
  /**
   * A request option describing where the parent key value should be injected into and under
   * what field name if applicable.
   */
  request_option?: RequestOption;
  /**
   * Reference to the parent stream.
   */
  stream: DeclarativeStream;
  type:   ParentStreamConfigType;
  [property: string]: any;
}

/**
* Partition router component whose behavior is derived from a custom code implementation of
* the connector.
*
* A Partition router that specifies a list of attributes where each attribute describes a
* portion of the complete data set for a stream. During a sync, each value is iterated over
* and can be used as input to outbound API requests.
*
* Partition router that is used to retrieve records that have been partitioned according to
* records from the specified parent streams. An example of a parent stream is automobile
* brands and the substream would be the various car models associated with each branch.
*/
export interface PartitionRouterElement {
  $parameters?: { [key: string]: any };
  /**
   * Fully-qualified name of the class that will be implementing the custom partition router.
   * The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  type:        PartitionRouterType;
  /**
   * While iterating over list values, the name of field used to reference a list value. The
   * partition value can be accessed with string interpolation. e.g. "{{
   * stream_partition['my_key'] }}" where "my_key" is the value of the cursor_field.
   */
  cursor_field?: string;
  /**
   * A request option describing where the list value should be injected into and under what
   * field name if applicable.
   */
  request_option?: RequestOption;
  /**
   * The list of attributes being iterated over and used as input for the requests made to the
   * source API.
   */
  values?: string[] | string;
  /**
   * Specifies which parent streams are being iterated over and how parent records should be
   * used to partition the child stream data set.
   */
  parent_stream_configs?: ParentStreamConfig[];
  [property: string]: any;
}

/**
* Component used to coordinate how records are extracted across stream slices and request
* pages.
*
* Retriever component whose behavior is derived from a custom code implementation of the
* connector.
*
* Retrieves records by synchronously sending requests to fetch records. The retriever acts
* as an orchestrator between the requester, the record selector, the paginator, and the
* partition router.
*/
export interface Retriever {
  $parameters?: { [key: string]: any };
  /**
   * Fully-qualified name of the class that will be implementing the custom retriever
   * strategy. The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  type:        RetrieverType;
  /**
   * Paginator component that describes how to navigate through the API's pages.
   */
  paginator?: DefaultPaginator;
  /**
   * PartitionRouter component that describes how to partition the stream, enabling
   * incremental syncs and checkpointing.
   */
  partition_router?: PartitionRouterElement[] | PartitionRouter;
  /**
   * Component that describes how to extract records from a HTTP response.
   */
  record_selector?: RecordSelector;
  /**
   * Requester component that describes how to prepare HTTP requests to send to the source API.
   */
  requester?: Requester;
  [property: string]: any;
}

/**
* A stream whose behavior is described by a set of declarative low code components.
*
* Reference to the parent stream.
*/
export interface DeclarativeStream {
  $parameters?: { [key: string]: any };
  /**
   * Component used to fetch data incrementally based on a time field in the data.
   */
  incremental_sync?: IncrementalSync;
  /**
   * The stream name.
   */
  name?: string;
  /**
   * The primary key of the stream.
   */
  primary_key?: Array<string[] | string> | string;
  /**
   * Component used to coordinate how records are extracted across stream slices and request
   * pages.
   */
  retriever: Retriever;
  /**
   * Component used to retrieve the schema for the current stream.
   */
  schema_loader?: SchemaLoader;
  /**
   * A list of transformations to be applied to each output record.
   */
  transformations?: Transformation[];
  type:             StreamType;
  [property: string]: any;
}

/**
* Optionally configures how the end datetime will be sent in requests to the source API.
*
* Specifies the key field and where in the request a component's value should be injected.
*
* Optionally configures how the start datetime will be sent in requests to the source API.
*
* A request option describing where the list value should be injected into and under what
* field name if applicable.
*
* A request option describing where the parent key value should be injected into and under
* what field name if applicable.
*
* Configure how the API Key will be sent in requests to the source API. Either inject_into
* or header has to be defined.
*
* Configure how the API Key will be sent in requests to the source API.
*/
export interface RequestOption {
  /**
   * Configures which key should be used in the location that the descriptor is being injected
   * into
   */
  field_name: string;
  /**
   * Configures where the descriptor should be set on the HTTP requests. Note that request
   * parameters that are already encoded in the URL path will not be duplicated.
   */
  inject_into: InjectInto;
  type:        EndTimeOptionType;
  [property: string]: any;
}

/**
* Configures where the descriptor should be set on the HTTP requests. Note that request
* parameters that are already encoded in the URL path will not be duplicated.
*/
export type InjectInto = "request_parameter" | "header" | "body_data" | "body_json";

export type EndTimeOptionType = "RequestOption";

export type PartitionRouterType = "CustomPartitionRouter" | "ListPartitionRouter" | "SubstreamPartitionRouter";

export type ParentStreamConfigType = "ParentStreamConfig";

/**
* Paginator component that describes how to navigate through the API's pages.
*
* Default pagination implementation to request pages of results with a fixed size until the
* pagination strategy no longer returns a next_page_token.
*
* Pagination implementation that never returns a next page.
*/
export interface DefaultPaginator {
  $parameters?: { [key: string]: any };
  /**
   * Component decoding the response so records can be extracted.
   */
  decoder?:           JSONDecoder;
  page_size_option?:  RequestOption;
  page_token_option?: Request;
  /**
   * Strategy defining how records are paginated.
   */
  pagination_strategy?: PaginationStrategy;
  type:                 PaginatorType;
  [property: string]: any;
}

/**
* Component decoding the response so records can be extracted.
*/
export interface JSONDecoder {
  type: DecoderType;
  [property: string]: any;
}

export type DecoderType = "JsonDecoder";

/**
* Optionally configures how the end datetime will be sent in requests to the source API.
*
* Specifies the key field and where in the request a component's value should be injected.
*
* Optionally configures how the start datetime will be sent in requests to the source API.
*
* A request option describing where the list value should be injected into and under what
* field name if applicable.
*
* A request option describing where the parent key value should be injected into and under
* what field name if applicable.
*
* Configure how the API Key will be sent in requests to the source API. Either inject_into
* or header has to be defined.
*
* Configure how the API Key will be sent in requests to the source API.
*
* Specifies where in the request path a component's value should be inserted.
*/
export interface Request {
  /**
   * Configures which key should be used in the location that the descriptor is being injected
   * into
   */
  field_name?: string;
  /**
   * Configures where the descriptor should be set on the HTTP requests. Note that request
   * parameters that are already encoded in the URL path will not be duplicated.
   */
  inject_into?: InjectInto;
  type:         PageTokenOptionType;
  [property: string]: any;
}

export type PageTokenOptionType = "RequestOption" | "RequestPath";

/**
* Strategy defining how records are paginated.
*
* Pagination strategy that evaluates an interpolated string to define the next page to
* fetch.
*
* Pagination strategy component whose behavior is derived from a custom code implementation
* of the connector.
*
* Pagination strategy that returns the number of records reads so far and returns it as the
* next page token.
*
* Pagination strategy that returns the number of pages reads so far and returns it as the
* next page token.
*/
export interface PaginationStrategy {
  $parameters?: { [key: string]: any };
  /**
   * Value of the cursor defining the next page to fetch.
   */
  cursor_value?: string;
  /**
   * Component decoding the response so records can be extracted.
   */
  decoder?: JSONDecoder;
  /**
   * The number of records to include in each pages.
   */
  page_size?: number | string;
  /**
   * Template string evaluating when to stop paginating.
   */
  stop_condition?: string;
  type:            PaginationStrategyType;
  /**
   * Fully-qualified name of the class that will be implementing the custom pagination
   * strategy. The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  /**
   * Using the `offset` with value `0` during the first request
   *
   * Using the `page number` with value defined by `start_from_page` during the first request
   */
  inject_on_first_request?: boolean;
  /**
   * Index of the first page to request.
   */
  start_from_page?: number;
  [property: string]: any;
}

export type PaginationStrategyType = "CursorPagination" | "CustomPaginationStrategy" | "OffsetIncrement" | "PageIncrement";

export type PaginatorType = "DefaultPaginator" | "NoPagination";

/**
* Component that describes how to extract records from a HTTP response.
*
* Responsible for translating an HTTP response into a list of records by extracting records
* from the response and optionally filtering records based on a heuristic.
*/
export interface RecordSelector {
  $parameters?: { [key: string]: any };
  extractor:    Extractor;
  /**
   * Responsible for filtering records to be emitted by the Source.
   */
  record_filter?: RecordFilter;
  type:           RecordSelectorType;
  [property: string]: any;
}

/**
* Record extractor component whose behavior is derived from a custom code implementation of
* the connector.
*
* Record extractor that searches a decoded response over a path defined as an array of
* fields.
*/
export interface Extractor {
  $parameters?: { [key: string]: any };
  /**
   * Fully-qualified name of the class that will be implementing the custom record extraction
   * strategy. The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  type:        ExtractorType;
  /**
   * Component decoding the response so records can be extracted.
   */
  decoder?: JSONDecoder;
  /**
   * List of potentially nested fields describing the full path of the field to extract. Use
   * "*" to extract all values from an array. See more info in the
   * [docs](https://docs.airbyte.com/connector-development/config-based/understanding-the-yaml-file/record-selector).
   */
  field_path?: string[];
  [property: string]: any;
}

export type ExtractorType = "CustomRecordExtractor" | "DpathExtractor";

/**
* Responsible for filtering records to be emitted by the Source.
*
* Filter applied on a list of records.
*/
export interface RecordFilter {
  $parameters?: { [key: string]: any };
  /**
   * The predicate to filter a record. Records will be removed if evaluated to False.
   */
  condition?: string;
  type:       RecordFilterType;
  [property: string]: any;
}

export type RecordFilterType = "RecordFilter";

export type RecordSelectorType = "RecordSelector";

/**
* Requester component that describes how to prepare HTTP requests to send to the source
* API.
*
* Requester component whose behavior is derived from a custom code implementation of the
* connector.
*
* Requester submitting HTTP requests and extracting records from the response.
*
* Description of the request to perform to obtain a session token to perform data requests.
* The response body is expected to be a JSON object with a session token property.
*/
export interface Requester {
  $parameters?: { [key: string]: any };
  /**
   * Fully-qualified name of the class that will be implementing the custom requester
   * strategy. The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  type:        RequesterType;
  /**
   * Authentication method to use for requests sent to the API.
   */
  authenticator?: Authenticator;
  /**
   * Error handler component that defines how to handle errors.
   */
  error_handler?: ErrorHandler;
  /**
   * The HTTP method used to fetch data from the source (can be GET or POST).
   */
  http_method?: string;
  /**
   * Path the specific API endpoint that this stream represents. Do not put sensitive
   * information (e.g. API tokens) into this field - Use the Authentication component for this.
   */
  path?: string;
  /**
   * Specifies how to populate the body of the request with a non-JSON payload. Plain text
   * will be sent as is, whereas objects will be converted to a urlencoded form.
   */
  request_body_data?: { [key: string]: string } | string;
  /**
   * Specifies how to populate the body of the request with a JSON payload. Can contain nested
   * objects.
   */
  request_body_json?: { [key: string]: any } | string;
  /**
   * Return any non-auth headers. Authentication headers will overwrite any overlapping
   * headers returned from this method.
   */
  request_headers?: { [key: string]: string } | string;
  /**
   * Specifies the query parameters that should be set on an outgoing HTTP request given the
   * inputs.
   */
  request_parameters?: { [key: string]: string } | string;
  /**
   * Base URL of the API source. Do not put sensitive information (e.g. API tokens) into this
   * field - Use the Authentication component for this.
   */
  url_base?: string;
  [property: string]: any;
}

/**
* Requester submitting HTTP requests and extracting records from the response.
*
* Description of the request to perform to obtain a session token to perform data requests.
* The response body is expected to be a JSON object with a session token property.
*/
export interface HTTPRequester {
  $parameters?: { [key: string]: any };
  /**
   * Authentication method to use for requests sent to the API.
   */
  authenticator?: Authenticator;
  /**
   * Error handler component that defines how to handle errors.
   */
  error_handler?: ErrorHandler;
  /**
   * The HTTP method used to fetch data from the source (can be GET or POST).
   */
  http_method?: string;
  /**
   * Path the specific API endpoint that this stream represents. Do not put sensitive
   * information (e.g. API tokens) into this field - Use the Authentication component for this.
   */
  path: string;
  /**
   * Specifies how to populate the body of the request with a non-JSON payload. Plain text
   * will be sent as is, whereas objects will be converted to a urlencoded form.
   */
  request_body_data?: { [key: string]: string } | string;
  /**
   * Specifies how to populate the body of the request with a JSON payload. Can contain nested
   * objects.
   */
  request_body_json?: { [key: string]: any } | string;
  /**
   * Return any non-auth headers. Authentication headers will overwrite any overlapping
   * headers returned from this method.
   */
  request_headers?: { [key: string]: string } | string;
  /**
   * Specifies the query parameters that should be set on an outgoing HTTP request given the
   * inputs.
   */
  request_parameters?: { [key: string]: string } | string;
  type:                LoginRequesterType;
  /**
   * Base URL of the API source. Do not put sensitive information (e.g. API tokens) into this
   * field - Use the Authentication component for this.
   */
  url_base: string;
  [property: string]: any;
}

/**
* Authentication method to use for requests sent to the API.
*
* Authenticator for requests authenticated with an API token injected as an HTTP request
* header.
*
* Authenticator for requests authenticated with the Basic HTTP authentication scheme, which
* encodes a username and an optional password in the Authorization request header.
*
* Authenticator for requests authenticated with a bearer token injected as a request header
* of the form `Authorization: Bearer <token>`.
*
* Authenticator component whose behavior is derived from a custom code implementation of
* the connector.
*
* Authenticator for requests using OAuth 2.0 authorization flow.
*
* Authenticator for requests requiring no authentication.
*
* Deprecated - use SessionTokenAuthenticator instead. Authenticator for requests
* authenticated using session tokens. A session token is a random value generated by a
* server to identify a specific user for the duration of one interaction session.
*/
export interface Authenticator {
  $parameters?: { [key: string]: any };
  /**
   * The API key to inject in the request. Fill it in the user inputs.
   *
   * Token to inject as request header for authenticating with the API.
   */
  api_token?: string;
  /**
   * The name of the HTTP header that will be set to the API key. This setting is deprecated,
   * use inject_into instead. Header and inject_into can not be defined at the same time.
   *
   * The name of the session token header that will be injected in the request
   */
  header?: string;
  /**
   * Configure how the API Key will be sent in requests to the source API. Either inject_into
   * or header has to be defined.
   */
  inject_into?: RequestOption;
  type:         AuthenticatorType;
  /**
   * The password that will be combined with the username, base64 encoded and used to make
   * requests. Fill it in the user inputs.
   *
   * Password used to authenticate and obtain a session token
   */
  password?: string;
  /**
   * The username that will be combined with the password, base64 encoded and used to make
   * requests. Fill it in the user inputs.
   *
   * Username used to authenticate and obtain a session token
   */
  username?: string;
  /**
   * Fully-qualified name of the class that will be implementing the custom authentication
   * strategy. Has to be a sub class of DeclarativeAuthenticator. The format is
   * `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  /**
   * The name of the property which contains the access token in the response from the token
   * refresh endpoint.
   */
  access_token_name?: string;
  /**
   * The OAuth client ID. Fill it in the user inputs.
   */
  client_id?: string;
  /**
   * The OAuth client secret. Fill it in the user inputs.
   */
  client_secret?: string;
  /**
   * The name of the property which contains the expiry date in the response from the token
   * refresh endpoint.
   */
  expires_in_name?: string;
  /**
   * Specifies the OAuth2 grant type. If set to refresh_token, the refresh_token needs to be
   * provided as well. For client_credentials, only client id and secret are required. Other
   * grant types are not officially supported.
   */
  grant_type?: string;
  /**
   * Body of the request sent to get a new access token.
   */
  refresh_request_body?: { [key: string]: any };
  /**
   * Credential artifact used to get a new access token.
   */
  refresh_token?: string;
  /**
   * When the token updater is defined, new refresh tokens, access tokens and the access token
   * expiry date are written back from the authentication response to the config object. This
   * is important if the refresh token can only used once.
   */
  refresh_token_updater?: any[] | boolean | number | number | null | TokenUpdaterObject | string;
  /**
   * List of scopes that should be granted to the access token.
   */
  scopes?: string[];
  /**
   * The access token expiry date.
   */
  token_expiry_date?: string;
  /**
   * The format of the time to expiration datetime. Provide it if the time is returned as a
   * date-time string instead of seconds.
   */
  token_expiry_date_format?: string;
  /**
   * The full URL to call to obtain a new access token.
   */
  token_refresh_endpoint?: string;
  /**
   * The duration in ISO 8601 duration notation after which the session token expires,
   * starting from the time it was obtained. Omitting it will result in the session token
   * being refreshed for every request.
   */
  expiration_duration?: string;
  /**
   * Description of the request to perform to obtain a session token to perform data requests.
   * The response body is expected to be a JSON object with a session token property.
   */
  login_requester?: HTTPRequester;
  /**
   * Authentication method to use for requests sent to the API, specifying how to inject the
   * session token.
   */
  request_authentication?: any[] | boolean | number | null | APIKeyAuthenticator | string;
  /**
   * The path in the response body returned from the login requester to the session token.
   */
  session_token_path?: string[];
  /**
   * Path of the login URL (do not include the base URL)
   */
  login_url?: string;
  /**
   * Session token to use if using a pre-defined token. Not needed if authenticating with
   * username + password pair
   */
  session_token?: string;
  /**
   * Name of the key of the session token to be extracted from the response
   */
  session_token_response_key?: string;
  /**
   * Path of the URL to use to validate that the session token is valid (do not include the
   * base URL)
   */
  validate_session_url?: string;
  [property: string]: any;
}

/**
* Error handler component that defines how to handle errors.
*
* Component defining how to handle errors. Default behavior includes only retrying server
* errors (HTTP 5XX) and too many requests (HTTP 429) with an exponential backoff.
*
* Error handler component whose behavior is derived from a custom code implementation of
* the connector.
*
* Error handler that sequentially iterates over a list of error handlers.
*/
export interface ErrorHandler {
  $parameters?: { [key: string]: any };
  /**
   * List of backoff strategies to use to determine how long to wait before retrying a
   * retryable request.
   */
  backoff_strategies?: BackoffStrategy[];
  /**
   * The maximum number of time to retry a retryable request before giving up and failing.
   */
  max_retries?: number;
  /**
   * List of response filters to iterate on when deciding how to handle an error. When using
   * an array of multiple filters, the filters will be applied sequentially and the response
   * will be selected if it matches any of the filter's predicate.
   */
  response_filters?: HTTPResponseFilter[];
  type:              ErrorHandlerTypeEnum;
  /**
   * Fully-qualified name of the class that will be implementing the custom error handler. The
   * format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  /**
   * List of error handlers to iterate on to determine how to handle a failed response.
   */
  error_handlers?: ErrorHandlerElement[];
  [property: string]: any;
}

/**
* Backoff strategy with a constant backoff interval.
*
* Backoff strategy component whose behavior is derived from a custom code implementation of
* the connector.
*
* Backoff strategy with an exponential backoff interval. The interval is defined as factor
* * 2^attempt_count.
*
* Extract wait time from a HTTP header in the response.
*
* Extract time at which we can retry the request from response header and wait for the
* difference between now and that time.
*/
export interface BackoffStrategy {
  $parameters?: { [key: string]: any };
  /**
   * Backoff time in seconds.
   */
  backoff_time_in_seconds?: number | string;
  type:                     BackoffStrategyType;
  /**
   * Fully-qualified name of the class that will be implementing the custom backoff strategy.
   * The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  /**
   * Multiplicative constant applied on each retry.
   */
  factor?: number | string;
  /**
   * The name of the response header defining how long to wait before retrying.
   */
  header?: string;
  /**
   * Optional regex to apply on the header to extract its value. The regex should define a
   * capture group defining the wait time.
   */
  regex?: string;
  /**
   * Minimum time to wait before retrying.
   */
  min_wait?: number | string;
  [property: string]: any;
}

export type BackoffStrategyType = "ConstantBackoffStrategy" | "CustomBackoffStrategy" | "ExponentialBackoffStrategy" | "WaitTimeFromHeader" | "WaitUntilTimeFromHeader";

/**
* Error handler that sequentially iterates over a list of error handlers.
*
* Component defining how to handle errors. Default behavior includes only retrying server
* errors (HTTP 5XX) and too many requests (HTTP 429) with an exponential backoff.
*/
export interface ErrorHandlerElement {
  $parameters?: { [key: string]: any };
  /**
   * List of error handlers to iterate on to determine how to handle a failed response.
   */
  error_handlers?: ErrorHandlerElement[];
  type:            ErrorHandlerType;
  /**
   * List of backoff strategies to use to determine how long to wait before retrying a
   * retryable request.
   */
  backoff_strategies?: BackoffStrategy[];
  /**
   * The maximum number of time to retry a retryable request before giving up and failing.
   */
  max_retries?: number;
  /**
   * List of response filters to iterate on when deciding how to handle an error. When using
   * an array of multiple filters, the filters will be applied sequentially and the response
   * will be selected if it matches any of the filter's predicate.
   */
  response_filters?: HTTPResponseFilter[];
  [property: string]: any;
}

/**
* A filter that is used to select on properties of the HTTP response received. When used
* with additional filters, a response will be selected if it matches any of the filter's
* criteria.
*/
export interface HTTPResponseFilter {
  $parameters?: { [key: string]: any };
  /**
   * Action to execute if a response matches the filter.
   */
  action: Action;
  /**
   * Error Message to display if the response matches the filter.
   */
  error_message?: string;
  /**
   * Match the response if its error message contains the substring.
   */
  error_message_contains?: string;
  /**
   * Match the response if its HTTP code is included in this list.
   */
  http_codes?: number[];
  /**
   * Match the response if the predicate evaluates to true.
   */
  predicate?: string;
  type:       ResponseFilterType;
  [property: string]: any;
}

/**
* Action to execute if a response matches the filter.
*/
export type Action = "SUCCESS" | "FAIL" | "RETRY" | "IGNORE";

export type ResponseFilterType = "HttpResponseFilter";

export type ErrorHandlerType = "CompositeErrorHandler" | "DefaultErrorHandler";

export type ErrorHandlerTypeEnum = "DefaultErrorHandler" | "CustomErrorHandler" | "CompositeErrorHandler";

export type LoginRequesterType = "HttpRequester";

export interface TokenUpdaterObject {
  /**
   * Config path to the access token. Make sure the field actually exists in the config.
   */
  access_token_config_path?: string[];
  /**
   * Config path to the access token. Make sure the field actually exists in the config.
   */
  refresh_token_config_path?: string[];
  /**
   * The name of the property which contains the updated refresh token in the response from
   * the token refresh endpoint.
   */
  refresh_token_name?: string;
  /**
   * Config path to the expiry date. Make sure actually exists in the config.
   */
  token_expiry_date_config_path?: string[];
  [property: string]: any;
}

/**
* Authenticator for requests using the session token as an API key that's injected into the
* request.
*/
export interface APIKeyAuthenticator {
  /**
   * Configure how the API Key will be sent in requests to the source API.
   */
  inject_into?: RequestOption;
  type:         APIKeyAuthenticatorType;
  [property: string]: any;
}

export type APIKeyAuthenticatorType = "ApiKey" | "Bearer";

export type AuthenticatorType = "ApiKeyAuthenticator" | "BasicHttpAuthenticator" | "BearerAuthenticator" | "CustomAuthenticator" | "OAuthAuthenticator" | "NoAuth" | "SessionTokenAuthenticator" | "LegacySessionTokenAuthenticator";

export type RequesterType = "CustomRequester" | "HttpRequester";

export type RetrieverType = "CustomRetriever" | "SimpleRetriever";

/**
* Component used to fetch data incrementally based on a time field in the data.
*
* Incremental component whose behavior is derived from a custom code implementation of the
* connector.
*
* Cursor to provide incremental capabilities over datetime.
*/
export interface IncrementalSync {
  $parameters?: { [key: string]: any };
  /**
   * Fully-qualified name of the class that will be implementing the custom incremental sync.
   * The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  /**
   * The location of the value on a record that will be used as a bookmark during sync.
   *
   * The location of the value on a record that will be used as a bookmark during sync. To
   * ensure no data loss, the API must return records in ascending order based on the cursor
   * field. Nested fields are not supported, so the field must be at the top level of the
   * record. You can use a combination of Add Field and Remove Field transformations to move
   * the nested field to the top.
   */
  cursor_field: string;
  type:         IncrementalSyncType;
  /**
   * The possible formats for the cursor field, in order of preference. The first format that
   * matches the cursor field value will be used to parse it. If not provided, the
   * `datetime_format` will be used.
   */
  cursor_datetime_formats?: string[];
  /**
   * Smallest increment the datetime_format has (ISO 8601 duration) that is used to ensure the
   * start of a slice does not overlap with the end of the previous one, e.g. for %Y-%m-%d the
   * granularity should be P1D, for %Y-%m-%dT%H:%M:%SZ the granularity should be PT1S. Given
   * this field is provided, `step` needs to be provided as well.
   */
  cursor_granularity?: string;
  /**
   * The datetime format used to format the datetime values that are sent in outgoing requests
   * to the API. Use placeholders starting with "%" to describe the format the API is using.
   * The following placeholders are available:
   * * **%s**: Epoch unix timestamp - `1686218963`
   * * **%ms**: Epoch unix timestamp (milliseconds) - `1686218963123`
   * * **%a**: Weekday (abbreviated) - `Sun`
   * * **%A**: Weekday (full) - `Sunday`
   * * **%w**: Weekday (decimal) - `0` (Sunday), `6` (Saturday)
   * * **%d**: Day of the month (zero-padded) - `01`, `02`, ..., `31`
   * * **%b**: Month (abbreviated) - `Jan`
   * * **%B**: Month (full) - `January`
   * * **%m**: Month (zero-padded) - `01`, `02`, ..., `12`
   * * **%y**: Year (without century, zero-padded) - `00`, `01`, ..., `99`
   * * **%Y**: Year (with century) - `0001`, `0002`, ..., `9999`
   * * **%H**: Hour (24-hour, zero-padded) - `00`, `01`, ..., `23`
   * * **%I**: Hour (12-hour, zero-padded) - `01`, `02`, ..., `12`
   * * **%p**: AM/PM indicator
   * * **%M**: Minute (zero-padded) - `00`, `01`, ..., `59`
   * * **%S**: Second (zero-padded) - `00`, `01`, ..., `59`
   * * **%f**: Microsecond (zero-padded to 6 digits) - `000000`
   * * **%z**: UTC offset - `(empty)`, `+0000`, `-04:00`
   * * **%Z**: Time zone name - `(empty)`, `UTC`, `GMT`
   * * **%j**: Day of the year (zero-padded) - `001`, `002`, ..., `366`
   * * **%U**: Week number of the year (starting Sunday) - `00`, ..., `53`
   * * **%W**: Week number of the year (starting Monday) - `00`, ..., `53`
   * * **%c**: Date and time - `Tue Aug 16 21:30:00 1988`
   * * **%x**: Date standard format - `08/16/1988`
   * * **%X**: Time standard format - `21:30:00`
   * * **%%**: Literal '%' character
   *
   * Some placeholders depend on the locale of the underlying system - in most cases this
   * locale is configured as en/US. For more information see the [Python
   * documentation](https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes).
   */
  datetime_format?: string;
  /**
   * The datetime that determines the last record that should be synced. If not provided, `{{
   * now_utc() }}` will be used.
   */
  end_datetime?: MinMaxDatetime | string;
  /**
   * Optionally configures how the end datetime will be sent in requests to the source API.
   */
  end_time_option?: RequestOption;
  /**
   * A data feed API is an API that does not allow filtering and paginates the content from
   * the most recent to the least recent. Given this, the CDK needs to know when to stop
   * paginating and this field will generate a stop condition for pagination.
   */
  is_data_feed?: boolean;
  /**
   * Time interval before the start_datetime to read data for, e.g. P1M for looking back one
   * month.
   */
  lookback_window?: string;
  /**
   * Name of the partition start time field.
   */
  partition_field_end?: string;
  /**
   * Name of the partition end time field.
   */
  partition_field_start?: string;
  /**
   * The datetime that determines the earliest record that should be synced.
   */
  start_datetime?: MinMaxDatetime | string;
  /**
   * Optionally configures how the start datetime will be sent in requests to the source API.
   */
  start_time_option?: RequestOption;
  /**
   * The size of the time window (ISO8601 duration). Given this field is provided,
   * `cursor_granularity` needs to be provided as well.
   */
  step?: string;
  [property: string]: any;
}

/**
* Compares the provided date against optional minimum or maximum times. The max_datetime
* serves as the ceiling and will be returned when datetime exceeds it. The min_datetime
* serves as the floor.
*/
export interface MinMaxDatetime {
  $parameters?: { [key: string]: any };
  /**
   * Datetime value.
   */
  datetime: string;
  /**
   * Format of the datetime value. Defaults to "%Y-%m-%dT%H:%M:%S.%f%z" if left empty. Use
   * placeholders starting with "%" to describe the format the API is using. The following
   * placeholders are available:
   * * **%s**: Epoch unix timestamp - `1686218963`
   * * **%ms**: Epoch unix timestamp - `1686218963123`
   * * **%a**: Weekday (abbreviated) - `Sun`
   * * **%A**: Weekday (full) - `Sunday`
   * * **%w**: Weekday (decimal) - `0` (Sunday), `6` (Saturday)
   * * **%d**: Day of the month (zero-padded) - `01`, `02`, ..., `31`
   * * **%b**: Month (abbreviated) - `Jan`
   * * **%B**: Month (full) - `January`
   * * **%m**: Month (zero-padded) - `01`, `02`, ..., `12`
   * * **%y**: Year (without century, zero-padded) - `00`, `01`, ..., `99`
   * * **%Y**: Year (with century) - `0001`, `0002`, ..., `9999`
   * * **%H**: Hour (24-hour, zero-padded) - `00`, `01`, ..., `23`
   * * **%I**: Hour (12-hour, zero-padded) - `01`, `02`, ..., `12`
   * * **%p**: AM/PM indicator
   * * **%M**: Minute (zero-padded) - `00`, `01`, ..., `59`
   * * **%S**: Second (zero-padded) - `00`, `01`, ..., `59`
   * * **%f**: Microsecond (zero-padded to 6 digits) - `000000`, `000001`, ..., `999999`
   * * **%z**: UTC offset - `(empty)`, `+0000`, `-04:00`
   * * **%Z**: Time zone name - `(empty)`, `UTC`, `GMT`
   * * **%j**: Day of the year (zero-padded) - `001`, `002`, ..., `366`
   * * **%U**: Week number of the year (Sunday as first day) - `00`, `01`, ..., `53`
   * * **%W**: Week number of the year (Monday as first day) - `00`, `01`, ..., `53`
   * * **%c**: Date and time representation - `Tue Aug 16 21:30:00 1988`
   * * **%x**: Date representation - `08/16/1988`
   * * **%X**: Time representation - `21:30:00`
   * * **%%**: Literal '%' character
   *
   * Some placeholders depend on the locale of the underlying system - in most cases this
   * locale is configured as en/US. For more information see the [Python
   * documentation](https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes).
   */
  datetime_format?: string;
  /**
   * Ceiling applied on the datetime value. Must be formatted with the datetime_format field.
   */
  max_datetime?: string;
  /**
   * Floor applied on the datetime value. Must be formatted with the datetime_format field.
   */
  min_datetime?: string;
  type:          MinMaxDatetimeType;
  [property: string]: any;
}

export type MinMaxDatetimeType = "MinMaxDatetime";

export type IncrementalSyncType = "CustomIncrementalSync" | "DatetimeBasedCursor";

/**
* Component used to retrieve the schema for the current stream.
*
* Loads a schema that is defined directly in the manifest file.
*
* Loads the schema from a json file.
*/
export interface SchemaLoader {
  /**
   * Describes a streams' schema. Refer to the <a
   * href="https://docs.airbyte.com/understanding-airbyte/supported-data-types/">Data Types
   * documentation</a> for more details on which types are valid.
   */
  schema?:      { [key: string]: any };
  type:         SchemaLoaderType;
  $parameters?: { [key: string]: any };
  /**
   * Path to the JSON file defining the schema. The path is relative to the connector module's
   * root.
   */
  file_path?: string;
  [property: string]: any;
}

export type SchemaLoaderType = "InlineSchemaLoader" | "JsonFileSchemaLoader";

/**
* Transformation which adds field to an output record. The path of the added field can be
* nested.
*
* Transformation component whose behavior is derived from a custom code implementation of
* the connector.
*
* A transformation which removes fields from a record. The fields removed are designated
* using FieldPointers. During transformation, if a field or any of its parents does not
* exist in the record, no error is thrown.
*/
export interface Transformation {
  $parameters?: { [key: string]: any };
  /**
   * List of transformations (path and corresponding value) that will be added to the record.
   */
  fields?: DefinitionOfFieldToAdd[];
  type:    TransformationType;
  /**
   * Fully-qualified name of the class that will be implementing the custom transformation.
   * The format is `source_<name>.<package>.<class_name>`.
   */
  class_name?: string;
  /**
   * Array of paths defining the field to remove. Each item is an array whose field describe
   * the path of a field to remove.
   */
  field_pointers?: Array<string[] | boolean | number | number | { [key: string]: any } | null | string>;
  [property: string]: any;
}

/**
* Defines the field to add on a record.
*/
export interface DefinitionOfFieldToAdd {
  $parameters?: { [key: string]: any };
  /**
   * List of strings defining the path where to add the value on the record.
   */
  path: string[];
  type: FieldType;
  /**
   * Value of the new field. Use {{ record['existing_field'] }} syntax to refer to other
   * fields in the record.
   */
  value: string;
  /**
   * Type of the value. If not specified, the type will be inferred from the value.
   */
  value_type?: ValueType;
  [property: string]: any;
}

export type FieldType = "AddedFieldDefinition";

/**
* Type of the value. If not specified, the type will be inferred from the value.
*
* A schema type.
*/
export type ValueType = "string" | "number" | "integer" | "boolean";

export type TransformationType = "AddFields" | "CustomTransformation" | "RemoveFields";

export type StreamType = "DeclarativeStream";

export type LowCodeConnectorType = "DeclarativeSource";
