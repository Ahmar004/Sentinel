/**
 * The eleven shared components (design.md Section 8, C01-C11). Screens
 * import from here rather than reaching into individual files, so the
 * component set stays a stable surface independent of internal reshuffles.
 */
export { default as SiteMap } from './SiteMap'
export type { SiteMapProps } from './SiteMap'

export { default as CellLayer } from './CellLayer'
export type { CellLayerProps, CellGridEntry } from './CellLayer'
export type { CellFrame, CellArrow } from './cellFrame'
export { buildCellFrame, buildCellFrames } from './cellFrame'
export type { GroundExtentM } from './siteGrid'
export { groundToLatLon, siteBounds, cellBounds, cellRangeBounds, SITE_ORIGIN_LAT_LON } from './siteGrid'

export { default as RiskTimeline } from './RiskTimeline'
export type { RiskTimelineProps } from './RiskTimeline'
export type { RiskTimelinePoint } from './riskTimelineData'

export { default as AttributionChart } from './AttributionChart'
export type { AttributionChartProps } from './AttributionChart'

export { default as SuggestionList } from './SuggestionList'
export type { SuggestionListProps } from './SuggestionList'

export { default as CoverageBar } from './CoverageBar'
export type { CoverageBarProps } from './CoverageBar'

export { default as ZoneOverlay } from './ZoneOverlay'
export type { ZoneOverlayProps } from './ZoneOverlay'

export { default as Legend } from './Legend'

export { default as MapLegend } from './MapLegend'

export { default as ConnectionBanner } from './ConnectionBanner'
export type { ConnectionBannerProps } from './ConnectionBanner'

export { default as ConnectionChip } from './ConnectionChip'

export { default as FilterBar } from './FilterBar'
export type { FilterBarProps, FilterChip } from './FilterBar'

export { default as StateChip } from './StateChip'
export type { StateChipProps } from './StateChip'

export { default as RolesReference } from './RolesReference'

export { default as Dialog } from './Dialog'
export type { DialogProps } from './Dialog'

export { default as InfoPopover } from './InfoPopover'
export type { InfoPopoverProps } from './InfoPopover'

export * as Diagrams from './diagrams'

export {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_LINE_WIDTH,
  CHART_BAR_RADIUS,
  CHART_TOOLTIP_STYLE,
} from './chartTheme'
