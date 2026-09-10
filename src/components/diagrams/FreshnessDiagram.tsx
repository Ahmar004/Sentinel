const SEGMENTS = [
  { label: 'fresh', x: 20, width: 200, fill: 'var(--color-status-online)' },
  { label: 'stale', x: 220, width: 180, fill: 'var(--color-obs-stale-fill)' },
  { label: 'gap', x: 400, width: 100, fill: 'var(--color-obs-gap-fill)' },
]

const TICKS = [
  { label: '0 s', x: 20 },
  { label: '2 s', x: 220 },
  { label: '10 s', x: 400 },
]

/**
 * The freshness boundaries as one axis: a cell reading is fresh to 2
 * seconds, stale to 10, then a gap. Replaces the boundary sentence in the
 * legend and the cell inspector.
 */
export function FreshnessDiagram({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 520 100"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <title>Freshness: a cell reading is fresh to 2 seconds, stale to 10 seconds, then a gap</title>
      {SEGMENTS.map((segment) => (
        <g key={segment.label}>
          <rect x={segment.x} y={34} width={segment.width} height={24} fill={segment.fill} stroke="var(--color-border)" />
          <text
            x={segment.x + segment.width / 2}
            y={50}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="var(--color-ink)"
          >
            {segment.label}
          </text>
        </g>
      ))}
      {TICKS.map((tick) => (
        <g key={tick.label}>
          <line x1={tick.x} y1={30} x2={tick.x} y2={62} stroke="var(--color-ink-muted)" strokeWidth={1} />
          <text x={tick.x} y={80} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
            {tick.label}
          </text>
        </g>
      ))}
      <text x={500} y={80} textAnchor="end" fontSize="12" fill="var(--color-ink-muted)">
        time since last update
      </text>
    </svg>
  )
}
