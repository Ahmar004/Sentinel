/**
 * The three stampede precursors as small annotated sketches, so an alert
 * surface can show what "flow convergence" means rather than define it in
 * a sentence. Arrows are the accent token, the counter-flow boundary the
 * elevated-risk token.
 */
export function PrecursorDiagram({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 600 170"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <title>Three stampede precursors: flow convergence, counter-flow, and stop-start pulses</title>
      <defs>
        <marker id="precursor-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-accent)" />
        </marker>
      </defs>

      {/* Flow convergence */}
      <g stroke="var(--color-accent)" strokeWidth={3} markerEnd="url(#precursor-arrow)">
        <line x1="20" y1="20" x2="88" y2="58" />
        <line x1="180" y1="20" x2="112" y2="58" />
        <line x1="20" y1="112" x2="88" y2="74" />
        <line x1="180" y1="112" x2="112" y2="74" />
      </g>
      <circle cx="100" cy="66" r="6" fill="var(--color-risk-elevated)" />
      <text x="100" y="150" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-ink)">
        Flow convergence
      </text>

      {/* Counter-flow */}
      <line x1="300" y1="18" x2="300" y2="116" stroke="var(--color-risk-elevated)" strokeWidth={2} strokeDasharray="4 3" />
      <g stroke="var(--color-accent)" strokeWidth={3} markerEnd="url(#precursor-arrow)">
        <line x1="222" y1="46" x2="290" y2="46" />
        <line x1="222" y1="88" x2="290" y2="88" />
        <line x1="378" y1="46" x2="310" y2="46" />
        <line x1="378" y1="88" x2="310" y2="88" />
      </g>
      <text x="300" y="150" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-ink)">
        Counter-flow
      </text>

      {/* Stop-start pulses */}
      <polyline
        points="420,90 445,60 470,90 495,60 520,90 545,60 570,78"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={3}
        strokeDasharray="10 6"
        markerEnd="url(#precursor-arrow)"
      />
      <text x="500" y="150" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-ink)">
        Stop-start pulses
      </text>
    </svg>
  )
}
