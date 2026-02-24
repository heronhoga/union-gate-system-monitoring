'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface DeviceMapProps {
  latitude: number;
  longitude: number;
  deviceName: string;
  status: 'online' | 'offline';
}

export function DeviceMap({ latitude, longitude, deviceName, status }: DeviceMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Import leaflet only on client
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });

    import('leaflet/dist/leaflet.css');
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  const statusColor = status === 'online' ? '#22c55e' : '#ef4444';
  const statusText = status === 'online' ? 'Online' : 'Offline';

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer center={[latitude, longitude]} zoom={13} className="w-full h-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="p-2">
              <p className="font-semibold text-sm">{deviceName}</p>
              <p className="text-xs text-gray-600">
                Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}
              </p>
              <p className="text-xs mt-1">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: statusColor }}
                />
                {statusText}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}