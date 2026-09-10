/**
 * Drone state decides the output. Observe produces density, flow and risk;
 * Transit produces density only, because flow from a moving camera is
 * unreliable and risk needs a full dwell window. Replaces part of the
 * transit explanation on the per-drone view.
 */
export function DroneStateDiagram({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 460 160"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <title>
        Drone state decides the output: Observe produces density, flow and risk; Transit produces density only
      </title>
      <defs>
        <marker id="dronestate-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-ink-muted)" />
        </marker>
      </defs>

      <rect x={12} y={24} width={180} height={112} rx={6} fill="var(--color-surface-sunken)" stroke="var(--color-status-online)" strokeWidth={2} />
      <text x={102} y={46} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--color-ink)">
        Observe
      </text>
      <text x={102} y={72} textAnchor="middle" fontSize="12" fill="var(--color-ink)">
        density
      </text>
      <text x={102} y={92} textAnchor="middle" fontSize="12" fill="var(--color-ink)">
        flow
      </text>
      <text x={102} y={112} textAnchor="middle" fontSize="12" fill="var(--color-ink)">
        risk
      </text>

      <rect x={268} y={24} width={180} height={112} rx={6} fill="var(--color-surface-sunken)" stroke="var(--color-border)" strokeWidth={2} />
      <text x={358} y={46} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--color-ink)">
        Transit
      </text>
      <text x={358} y={72} textAnchor="middle" fontSize="12" fill="var(--color-ink)">
        density only
      </text>
      <text x={358} y={98} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
        flow and risk:
      </text>
      <text x={358} y={116} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
        not enough dwell
      </text>

      <line x1={196} y1={70} x2={264} y2={70} stroke="var(--color-ink-muted)" strokeWidth={2} markerEnd="url(#dronestate-arrow)" />
      <line x1={264} y1={94} x2={196} y2={94} stroke="var(--color-ink-muted)" strokeWidth={2} markerEnd="url(#dronestate-arrow)" />
      <text x={230} y={58} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
        moves
      </text>
      <text x={230} y={112} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
        arrives
      </text>
    </svg>
  )
}
