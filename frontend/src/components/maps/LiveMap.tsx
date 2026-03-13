import { useEffect, useRef, useState, useCallback } from 'react';
import type { Order, Branch } from '../../types/webertrack';
import type { PromoterProfile } from '../../lib/supabaseQueries';
import { MapPin, Navigation, Route, Users, RefreshCw, Maximize2, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../lib/utils';

const CHIHUAHUA = { lat: 28.6353, lng: -106.0889 };

function hashCoords(id: string, i: number) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const off = ((h % 100) / 100 - .5) * .09;
  const off2 = ((i % 10) / 10 - .5) * .06;
  return { lat: CHIHUAHUA.lat + off + off2, lng: CHIHUAHUA.lng + off * 1.2 };
}

function branchIcon(color = '#064d80', label = '') {
  return L.divIcon({
    className: 'weber-branch-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
    html: `
      <div style="position:relative;width:36px;height:44px">
        <div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          border:2.5px solid white;
          box-shadow:0 3px 10px rgba(0,0,0,.3);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg style="transform:rotate(45deg)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        ${label ? `<div style="
          position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
          background:${color};color:white;font-size:9px;font-weight:700;
          padding:1px 5px;border-radius:99px;white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,.3);font-family:DM Sans,sans-serif;
        ">${label}</div>` : ''}
      </div>
    `,
  });
}

function userIcon(color = '#0c90e0') {
  return L.divIcon({
    className: 'weber-user-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
        <div style="
          position:absolute;width:44px;height:44px;border-radius:50%;
          border:2px solid ${color};opacity:.3;
          animation:pulseRing 2s infinite;
        "></div>
        <div style="
          width:20px;height:20px;border-radius:50%;
          background:${color};border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.4);
        "></div>
      </div>
    `,
  });
}

interface LiveMapProps {
  orders: Order[];
  branches?: Branch[];
  teamBranches?: Branch[];
  promoters: PromoterProfile[];
  mode?: 'supervisor' | 'promotor' | 'auditor';
  currentPromotorId?: string;
  className?: string;
  promoterLocations?: Record<string, { lat: number; lng: number; name: string }>;
}

export function LiveMap({ orders, branches = [], teamBranches = [], promoters, mode = 'supervisor', currentPromotorId, className }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'dark'>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const TILES: Record<string, { url: string; att: string }> = {
    standard:  { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', att: '© OSM' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', att: '© Esri' },
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', att: '© CartoDB' },
  };

  // Build coord list
  const allBranches = [...branches, ...teamBranches];
  const branchMap = new Map(allBranches.map(b => [b.id, b]));
  const usedIds = [...new Set([...orders.map(o => o.branch_id), ...teamBranches.map(b => b.id)])];
  const coords = usedIds.map((id, i) => {
    const b = branchMap.get(id);
    const pos = (b?.lat != null && b?.lng != null) ? { lat: b.lat, lng: b.lng } : hashCoords(id, i);
    return { id, name: b?.name ?? 'Sucursal', ...pos };
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [CHIHUAHUA.lat, CHIHUAHUA.lng],
      zoom: 12,
      zoomControl: true,
    });
    const tile = L.tileLayer(TILES.standard.url, { attribution: TILES.standard.att, maxZoom: 19 });
    tile.addTo(map);
    tileLayerRef.current = tile;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Change tile layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const t = TILES[mapStyle];
    const tile = L.tileLayer(t.url, { attribution: t.att, maxZoom: 19 });
    tile.addTo(mapInstanceRef.current);
    tileLayerRef.current = tile;
  }, [mapStyle]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    routeLinesRef.current.forEach(l => l.remove());
    routeLinesRef.current = [];

    const pendingBranchIds = new Set(orders.filter(o => o.status === 'PENDING').map(o => o.branch_id));
    const approvedBranchIds = new Set(orders.filter(o => o.status === 'APPROVED').map(o => o.branch_id));

    coords.forEach(c => {
      const hasPending = pendingBranchIds.has(c.id);
      const hasApproved = approvedBranchIds.has(c.id);
      const color = hasPending ? '#f59e0b' : hasApproved ? '#16a34a' : '#064d80';
      const marker = L.marker([c.lat, c.lng], { icon: branchIcon(color, c.name.split(' ').slice(-1)[0]) })
        .bindPopup(`
          <div style="min-width:160px;padding:8px;font-family:DM Sans,sans-serif">
            <p style="font-weight:700;font-size:13px;color:var(--text,#0a1628);margin:0 0 4px">${c.name}</p>
            ${hasPending ? `<span style="background:rgba(245,158,11,.12);color:#92400e;font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600">● Pendiente</span>` : ''}
            ${hasApproved ? `<span style="background:rgba(22,163,74,.12);color:#14532d;font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600">● Aprobado</span>` : ''}
            ${!hasPending && !hasApproved ? `<span style="color:#94a3b8;font-size:11px">Sin pedidos</span>` : ''}
          </div>
        `)
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Draw routes if enabled
    if (showRoutes && coords.length > 1 && (mode === 'supervisor' || mode === 'promotor')) {
      const sorted = [...coords].sort((a, b) => a.lng - b.lng);
      const points = sorted.map(c => [c.lat, c.lng] as [number, number]);

      const drawRoute = (routeCoords: [number, number][]) => {
        if (!map || routeCoords.length === 0) return;
        
        // Shadow line
        const shadow = L.polyline(routeCoords, { color: 'rgba(0,0,0,.15)', weight: 6, opacity: 1, smoothFactor: 3 }).addTo(map);
        routeLinesRef.current.push(shadow);

        // Main route line - azul
        const routeLine = L.polyline(routeCoords, {
          color: '#0c90e0',
          weight: 3.5,
          opacity: .85,
          smoothFactor: 3,
        }).addTo(map);
        routeLinesRef.current.push(routeLine);

        // Mark start and end
        const startIcon = L.divIcon({
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;background:#16a34a;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)">1</div>`
        });
        const endIcon = L.divIcon({
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;background:#dc2626;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)">${sorted.length}</div>`
        });
        L.marker(routeCoords[0], { icon: startIcon }).addTo(map);
        L.marker(routeCoords[routeCoords.length - 1], { icon: endIcon }).addTo(map);
      };

      // Try real route from OSRM (free routing engine)
      const fetchOSRMRoute = async () => {
        try {
          if (sorted.length < 2) {
            drawRoute(points);
            return;
          }
          
          // Format: lng,lat;lng,lat;...
          const coordinates = sorted.map(c => `${c.lng},${c.lat}`).join(';');
          const response = await Promise.race([
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson&overview=full`
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('OSRM timeout')), 5000))
          ]) as Response;
          
          if (!response.ok) throw new Error(`OSRM error: ${response.status}`);
          
          const data = await response.json();
          if (data.routes?.[0]?.geometry?.coordinates) {
            const routeCoords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
            drawRoute(routeCoords);
          } else {
            drawRoute(points);
          }
        } catch (err) {
          console.warn('OSRM unavailable, using simple route:', err);
          drawRoute(points);
        }
      };

      fetchOSRMRoute();
    }

    // Fit bounds
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [coords.length, showRoutes, mode, orders]);

  // User location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    const m = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon() })
      .bindPopup('<div style="font-family:DM Sans,sans-serif;padding:4px;font-size:13px;font-weight:600">📍 Tu ubicación</div>')
      .addTo(map);
    userMarkerRef.current = m;
    return () => { m.remove(); userMarkerRef.current = null; };
  }, [userLocation]);

  const centerOnUser = useCallback(() => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.5 });
    }
  }, [userLocation]);

  const fitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || coords.length === 0) return;
    const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, duration: 0.8 });
  }, [coords, userLocation]);

  return (
    <div className={cn('relative', isFullscreen && 'fixed inset-0 z-[60]', className)}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {/* Map style */}
        <div className="glass rounded-xl p-1 flex flex-col gap-1">
          {(['standard', 'satellite', 'dark'] as const).map(s => (
            <button
              key={s}
              onClick={() => setMapStyle(s)}
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-600 transition-colors capitalize',
                mapStyle === s ? 'bg-[var(--brand-700)] text-white' : 'text-[var(--text-3)] hover:bg-[var(--surface-2)]'
              )}
            >
              {s === 'standard' ? 'Mapa' : s === 'satellite' ? 'Satélite' : 'Noche'}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="glass rounded-xl p-1 flex flex-col gap-1">
          <button
            onClick={() => setShowRoutes(r => !r)}
            className={cn('p-2 rounded-lg transition-colors tooltip-trigger', showRoutes ? 'bg-[var(--brand-700)] text-white' : 'text-[var(--text-3)] hover:bg-[var(--surface-2)]')}
            title="Mostrar rutas"
          >
            <Route size={15} />
          </button>
          {userLocation && (
            <button onClick={centerOnUser} className="p-2 rounded-lg text-[var(--text-3)] hover:bg-[var(--surface-2)] transition-colors" title="Mi ubicación">
              <Navigation size={15} />
            </button>
          )}
          <button onClick={fitAll} className="p-2 rounded-lg text-[var(--text-3)] hover:bg-[var(--surface-2)] transition-colors" title="Ver todo">
            <Maximize2 size={15} />
          </button>
        </div>

        {/* Legend */}
        <div className="glass rounded-xl px-3 py-2">
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />Pendiente</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />Aprobado</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#064d80]" />Sin pedido</div>
            {userLocation && <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0c90e0]" />Tú</div>}
          </div>
        </div>
      </div>

      {/* User location status */}
      {userLocation && (
        <div className="absolute top-3 left-3 z-20 glass rounded-xl px-3 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0c90e0] animate-pulse" />
          <span className="text-xs text-[var(--text-2)] font-500">GPS activo</span>
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: isFullscreen ? '100vh' : 380 }}
      />

      {/* Stats overlay */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[var(--primary)] mono">{coords.length}</p>
          <p className="text-xs text-[var(--text-3)]">Sucursales</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#f59e0b] mono">{orders.filter(o => o.status === 'PENDING').length}</p>
          <p className="text-xs text-[var(--text-3)]">Pendientes</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#16a34a] mono">{orders.filter(o => o.status === 'APPROVED').length}</p>
          <p className="text-xs text-[var(--text-3)]">Aprobados</p>
        </div>
      </div>

      {/* Promoters list */}
      {promoters.length > 0 && (
        <div className="mt-3 glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[var(--primary)]" />
            <p className="font-semibold text-sm text-[var(--text)]">Promotores del equipo</p>
            <span className="ml-auto text-xs font-600 text-[var(--text-3)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">{promoters.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {promoters.map(p => {
              const pOrders = orders.filter(o => o.promoter_id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-[var(--text)] truncate">{p.name}</p>
                    <p className="text-xs text-[var(--text-3)]">{pOrders.length} pedido{pOrders.length !== 1 ? 's' : ''}</p>
                  </div>
                  {pOrders.some(o => o.status === 'PENDING') && (
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b] flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
