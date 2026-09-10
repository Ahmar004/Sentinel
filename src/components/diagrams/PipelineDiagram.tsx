const STAGES = [
  { label: 'Perception', out: 'density, flow' },
  { label: 'Risk', out: 'score, attribution' },
  { label: 'Fusion', out: 'one shared map' },
  { label: 'Decision support', out: 'ranked options' },
]

/**
 * The four-tier pipeline as a labelled flow. Used where a header would
 * otherwise carry the same sequence in prose (S15, and the S01 context
 * panel). Colours are tokens only.
 */
export function PipelineDiagram({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 660 120"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <title>Sentinel pipeline: Perception, then Risk, then Fusion, then Decision support</title>
      <defs>
        <marker id="pipeline-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-ink-muted)" />
        </marker>
      </defs>
      {STAGES.map((stage, index) => {
        const x = 8 + index * 164
        return (
          <g key={stage.label}>
            <rect
              x={x}
              y={20}
              width={148}
              height={54}
              rx={6}
              fill="var(--color-surface-sunken)"
              stroke="var(--color-border)"
            />
            <text x={x + 74} y={44} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--color-ink)">
              {stage.label}
            </text>
            <text x={x + 74} y={62} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
              {stage.out}
            </text>
            {index < STAGES.length - 1 ? (
              <line
                x1={x + 150}
                y1={47}
                x2={x + 162}
                y2={47}
                stroke="var(--color-ink-muted)"
                strokeWidth={2}
                markerEnd="url(#pipeline-arrow)"
              />
            ) : null}
          </g>
        )
      })}
      <text x={330} y={100} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
        Each tier depends on the one before it.
      </text>
    </svg>
  )
}
