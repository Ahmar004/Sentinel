import { SUGGESTION_ACTION, SAFEGUARD_CHECK, TEXT_SOURCE, type SuggestionAction, type SafeguardCheck, type TextSource } from '@/domain/constants'

export const SUGGESTION_ACTION_LABEL: Record<SuggestionAction, string> = {
  [SUGGESTION_ACTION.DIVERT]: 'Divert',
  [SUGGESTION_ACTION.HOLD_AND_METER]: 'Hold and meter',
  [SUGGESTION_ACTION.OPEN_ALTERNATE_ROUTE]: 'Open alternate route',
  [SUGGESTION_ACTION.SLOW_INFLOW]: 'Slow inflow',
}

export const SAFEGUARD_CHECK_LABEL: Record<SafeguardCheck, string> = {
  [SAFEGUARD_CHECK.OVER_THRESHOLD_CELL]: 'Route passes through an over-threshold cell',
  [SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER]: 'Would push a neighbouring cell over its threshold',
  [SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE]: 'A cell on the route is stale',
  [SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE]: 'A cell on the route has never been observed',
  [SAFEGUARD_CHECK.EXIT_OVER_CAPACITY]: 'Target exit is over capacity',
}

export const TEXT_SOURCE_LABEL: Record<TextSource, string> = {
  [TEXT_SOURCE.MODEL]: 'Model-generated phrasing',
  [TEXT_SOURCE.TEMPLATE]: 'Template phrasing',
}
