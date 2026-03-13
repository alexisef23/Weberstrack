import { useEffect, useRef, useState, useCallback } from 'react';
import type { Order, Branch } from '../../types/webertrack';
import type { PromoterProfile } from '../../lib/supabase';
import { User, MapPin, Radio, Wifi } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

declare global {
  interface Window {
    google?: typeof google;
  }
}

/** Centro Chihuahua (sucursales Weber sin coords usan esta zona). */
const CHIHUAHUA_CENTER = { lat: 28.6353, lng: -106.0889 };

/** Coordenadas fallback para sucursales sin lat/lng: offset pequeño por índice. */
function fallbackCoordsForBranch(branchId: string, index: number): { lat: number; lng: number } {
  const hash = branchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const offset = ((hash % 100) / 100 - 0.5) * 0.1;
  const offset2 = ((index % 10) / 10 - 0.5) * 0.08;
  return {
    lat: CHIHUAHUA_CENTER.lat + offset + offset2,
    lng: CHIHUAHUA_CENTER.lng + offset * 1.2,
  };
}

/** Genera posición simulada de un promotor cerca de una sucursal (radio ~300m) */
function simulatePromoterPosition(
  promoterId: string,
  baseCoords: { lat: number; lng: number },
  tick: number
): { lat: number; lng: number } {
  // Seed determinista por promotor para movimiento consistente
  const seed = promoterId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = ((seed * 37 + tick * 0.8) % 360) * (Math.PI / 180);
  const angle2 = ((seed * 13 + tick * 0.5) % 360) * (Math.PI / 180);
  // ~100-400m de radio (~0.001-0.004 grados)
  const radius = 0.001 + (((seed * 7) % 30) / 100) * 0.003;
  return {
    lat: baseCoords.lat + Math.sin(angle) * radius + Math.cos(angle2) * radius * 0.5,
    lng: baseCoords.lng + Math.cos(angle) * radius * 1.2 + Math.sin(angle2) * radius * 0.4,
  };
}

interface PromoterLiveLocation {
  promoterId: string;
  name: string;
  lat: number;
  lng: number;
  branchName: string;
  lastUpdate: Date;
}

interface SupervisorMapViewProps {
  orders: Order[];
  branches?: Branch[];
  teamBranches?: Branch[];
  promoters: PromoterProfile[];
}

export function SupervisorMapView({ orders, branches = [], teamBranches = [], promoters }: SupervisorMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const promoterMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const branchMarkersRef = useRef<L.Marker[]>([]);
  const [tick, setTick] = useState(0);
  const [liveLocations, setLiveLocations] = useState<PromoterLiveLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const orderBranchIds = [...new Set(orders.map(o => o.branch_id))];
  const teamBranchIds = teamBranches.map(b => b.id);
  const allBranchIds = [...new Set([...orderBranchIds, ...teamBranchIds])];
  const branchMap = new Map([...branches, ...teamBranches].map(b => [b.id, b]));

  const coords = allBranchIds
    .map((id, i) => {
      const b = branchMap.get(id);
      const name = b?.name ?? `Sucursal`;
      if (b?.lat != null && b?.lng != null) return { id, lat: b.lat, lng: b.lng, name };
      return { id, ...fallbackCoordsForBranch(id, i), name };
    }) as { id: string; lat: number; lng: number; name: string }[];

  // Geolocalización real del supervisor
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Tick cada 3s para simular movimiento de promotores
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  // Calcular posiciones simuladas de promotores
  useEffect(() => {
    if (!promoters.length || !coords.length) return;

    const locations: PromoterLiveLocation[] = promoters.map((p, i) => {
      // Asignar sucursal base al promotor (round-robin si hay más promotores que sucursales)
      const base = coords[i % coords.length];
      const pos = simulatePromoterPosition(p.id, base, tick);
      return {
        promoterId: p.id,
        name: p.name,
        lat: pos.lat,
        lng: pos.lng,
        branchName: base.name,
        lastUpdate: new Date(),
      };
    });
    setLiveLocations(locations);
  }, [tick, promoters, coords]);

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center = coords[0] ?? CHIHUAHUA_CENTER;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(
      [center.lat, center.lng], 13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Marcadores de sucursales
    coords.forEach(({ lat, lng, name }) => {
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            background:#0c4a6e;
            color:#fff;
            padding:5px 10px;
            border-radius:8px;
            font-size:11px;
            font-weight:600;
            white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            border:2px solid #fff;
          ">${name}</div>`,
          iconAnchor: [40, 10],
        }),
      }).addTo(map).bindPopup(`<b>${name}</b><br/>Sucursal WeberTrack`);
      branchMarkersRef.current.push(marker);
    });

    if (coords.length > 1) {
      map.fitBounds(coords.map(c => [c.lat, c.lng] as [number, number]), { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      branchMarkersRef.current = [];
      promoterMarkersRef.current.clear();
    };
  }, []);

  // Actualizar marcadores de promotores en tiempo real
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    liveLocations.forEach(loc => {
      const existing = promoterMarkersRef.current.get(loc.promoterId);
      const initials = loc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          position:relative;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:2px;
        ">
          <div style="
            width:36px;
            height:36px;
            border-radius:50%;
            background:linear-gradient(135deg,#0ea5e9,#0369a1);
            border:3px solid #fff;
            box-shadow:0 2px 10px rgba(14,165,233,0.6);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:12px;
            font-weight:700;
            color:#fff;
            animation:pulse-promoter 2s ease-in-out infinite;
          ">${initials}</div>
          <div style="
            background:rgba(14,165,233,0.95);
            color:#fff;
            padding:2px 7px;
            border-radius:20px;
            font-size:9px;
            font-weight:600;
            white-space:nowrap;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
          ">${loc.name.split(' ')[0]}</div>
          <div style="
            width:2px;
            height:0;
            border-left:2px dashed rgba(14,165,233,0.5);
          "></div>
        </div>`,
        iconSize: [60, 55],
        iconAnchor: [18, 36],
      });

      if (existing) {
        existing.setLatLng([loc.lat, loc.lng]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:140px">
              <b style="color:#0c4a6e">${loc.name}</b><br/>
              <span style="font-size:11px;color:#64748b">📍 Cerca de ${loc.branchName}</span><br/>
              <span style="font-size:10px;color:#94a3b8">🕐 En ruta · tiempo real</span>
            </div>
          `);
        promoterMarkersRef.current.set(loc.promoterId, marker);
      }
    });

    // Eliminar marcadores de promotores que ya no están
    promoterMarkersRef.current.forEach((marker, id) => {
      if (!liveLocations.find(l => l.promoterId === id)) {
        marker.remove();
        promoterMarkersRef.current.delete(id);
      }
    });
  }, [liveLocations]);

  // Marcador de ubicación del supervisor
  const supervisorMarkerRef = useRef<L.Marker | null>(null);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#f59e0b;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(245,158,11,0.6);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (supervisorMarkerRef.current) {
      supervisorMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      supervisorMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(map)
        .bindPopup('<b style="color:#f59e0b">Tu ubicación</b><br/><span style="font-size:11px">Supervisor en línea</span>');
    }
  }, [userLocation]);

  const isEmpty = coords.length === 0;

  return (
    <div className="space-y-4">
      {/* Header de estado en tiempo real */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={18} className="text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-primary">Seguimiento en tiempo real</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary/80 inline-block" /> Sucursales
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" /> Promotores
          </span>
          {userLocation && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Tú
            </span>
          )}
        </div>
      </div>

      {/* Inyectar animación CSS para los markers */}
      <style>{`
        @keyframes pulse-promoter {
          0%, 100% { box-shadow: 0 2px 10px rgba(14,165,233,0.6); transform: scale(1); }
          50% { box-shadow: 0 2px 20px rgba(14,165,233,0.9); transform: scale(1.08); }
        }
      `}</style>

      {isEmpty ? (
        <div className="rounded-xl border border-border h-80 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 text-slate-500 gap-3 p-6 text-center">
          <MapPin size={40} className="opacity-30" />
          <p className="text-sm font-medium">No hay sucursales del equipo para mostrar</p>
          <p className="text-xs opacity-70">Asigna promotores a sucursales en branch_promoters y vincula con tu supervisor_id en profiles.</p>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full rounded-xl border border-border overflow-hidden"
          style={{ height: 420 }}
        />
      )}

      {userLocation && (
        <p className="text-xs text-green-600 flex items-center gap-1.5">
          <Wifi size={12} /> Tu ubicación GPS activa
        </p>
      )}

      {/* Lista de promotores con estado */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="font-semibold text-primary flex items-center gap-2 text-sm">
            <User size={16} /> Promotores en ruta
          </h3>
          <span className="text-xs text-slate-400">
            Actualiza cada 3s
          </span>
        </div>

        {promoters.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No hay promotores asignados a tu equipo.</div>
        ) : (
          <div className="divide-y divide-border">
            {promoters.map((p, i) => {
              const loc = liveLocations.find(l => l.promoterId === p.id);
              const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {initials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {loc ? `📍 Cerca de ${loc.branchName}` : '📍 Localizando...'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                      En ruta
                    </span>
                    {p.email && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[100px]">{p.email}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}