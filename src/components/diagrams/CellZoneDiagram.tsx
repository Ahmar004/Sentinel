/**
 * Cells, zones and drones. Replaces the fleet screen's sentence that
 * drones are not assigned to zones because every measurement belongs to a
 * cell: the grid is the cells, the outline is a zone, the dashed path is a
 * drone moving between them while the readings stay put.
 */
export function CellZoneDiagram({ className }: { className?: string }) {
  const cols = 8
  const rows = 4
  const size = 44
  const originX = 12
  const originY = 12

  return (
    <svg
      role="img"
      viewBox="0 0 380 220"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <title>
        Readings are stored per cell. A zone is a named group of cells. A drone moves between cells; the readings do
        not move with it.
      </title>

      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={originX + c * size}
            y={originY + r * size}
            width={size}
            height={size}
            fill="var(--color-surface-sunken)"
            stroke="var(--color-border)"
          />
        )),
      )}

      {/* Zone: an outline over some of the cells, never a fill. */}
      <rect
        x={originX + 2 * size}
        y={originY}
        width={4 * size}
        height={2 * size}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={3}
        rx={4}
      />
      <text x={originX + 4 * size} y={originY - 2} textAnchor="middle" fontSize="12" fill="var(--color-accent)">
        Zone
      </text>

      {/* Drone crossing the zone boundary. */}
      <path
        d={`M${originX + 3 * size} ${originY + 3 * size} C ${originX + 4 * size} ${originY + size}, ${originX + 5 * size} ${originY + size}, ${originX + 6.5 * size} ${originY + 0.4 * size}`}
        fill="none"
        stroke="var(--color-ink-muted)"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <circle cx={originX + 3 * size} cy={originY + 3 * size} r={7} fill="var(--color-ink-muted)" />

      <text x={12} y={210} fontSize="12" fill="var(--color-ink-muted)">
        Every reading belongs to a cell. Drones move; readings do not.
      </text>
    </svg>
  )
}
