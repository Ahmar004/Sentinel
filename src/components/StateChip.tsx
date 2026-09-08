import ConnectionChip from './ConnectionChip'
import {
  type StateChipProps,
  OBSERVATION_STATE_LABEL,
  OBSERVATION_STATE_TOKEN,
  RISK_BAND_LABEL,
  RISK_BAND_TOKEN,
  DRONE_STATE_LABEL,
  DRONE_STATE_TOKEN,
  DRONE_LINK_LABEL,
  DRONE_LINK_TOKEN,
  ALERT_STATUS_LABEL,
  ALERT_STATUS_TOKEN,
  SUGGESTION_STATUS_LABEL,
  SUGGESTION_STATUS_TOKEN,
  OUTCOME_VERDICT_LABEL,
  OUTCOME_VERDICT_TOKEN,
} from './stateChipLabels'

export type { StateChipProps } from './stateChipLabels'

function Dot({ token }: { token: string }) {
  return <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: token }} />
}

function Chip({ label, token }: { label: string; token: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap">
      <Dot token={token} />
      {label}
    </span>
  )
}

/**
 * design.md C10 - the single renderer of every domain status string
 * (observation state, risk band, drone state, drone link, alert status,
 * suggestion status, outcome verdict, connection state). `kind` selects
 * which enum the `value` belongs to; TypeScript narrows `value` to match,
 * so a caller cannot pass a `RiskBand` under `kind: 'droneState'` by
 * mistake. Label and colour tables live in `./stateChipLabels`.
 *
 * `connectionState` delegates to `ConnectionChip` rather than re-styling
 * the same fact a second way (CLAUDE.md: reuse, do not duplicate).
 */
export default function StateChip(props: StateChipProps) {
  switch (props.kind) {
    case 'observationState':
      return <Chip label={OBSERVATION_STATE_LABEL[props.value]} token={OBSERVATION_STATE_TOKEN[props.value]} />
    case 'riskBand':
      return <Chip label={RISK_BAND_LABEL[props.value]} token={RISK_BAND_TOKEN[props.value]} />
    case 'droneState':
      return <Chip label={DRONE_STATE_LABEL[props.value]} token={DRONE_STATE_TOKEN[props.value]} />
    case 'droneLink':
      return <Chip label={DRONE_LINK_LABEL[props.value]} token={DRONE_LINK_TOKEN[props.value]} />
    case 'alertStatus':
      return <Chip label={ALERT_STATUS_LABEL[props.value]} token={ALERT_STATUS_TOKEN[props.value]} />
    case 'suggestionStatus':
      return <Chip label={SUGGESTION_STATUS_LABEL[props.value]} token={SUGGESTION_STATUS_TOKEN[props.value]} />
    case 'outcomeVerdict':
      return <Chip label={OUTCOME_VERDICT_LABEL[props.value]} token={OUTCOME_VERDICT_TOKEN[props.value]} />
    case 'connectionState':
      return <ConnectionChip state={props.value} />
  }
}
