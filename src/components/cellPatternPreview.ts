import type { CSSProperties } from 'react'
import type { CellPattern } from '@/theme/cellTreatment'

/**
 * A static CSS approximation of the hatch patterns `CellLayer` draws on
 * canvas, for use in swatches (`Legend`) that never need to redraw at
 * 1 Hz. `var(--color-ink-muted)` is understood natively by the browser's
 * CSS engine here, unlike the canvas 2D context `cellCanvasDraw.ts` has to
 * resolve by hand.
 */
export function patternSwatchStyle(pattern: CellPattern): CSSProperties {
  const line = 'var(--color-ink-muted)'
  switch (pattern) {
    case 'solid':
      return {}
    case 'diagonal-hatch':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${line} 0, ${line} 1px, transparent 1px, transparent 7px)` }
    case 'cross-hatch':
      return {
        backgroundImage: [
          `repeating-linear-gradient(45deg, ${line} 0, ${line} 1px, transparent 1px, transparent 6px)`,
          `repeating-linear-gradient(-45deg, ${line} 0, ${line} 1px, transparent 1px, transparent 6px)`,
        ].join(', '),
      }
    case 'dense-cross-hatch':
      return {
        backgroundImage: [
          `repeating-linear-gradient(45deg, ${line} 0, ${line} 1px, transparent 1px, transparent 3px)`,
          `repeating-linear-gradient(-45deg, ${line} 0, ${line} 1px, transparent 1px, transparent 3px)`,
        ].join(', '),
      }
  }
}
