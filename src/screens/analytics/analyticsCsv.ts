import type { AnalyticsSummary } from '@/domain/types'

/** The token written wherever a figure has no data behind it. Deliberately
 * a word and never an empty cell or a zero: a spreadsheet reader must be
 * able to tell "nothing was measured" from "the measurement was zero" just
 * as clearly as someone reading the screen (FR11.3). */
export const NO_DATA = 'no data'

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function row(cells: (string | number)[]): string {
  return cells.map((c) => escapeCell(String(c))).join(',')
}

/**
 * The current analytics range as CSV, generated in the browser.
 *
 * No hosted export service is used, because every one of them requires
 * payment details and NFR8 forbids that. A Blob and an object URL do the
 * whole job with no network call at all, which also means the export
 * cannot leak crowd data to a third party.
 */
export function analyticsToCsv(summary: AnalyticsSummary, zoneNames: Readonly<Record<string, string>>): string {
  const lines: string[] = []

  lines.push(row(['Sentinel analytics export']))
  lines.push(row(['Site', summary.siteId]))
  lines.push(row(['From', summary.from]))
  lines.push(row(['To', summary.to]))
  lines.push('')

  lines.push(row(['Alerts by zone']))
  lines.push(row(['Zone', 'Alerts', 'Share of range observed']))
  for (const zone of summary.alertsByZone) {
    lines.push(
      row([
        zoneNames[zone.zoneId] ?? zone.zoneId,
        zone.count === null ? NO_DATA : zone.count,
        `${Math.round(zone.observedShareOfRange * 100)}%`,
      ]),
    )
  }
  lines.push('')

  lines.push(row(['Coordinator response time']))
  if (summary.responseTime === null) {
    lines.push(row(['Alerts raised', NO_DATA]))
  } else {
    lines.push(row(['Alerts raised', summary.responseTime.raised]))
    lines.push(row(['Acknowledged', summary.responseTime.acknowledged]))
    lines.push(row(['Median seconds', summary.responseTime.medianMs === null ? NO_DATA : summary.responseTime.medianMs / 1000]))
    lines.push(row(['95th percentile seconds', summary.responseTime.p95Ms === null ? NO_DATA : summary.responseTime.p95Ms / 1000]))
  }
  lines.push('')

  lines.push(row(['Suggestion acknowledgement']))
  if (summary.acknowledgementRate === null) {
    lines.push(row(['Suggestions issued', NO_DATA]))
  } else {
    lines.push(row(['Issued', summary.acknowledgementRate.issued]))
    lines.push(row(['Confirmed', summary.acknowledgementRate.confirmed]))
    lines.push(row(['Dismissed', summary.acknowledgementRate.dismissed]))
    lines.push(row(['Expired', summary.acknowledgementRate.expired]))
  }
  lines.push('')

  lines.push(row(['Outcome verdicts']))
  if (summary.verdicts === null) {
    lines.push(row(['Confirmed suggestions', NO_DATA]))
  } else {
    for (const [verdict, count] of Object.entries(summary.verdicts)) {
      lines.push(row([verdict, count]))
    }
  }

  return lines.join('\n')
}

/** Percentage of issued suggestions that were confirmed, or null when none
 * was issued. Null rather than 0: nobody ignoring a suggestion and no
 * suggestion existing are different findings (FR11.3). */
export function acknowledgementPercent(summary: AnalyticsSummary): number | null {
  const rate = summary.acknowledgementRate
  if (rate === null || rate.issued === 0) return null
  return Math.round((rate.confirmed / rate.issued) * 100)
}
