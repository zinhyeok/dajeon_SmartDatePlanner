import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
// @ts-ignore - No type definitions available
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import { Icon, LatLngExpression, divIcon, point } from 'leaflet';
import { Place } from '../../types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for default marker icons in react-leaflet
import L from 'leaflet';

// Force load marker icons using CDN URLs (more reliable than local imports)
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

// Set as default for all markers
L.Marker.prototype.options.icon = DefaultIcon;

// Map Configuration
const MAP_CENTER: LatLngExpression = [36.3504, 127.3845]; // Daejeon City Hall
const INITIAL_ZOOM = 13;
const MIN_ZOOM = 11;
const MAX_ZOOM = 18;

interface DateCourseMapProps {
  places: Place[];
  courseSequence?: Place[]; // Selected course route
  startLocation?: Place;
  selectedPlace?: Place; // Place to center map on (from timeline click)
}

/**
 * Get marker color based on place type and role in course
 */
function getMarkerColor(place: Place, index: number, total: number): string {
  if (index === 0) return 'green'; // Start
  if (index === total - 1) return 'purple'; // End
  
  if (place.mealType === 'lunch') return 'orange';
  if (place.mealType === 'dinner') return 'red';
  if (place.mealType === 'cafe') return 'brown';
  
  return 'blue'; // Activity
}

/**
 * Component to handle map panning when selectedPlace changes
 */
const MapPanController: React.FC<{ place?: Place }> = ({ place }) => {
  const map = useMap();

  useEffect(() => {
    if (place) {
      map.setView([place.lat, place.lng], 16, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [place, map]);

  return null;
};

/**
 * Create custom icon for markers
 */
function createCustomIcon(color: string): Icon {
  return new Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}


export const DateCourseMap: React.FC<DateCourseMapProps> = ({
  places,
  courseSequence = [],
  selectedPlace,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering map (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Separate places into course sequence and all other places
  const coursePlaceIds = useMemo(
    () => new Set(courseSequence.map((p) => p.id)),
    [courseSequence]
  );

  const coursePlaces = useMemo(
    () => courseSequence.filter((p) => p),
    [courseSequence]
  );

  const otherPlaces = useMemo(
    () => places.filter((p) => !coursePlaceIds.has(p.id)),
    [places, coursePlaceIds]
  );

  // Generate polyline coordinates for course route
  const routeCoordinates = useMemo<LatLngExpression[]>(() => {
    if (coursePlaces.length === 0) return [];
    return coursePlaces.map((place) => [place.lat, place.lng] as LatLngExpression);
  }, [coursePlaces]);

  // Show loading state until mounted
  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] relative">
      {/* Marker count indicator */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
        <div className="text-sm font-semibold text-gray-900">
          <span className="text-indigo-600">{otherPlaces.length}</span>
          {' '}개 마커 (클러스터링)
        </div>
        {coursePlaces.length > 0 && (
          <div className="text-xs text-indigo-600 mt-1">
            코스: {coursePlaces.length}개 장소
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          전체: {places.length}개 장소
        </div>
      </div>

      <MapContainer
        center={MAP_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Map pan controller - moves map when place is selected */}
        <MapPanController place={selectedPlace} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline - Only show if there's a course sequence */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#3B82F6"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Course Sequence Markers - Individual markers (not clustered) */}
        {coursePlaces.map((place, index) => {
          const color = getMarkerColor(place, index, coursePlaces.length);
          const icon = createCustomIcon(color);
          
          return (
            <Marker
              key={`course-${place.id}`}
              position={[place.lat, place.lng]}
              icon={icon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg">{place.name}</h3>
                  <p className="text-sm text-gray-600">{place.nameKo}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {place.type} • {place.mealType || 'Activity'}
                  </p>
                  <p className="text-xs mt-1">{place.description}</p>
                  {place.estimatedDuration && (
                    <p className="text-xs text-gray-400 mt-1">
                      Duration: ~{place.estimatedDuration} min
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* All Other Places - Clustered for Performance (ALL 2,000 markers) */}
        {otherPlaces.length > 0 && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            iconCreateFunction={(cluster: any) => {
              const count = cluster.getChildCount();
              return divIcon({
                html: `<div style="background-color: #3B82F6; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${count}</div>`,
                className: 'marker-cluster',
                iconSize: point(40, 40, true)
              });
            }}
          >
            {otherPlaces.map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{place.name}</h3>
                    <p className="text-sm text-gray-600">{place.nameKo}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {place.type} • {place.mealType || 'Activity'}
                    </p>
                    <p className="text-xs mt-1">{place.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Themes: {place.themes.join(', ')}
                    </p>
                    {place.estimatedDuration && (
                      <p className="text-xs text-gray-400 mt-1">
                        Duration: ~{place.estimatedDuration} min
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
};

