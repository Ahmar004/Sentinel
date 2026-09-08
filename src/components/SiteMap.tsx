import { useEffect, useState, type ReactNode } from 'react'
import { CRS } from 'leaflet'
import { MapContainer, ImageOverlay } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { siteBounds, type GroundExtentM } from './siteGrid'

export interface SiteMapProps {
  planImageUrl: string
  groundExtentM: GroundExtentM
  /** The layer set - `CellLayer`, drone markers, a route overlay, and so
   * on - passed as children so `S02`, replay (`S10`), setup (`S11`/`S12`)
   * and per-drone (`S07`) views each choose their own layers over the same
   * map without forking it (design.md C01). */
  children?: ReactNode
  className?: string
}

type ImageStatus = 'loading' | 'ok' | 'error'

function usePlanImageStatus(url: string): ImageStatus {
  const [status, setStatus] = useState<ImageStatus>('loading')
  const [trackedUrl, setTrackedUrl] = useState(url)

  // Reset to "loading" for a new url during render, per React's documented
  // pattern for adjusting state when a prop changes, rather than calling
  // setState synchronously from inside the effect body below.
  if (url !== trackedUrl) {
    setTrackedUrl(url)
    setStatus('loading')
  }

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (!cancelled) setStatus('ok')
    }
    image.onerror = () => {
      if (!cancelled) setStatus('error')
    }
    image.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  return status
}

/**
 * design.md C01. `CRS.Simple` plus an `ImageOverlay` of the uploaded site
 * plan, never a tile provider (CLAUDE.md scope boundary: no dependency
 * needing an API key). If the plan image fails to load - notably while
 * another agent is still adding it to `public/` - the grid still renders
 * over a flat surface rather than the whole map going blank, because a
 * missing picture is not a reason to hide real cell data (honesty over
 * completeness).
 */
export default function SiteMap({ planImageUrl, groundExtentM, children, className }: SiteMapProps) {
  const imageStatus = usePlanImageStatus(planImageUrl)
  const bounds = siteBounds(groundExtentM)

  return (
    <div className={className ?? 'size-full'}>
      <MapContainer
        crs={CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={0.6}
        minZoom={-2}
        maxZoom={3}
        zoomSnap={0.25}
        className="size-full bg-surface-sunken"
        attributionControl={false}
      >
        {imageStatus === 'ok' && <ImageOverlay url={planImageUrl} bounds={bounds} />}
        {imageStatus === 'error' && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center text-xs text-ink-muted">
            Site plan image unavailable. Cell data below is still live.
          </div>
        )}
        {children}
      </MapContainer>
    </div>
  )
}
