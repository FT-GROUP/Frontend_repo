import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'

const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
})

const lugares = [
  { name: 'Medellín', position: [6.2442, -75.5812], detail: 'Gasto compartido registrado' },
  { name: 'Bello', position: [6.3373, -75.5579], detail: 'Actividad del grupo' },
  { name: 'Envigado', position: [6.1706, -75.5856], detail: 'Actividad del grupo' }
]

export default function MapView() {
  return (
    <div className="map">
      <MapContainer center={[6.24, -75.58]} zoom={11} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lugares.map(lugar => (
          <Marker key={lugar.name} position={lugar.position} icon={icon}>
            <Popup><strong>{lugar.name}</strong><br />{lugar.detail}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
