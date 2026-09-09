import { type ReactNode } from 'react'
import type { LatLngBoundsLiteral } from 'leaflet'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { siteBounds, type GroundExtentM } from './siteGrid'

export interface SiteMapProps {
  groundExtentM: GroundExtentM
  /** The layer set - `CellLayer`, drone markers, the zone overlay, a route
   * overlay - passed as children so `S02`, replay (`S10`), setup (`S11`,
   * `S12`) and per-drone (`S07`) views each choose their own layers over
   * the same map without forking it (design.md C01). */
  children?: ReactNode
  className?: string
  /** Opens the map framed on a smaller area than the whole site, for
   * surfaces about one place rather than the environment as a whole:
   * `S04` crops to the alerting cell and its neighbourhood, `S07` to a
   * drone's footprint. Panning out to the rest of the site still works. */
  focusBounds?: LatLngBoundsLiteral
}

/** Esri World Imagery. Free to use and needs no API key and no account, so
 * it satisfies NFR8's requirement that no dependency ask for payment
 * details. Attribution is required and is rendered on the map. */
const IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const IMAGERY_ATTRIBUTION =
  'Imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community'

/**
 * design.md C01. Satellite imagery of the monitored environment, with the
 * cell grid and every other layer drawn over real coordinates.
 *
 * The map projects in Leaflet's default web mercator rather than the flat
 * `CRS.Simple` space an uploaded plan image used, because tiles are
 * georeferenced and the grid has to land on the actual ground. Everything
 * still converts through `siteGrid`, so no layer derives its own mapping.
 *
 * Imagery is fetched at run time. With no connection the tiles do not
 * arrive and the map reads as empty behind the overlay, which is honest:
 * the cell data is still live and still drawn, and nothing pretends to be
 * ground that could not be loaded.
 */
export default function SiteMap({ groundExtentM, children, className, focusBounds }: SiteMapProps) {
  const bounds = siteBounds(groundExtentM)

  return (
    <div className={className ?? 'size-full'}>
      <MapContainer
        bounds={focusBounds ?? bounds}
        maxBounds={bounds}
        maxBoundsViscosity={0.5}
        minZoom={15}
        maxZoom={19}
        zoomSnap={0.25}
        className="size-full bg-surface-sunken"
      >
        <TileLayer url={IMAGERY_URL} attribution={IMAGERY_ATTRIBUTION} maxNativeZoom={19} maxZoom={19} />
        {children}
      </MapContainer>
    </div>
  )
}
