import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  AlertTriangle, 
  Flame, 
  Droplets, 
  Activity, 
  Wind, 
  Home, 
  MapPin, 
  PlusCircle, 
  RefreshCw, 
  ShieldAlert, 
  Navigation,
  Car,
  Crosshair,
  Filter
} from 'lucide-react';
import './leaflet-fix';

const API_BASE = 'http://127.0.0.1:8000/api';

// Generates SVG icons matching the disaster category & severity
const createDisasterIcon = (type, severity) => {
  const colorMap = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
  };
  const color = colorMap[severity] || '#ef4444';

  const icons = {
    flood: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`,
    fire: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    earthquake: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 12 5-5 5 10 5-10 5 5"/></svg>`,
    storm: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m13 13-3 4h3l-1 4"/></svg>`
  };

  const selectedSvg = icons[type] || icons.flood;

  return L.divIcon({
    className: 'custom-hazard-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style="background-color: ${color};"></span>
        <div class="relative inline-flex items-center justify-center rounded-full h-7 w-7 shadow-xl border-2 border-white" style="background-color: ${color};">
          ${selectedSvg}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const shelterIcon = L.divIcon({
  className: 'custom-shelter-marker',
  html: `
    <div class="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg shadow-xl border-2 border-white text-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Helper component to handle manual clicks on map
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Helper component to programmatically pan/zoom map on GPS trigger
function MapFlyTo({ targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 14, { duration: 1.5 });
    }
  }, [targetCoords, map]);
  return null;
}

export default function App() {
  const [formData, setFormData] = useState({
    title: '',
    disaster_type: 'flood',
    description: '',
    latitude: 26.4499,
    longitude: 80.3319,
    severity: 'HIGH',
  });
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [evacuationRoute, setEvacuationRoute] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapTarget, setMapTarget] = useState(null);

  // Filters State
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [onlyAvailableShelters, setOnlyAvailableShelters] = useState(false);

  // Debounced AI Triage Prediction
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.description && formData.description.trim().length > 10) {
        try {
          const res = await fetch(`${API_BASE}/triage/predict-severity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: formData.description }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.suggested_severity) {
              setFormData((prev) => ({ ...prev, severity: data.suggested_severity }));
            }
          }
        } catch (err) {
          console.error('Triage inference failed', err);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.description]);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents/nearby?latitude=26.4499&longitude=80.3319&radius_km=100`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    }
  };

  const fetchShelters = async () => {
    try {
      const res = await fetch(`${API_BASE}/shelters/nearest?latitude=26.4499&longitude=80.3319&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setShelters(data.shelters || []);
      }
    } catch (err) {
      console.error('Failed to load shelters', err);
    }
  };

  const syncGrid = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([fetchIncidents(), fetchShelters()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncGrid();
  }, []);

  const handleMapClick = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(4)),
      longitude: parseFloat(lng.toFixed(4)),
    }));
  };

  // "Locate Me" GPS Auto-Detection handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        setMapTarget([lat, lng]);
      },
      (err) => {
        console.error('GPS error:', err);
        alert('Could not retrieve current location. Please allow location permissions in your browser.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/incidents/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
        return;
      }

      alert('Incident broadcast successfully pinned to grid!');
      setFormData({
        title: '',
        disaster_type: 'flood',
        description: '',
        latitude: 26.4499,
        longitude: 80.3319,
        severity: 'HIGH',
      });
      syncGrid();
    } catch (err) {
      alert('Could not contact backend at http://127.0.0.1:8000');
    }
  };

  // Calculate Turn-by-Turn Road Route with OSRM
  const handleSelectIncidentForRoute = async (incident) => {
    setSelectedIncident(incident);
    setEvacuationRoute(null);
    setRouteStats(null);

    // Pick shelters that have open room
    const eligibleShelters = shelters.filter(s => s.occupancy < s.capacity);
    const pool = eligibleShelters.length ? eligibleShelters : shelters;
    if (!pool.length) return;

    const [incLng, incLat] = incident.location.coordinates;

    let nearest = pool[0];
    let minDistance = Infinity;
    pool.forEach((s) => {
      const [shLng, shLat] = s.location.coordinates;
      const d = Math.hypot(shLat - incLat, shLng - incLng);
      if (d < minDistance) {
        minDistance = d;
        nearest = s;
      }
    });

    const [shLng, shLat] = nearest.location.coordinates;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${incLng},${incLat};${shLng},${shLat}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const routeCoordinates = data.routes[0].geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );
        setEvacuationRoute(routeCoordinates);
        setRouteStats({
          targetShelter: nearest.name,
          distanceKm: (data.routes[0].distance / 1000).toFixed(2),
          durationMins: Math.ceil(data.routes[0].duration / 60),
        });
      }
    } catch (error) {
      console.error('Road routing calculation failed, fallback to straight line', error);
      setEvacuationRoute([
        [incLat, incLng],
        [shLat, shLng],
      ]);
      setRouteStats({
        targetShelter: nearest.name,
        distanceKm: nearest.distance_km || 'N/A',
        durationMins: 'Direct Path',
      });
    }
  };

  // Apply Filter Logic
  const filteredIncidents = incidents.filter((incident) => {
    const matchesType = typeFilter === 'ALL' || incident.disaster_type.toUpperCase() === typeFilter;
    const matchesSeverity = severityFilter === 'ALL' || incident.severity === severityFilter;
    return matchesType && matchesSeverity;
  });

  const filteredShelters = shelters.filter((shelter) => {
    if (onlyAvailableShelters) {
      return shelter.occupancy < shelter.capacity;
    }
    return true;
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <header className="px-6 py-3.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-500 w-7 h-7" />
          <div>
            <h1 className="text-lg font-bold tracking-wide">Disaster Management System</h1>
            <p className="text-[11px] text-slate-400">AI-Powered Geospatial Triage & Road Evacuation Grid</p>
          </div>
        </div>
        <button
          onClick={syncGrid}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Grid
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side Control Panel */}
        <div className="w-96 bg-slate-800 p-5 overflow-y-auto border-r border-slate-700 flex flex-col gap-6 z-10">
          {/* Active Evacuation Route Display */}
          {selectedIncident && routeStats && (
            <div className="p-4 bg-blue-950/80 border border-blue-500/60 rounded-xl text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-blue-400 animate-spin" /> Live Road Evacuation Route
                </span>
                <button
                  onClick={() => {
                    setSelectedIncident(null);
                    setEvacuationRoute(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-300 font-medium">From: {selectedIncident.title}</p>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700 space-y-1">
                <p className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" /> Destination: {routeStats.targetShelter}
                </p>
                <div className="flex justify-between text-slate-300 text-[11px] pt-1">
                  <span className="flex items-center gap-1">
                    <Car className="w-3 h-3 text-slate-400" /> {routeStats.distanceKm} km drive
                  </span>
                  <span className="text-amber-400 font-medium">~{routeStats.durationMins} mins</span>
                </div>
              </div>
            </div>
          )}

          {/* Incident Report Form */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
            <h2 className="text-md font-semibold flex items-center gap-2 mb-3 text-red-400">
              <PlusCircle className="w-5 h-5" /> Report Active Hazard
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-400">Incident Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Flash Flood Near Bridge"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 focus:border-red-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Type</label>
                  <select
                    value={formData.disaster_type}
                    onChange={(e) => setFormData({ ...formData, disaster_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 outline-none"
                  >
                    <option value="flood">Flood</option>
                    <option value="fire">Fire</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="storm">Storm</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 outline-none text-red-400 font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Coordinates and GPS Locate Me Button */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400">Location Coordinates</label>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" /> Locate Me (GPS)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    placeholder="Latitude"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    placeholder="Longitude"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Description (Auto-Triaged by ML)</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe emergency details..."
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 font-semibold py-2 rounded-lg text-white shadow-md transition"
              >
                Broadcast Alert
              </button>
            </form>
          </div>

          {/* Shelters Feed */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
              <Home className="w-4 h-4" /> Operational Relief Shelters ({filteredShelters.length})
            </h3>
            <div className="flex flex-col gap-2">
              {filteredShelters.map((s) => (
                <div key={s.id} className="p-3 bg-slate-900 rounded-lg border border-slate-700 text-xs">
                  <div className="flex justify-between items-start font-semibold text-slate-200">
                    <span>{s.name}</span>
                    <span className="text-emerald-400 font-mono">{s.distance_km} km</span>
                  </div>
                  <div className="text-slate-400 mt-1 flex justify-between">
                    <span>Occupancy: {s.occupancy} / {s.capacity}</span>
                    <span className={s.occupancy >= s.capacity ? "text-red-400 font-bold" : "text-emerald-400"}>
                      {s.occupancy >= s.capacity ? "FULL" : `${s.capacity - s.occupancy} slots left`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Phone: {s.contact_phone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map View & Filter Bar */}
        <div className="flex-1 relative">
          {/* Top Interactive Filter Bar Overlay */}
          <div className="absolute top-4 left-16 right-4 z-[1000] flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 shadow-2xl text-xs">
            <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filters:
            </span>

            {/* Disaster Type Filter */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {['ALL', 'FLOOD', 'FIRE', 'EARTHQUAKE', 'STORM'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    typeFilter === type
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    severityFilter === sev
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Shelter Space Toggle */}
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer ml-auto text-[11px]">
              <input
                type="checkbox"
                checked={onlyAvailableShelters}
                onChange={(e) => setOnlyAvailableShelters(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
              Available Shelters Only
            </label>
          </div>

          <MapContainer center={[26.4499, 80.3319]} zoom={12} className="h-full w-full">
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationPicker onLocationSelect={handleMapClick} />
            <MapFlyTo targetCoords={mapTarget} />

            {/* Road Route Polyline */}
            {evacuationRoute && (
              <Polyline
                positions={evacuationRoute}
                pathOptions={{
                  color: '#38bdf8',
                  weight: 5,
                  opacity: 0.9,
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Render Filtered Hazards */}
            {filteredIncidents.map((incident) => {
              const coords = incident.location?.coordinates;
              if (!coords || coords.length < 2) return null;
              return (
                <Marker
                  key={incident.id || incident._id}
                  position={[coords[1], coords[0]]}
                  icon={createDisasterIcon(incident.disaster_type, incident.severity)}
                  eventHandlers={{
                    click: () => handleSelectIncidentForRoute(incident),
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans p-1">
                      <h4 className="font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 inline" /> {incident.title}
                      </h4>
                      <p className="text-xs mt-1 text-slate-700">{incident.description}</p>
                      <div className="mt-2 text-[10px] font-mono text-slate-500">
                        Type: {incident.disaster_type} | Severity: {incident.severity}
                      </div>
                      <button
                        onClick={() => handleSelectIncidentForRoute(incident)}
                        className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded w-full hover:bg-blue-700 transition"
                      >
                        Calculate Road Evacuation Path
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Render Filtered Shelters */}
            {filteredShelters.map((shelter) => {
              const coords = shelter.location?.coordinates;
              if (!coords || coords.length < 2) return null;
              return (
                <Marker
                  key={shelter.id || shelter._id}
                  position={[coords[1], coords[0]]}
                  icon={shelterIcon}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans p-1 text-xs">
                      <h4 className="font-bold text-emerald-600 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 inline" /> {shelter.name}
                      </h4>
                      <p className="mt-1">
                        Capacity: <strong>{shelter.occupancy}</strong> / {shelter.capacity}
                      </p>
                      <p className="text-slate-500">Contact: {shelter.contact_phone}</p>
                      {shelter.distance_km && (
                        <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                          {shelter.distance_km} km away
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}