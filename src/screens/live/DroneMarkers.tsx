import { CircleMarker, Polygon, Tooltip } from 'react-leaflet'
import { DRONE_LINK, DRONE_STATE } from '@/domain/constants'
import type { DroneUpdate } from '@/domain/types'
import { footprintCentroid, footprintOutline } from './droneGeometry'

export interface DroneMarkersProps {
  drones: DroneUpdate[]
  onSelect?: (droneId: string) => void
}

const LINK_TOKEN: Record<string, string> = {
  [DRONE_LINK.ONLINE]: 'var(--color-status-online)',
  [DRONE_LINK.DEGRADED]: 'var(--color-status-degraded)',
  [DRONE_LINK.OFFLINE]: 'var(--color-status-offline)',
}

export default function DroneMarkers({ drones, onSelect }: DroneMarkersProps) {
  return (
    <>
      {drones.map((drone) => {
        const centre = footprintCentroid(drone.footprintCells)
        if (!centre) return null
        const colour = LINK_TOKEN[drone.link] ?? 'var(--color-accent)'
        const transiting = drone.state === DRONE_STATE.TRANSIT

        return (
          <div key={drone.droneId}>
            <Polygon
              positions={footprintOutline(drone.footprintCells)}
              pathOptions={{ color: colour, weight: 1, fillOpacity: 0, dashArray: transiting ? '4 4' : undefined }}
              interactive={false}
            />
            <CircleMarker
              center={centre}
              radius={7}
              pathOptions={{ color: colour, fillColor: colour, fillOpacity: transiting ? 0.35 : 0.85, weight: 2 }}
              eventHandlers={onSelect ? { click: () => onSelect(drone.droneId) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <span className="text-xs">
                  {drone.droneId} - {transiting ? 'in transit, density only' : 'observing'} - battery{' '}
                  {drone.batteryPct} percent - link {drone.link.toLowerCase()}
                </span>
              </Tooltip>
            </CircleMarker>
          </div>
        )
      })}
    </>
  )
}
