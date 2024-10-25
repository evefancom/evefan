declare type ISODate = string
declare type ISOTime = string
declare type ISODateTime = string
declare type ISOInterval = string

declare type Unit = _Brand<string, 'Unit'>
declare type ScheduleExpression = _Brand<string, 'ScheduleExpression'>
declare type DateRangeExpression = _Brand<string, 'DateRangeExpression'>
declare type MathExpression = _Brand<string, 'MathExpression'>
declare type MixedPrecisionDateExpression = _Brand<
  string,
  'MixedPrecisionDateExpression'
>

declare type ExternalId = _Brand<string, 'ExternalId'>
declare type DeprecatedUserId = _Brand<string, 'UserId'>
declare type DeprecatedLedgerId = _Brand<string, 'LedgerId'>
declare type AccountId = _Brand<string, 'AccountId'>
declare type CommodityId = _Brand<string, 'CommodityId'>
declare type TransactionId = _Brand<string, 'TransactionId'>
declare type PostingId = _Brand<string, 'PostingId'>

// MARK: - Utils

type _Brand<
  TBase,
  TBranding,
  TReservedName extends string = '__type__',
> = import('ts-brand').Brand<TBase, TBranding, TReservedName>
