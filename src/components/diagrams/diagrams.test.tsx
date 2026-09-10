import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { FC } from 'react'
import * as diagrams from './index'

afterEach(cleanup)

const BUILT = [
  'PipelineDiagram',
  'PrecursorDiagram',
  'FreshnessDiagram',
  'CellZoneDiagram',
  'DroneStateDiagram',
  'SafeguardDiagram',
] as const

describe('diagram components', () => {
  for (const name of BUILT) {
    it(`${name} renders an SVG with a text alternative and no literal hex`, () => {
      const Cmp = (diagrams as Record<string, FC<{ className?: string }>>)[name]
      expect(Cmp, `${name} is exported`).toBeTypeOf('function')
      const { container } = render(<Cmp />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg!.getAttribute('role')).toBe('img')
      expect((svg!.querySelector('title')?.textContent ?? '').length).toBeGreaterThan(0)
      expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}/)
      expect(container.innerHTML).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    })
  }
})
