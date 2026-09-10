const CELLS = [0, 1, 2, 3, 4]

const REJECTIONS = [
  { cell: 1, text: 'over the density threshold' },
  { cell: 2, text: 'would push a neighbour over' },
  { cell: 3, text: 'a cell on the route is stale' },
]

/**
 * The three safeguard rules that reject a suggested route, drawn against a
 * short candidate route. Replaces the safeguard list prose on the
 * suggestions screen and the confirm dialog.
 */
export function SafeguardDiagram({ className }: { className?: string }) {
  const size = 40
  const originX = 20
  const y = 30

  return (
    <svg
      role="img"
      viewBox="0 0 520 200"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <title>
        A suggested route is rejected if any cell is over the density threshold, would push a neighbour over, or is
        stale
      </title>

      {CELLS.map((c) => {
        const rejected = REJECTIONS.some((r) => r.cell === c)
        return (
          <rect
            key={c}
            x={originX + c * size}
            y={y}
            width={size}
            height={size}
            fill={rejected ? 'var(--color-risk-critical)' : 'var(--color-surface-sunken)'}
            fillOpacity={rejected ? 0.25 : 1}
            stroke={rejected ? 'var(--color-risk-critical)' : 'var(--color-border)'}
          />
        )
      })}
      <text x={originX} y={y - 8} fontSize="12" fill="var(--color-ink-muted)">
        start
      </text>
      <text x={originX + CELLS.length * size} y={y - 8} textAnchor="end" fontSize="12" fill="var(--color-ink-muted)">
        exit
      </text>

      {REJECTIONS.map((rejection, index) => {
        const cellCentre = originX + rejection.cell * size + size / 2
        const labelY = 96 + index * 30
        return (
          <g key={rejection.cell}>
            <line x1={cellCentre} y1={y + size} x2={cellCentre} y2={labelY - 10} stroke="var(--color-ink-muted)" strokeWidth={1} />
            <circle cx={cellCentre} cy={y + size} r={3} fill="var(--color-risk-critical)" />
            <text x={originX + CELLS.length * size + 12} y={labelY} fontSize="13" fill="var(--color-ink)">
              {rejection.text}
            </text>
            <text x={cellCentre} y={labelY} textAnchor="middle" fontSize="12" fill="var(--color-ink-muted)">
              {index + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
