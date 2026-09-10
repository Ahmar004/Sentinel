import { OBSERVATION_STATE, RISK_BAND, type RiskBand } from '@/domain/constants'
import type { CellObservation } from '@/domain/types'
import { getCellTreatment } from '@/theme/cellTreatment'
import { OBSERVATION_STATE_LABEL, RISK_BAND_LABEL } from './stateChipLabels'
import { patternSwatchStyle } from './cellPatternPreview'

const SAMPLE_DENSITY = 2.5

const OBSERVATION_STATE_SAMPLES: CellObservation[] = [
  {
    observationState: OBSERVATION_STATE.OBSERVED,
    densityPerSqM: SAMPLE_DENSITY,
    flow: null,
    risk: { score: 0.2, band: RISK_BAND.NORMAL },
    dwellMs: 30_000,
  },
  { observationState: OBSERVATION_STATE.NOT_ENOUGH_DWELL, densityPerSqM: SAMPLE_DENSITY, flow: null, risk: null, dwellMs: 12_000 },
  { observationState: OBSERVATION_STATE.STALE, densityPerSqM: SAMPLE_DENSITY, flow: null, risk: null, ageMs: 6_000 },
  { observationState: OBSERVATION_STATE.GAP, densityPerSqM: null, flow: null, risk: null },
]

const RISK_BANDS: RiskBand[] = [RISK_BAND.NORMAL, RISK_BAND.WATCH, RISK_BAND.ELEVATED, RISK_BAND.CRITICAL]

function FillPatternSwatch({ observation }: { observation: CellObservation }) {
  const treatment = getCellTreatment(observation)
  return (
    <span
      aria-hidden="true"
      className="inline-block size-5 shrink-0 rounded border border-border"
      style={{ backgroundColor: treatment.fillToken, ...patternSwatchStyle(treatment.pattern) }}
    />
  )
}

function OutlineSwatch({ band }: { band: RiskBand }) {
  const treatment = getCellTreatment({
    observationState: OBSERVATION_STATE.OBSERVED,
    densityPerSqM: SAMPLE_DENSITY,
    flow: null,
    risk: { score: 0.5, band },
    dwellMs: 30_000,
  })
  const outline = treatment.outline
  return (
    <span
      aria-hidden="true"
      className="relative inline-block size-5 shrink-0 rounded"
      style={{
        backgroundColor: treatment.fillToken,
        borderColor: outline?.colorToken,
        borderWidth: outline?.widthPx,
        borderStyle: outline?.style === 'double' ? 'double' : outline?.style,
      }}
    >
      {outline?.innerRing && (
        <span
          className="absolute inset-1 rounded-sm border"
          style={{ borderColor: outline.colorToken }}
        />
      )}
    </span>
  )
}

/**
 * design.md C07. Eight treatments in total, shown as two independent
 * groups rather than one 4x4 cross-product table, because the two visual
 * channels are independent facts (wireframes.md Section 2): the four
 * observation-state fill-and-pattern treatments, and the four risk-band
 * outline treatments drawn only when a cell is `OBSERVED`.
 */
export default function Legend() {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <section>
        <h3 className="mb-1.5 font-semibold text-ink-muted uppercase tracking-wide">Observation state</h3>
        <ul className="flex flex-col gap-1.5">
          {OBSERVATION_STATE_SAMPLES.map((sample) => (
            <li key={sample.observationState} className="flex items-center gap-2">
              <FillPatternSwatch observation={sample} />
              {OBSERVATION_STATE_LABEL[sample.observationState]}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1.5 font-semibold text-ink-muted uppercase tracking-wide">Risk band</h3>
        <p className="mb-1.5 text-xs text-ink-muted">Drawn only when a cell is observed.</p>
        <ul className="flex flex-col gap-1.5">
          {RISK_BANDS.map((band) => (
            <li key={band} className="flex items-center gap-2">
              <OutlineSwatch band={band} />
              {RISK_BAND_LABEL[band]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
