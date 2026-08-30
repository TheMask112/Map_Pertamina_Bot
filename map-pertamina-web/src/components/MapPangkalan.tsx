'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPangkalanProps {
  telemetryData: any[];
}

export default function MapPangkalan({ telemetryData }: MapPangkalanProps) {
  // Pusat peta di Indonesia
  const [center] = useState<[number, number]>([-2.5489, 118.0149]);
  const [zoom] = useState(5);

  const validLocations = telemetryData.filter(t => t.latitude && t.longitude);

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validLocations.map((t, i) => (
          <Marker key={i} position={[t.latitude, t.longitude]}>
            <Popup>
              <div style={{ color: '#000' }}>
                <strong style={{ fontSize: '1.1rem' }}>{t.merchant_name || t.owner_name}</strong><br/>
                <span>Agen: {t.agent_name}</span><br/>
                <span>Kuota: {t.kuota_pertamina_bulanan} tabung</span><br/>
                <span style={{ color: t.sisa_kuota_pertamina < 150 ? 'red' : 'green' }}>Sisa: {t.sisa_kuota_pertamina}</span><br/>
                <hr style={{ margin: '5px 0' }}/>
                <small>Hardware: {t.ram_usage_mb ? `${t.ram_usage_mb} MB RAM` : 'Unknown'} | Ping: {t.ping_ms || '?'} ms</small>
              </div>
            </Popup>
            <Circle 
              center={[t.latitude, t.longitude]} 
              radius={Number(t.kuota_pertamina_bulanan) * 2} // Radius map logic based on volume
              pathOptions={{ fillColor: 'red', color: 'red', fillOpacity: 0.2 }}
            />
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
