import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, Loader2 } from "lucide-react";
import { useLocation } from "../context/LocationContext.tsx";

// Fix default Leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icon for Nile Ice Cream outlets
const outletIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Custom icon for User Location
const userIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const MapEvents = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Extracted from LocationContext to prevent circular dependency / duplication if needed, 
// but we'll use a direct reverse geocode call here before updating the context
async function reverseGeocodeMapClick(lat: number, lon: number) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address || {};
        const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.county ||
            addr.suburb ||
            "";
        const state = addr.state || "";
        const displayName = city && state ? `${city}, ${state}` : data.display_name || "";
        return { latitude: lat, longitude: lon, city, state, displayName };
    } catch {
        return null;
    }
}

export const LocationMapPicker: React.FC = () => {
    const {
        outlets,
        locationData,
        setLocationData,
        isLoadingLocation,
        getCurrentLocation
    } = useLocation();

    const [isPinning, setIsPinning] = useState(false);

    // Initial default center: Central Tamil Nadu
    const defaultCenter: [number, number] = [11.1271, 78.6569];
    const defaultZoom = locationData ? 12 : 7;

    const mapCenter: [number, number] = locationData
        ? [locationData.latitude, locationData.longitude]
        : defaultCenter;

    const handleMapClick = async (lat: number, lng: number) => {
        setIsPinning(true);
        const geoResult = await reverseGeocodeMapClick(lat, lng);
        if (geoResult) {
            setLocationData(geoResult);
        } else {
            setLocationData({
                latitude: lat,
                longitude: lng,
                city: "",
                state: "",
                displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            });
        }
        setIsPinning(false);
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">

            {/* Map Action Bar */}
            <div className="w-full flex justify-between items-center mb-4 px-2">
                <p className="text-sm font-medium text-gray-600">
                    Pin your exact delivery location on the map
                </p>
                <button
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation || isPinning}
                    className="flex items-center gap-2 text-sm bg-green-50 text-green-800 px-4 py-2 rounded-lg font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                    {(isLoadingLocation || isPinning) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <MapPin className="w-4 h-4" />
                    )}
                    Use GPS
                </button>
            </div>

            {/* Map Container */}
            <div className="w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-lg border-2 border-green-100 relative z-0">
                <MapContainer
                    center={mapCenter}
                    zoom={defaultZoom}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom={true}
                >
                    <MapEvents onLocationSelect={handleMapClick} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Rendering Outlets and their 7km delivery radius */}
                    {outlets.map((outlet) => (
                        <React.Fragment key={outlet.id}>
                            <Marker position={[outlet.latitude, outlet.longitude]} icon={outletIcon} />
                            <Circle
                                center={[outlet.latitude, outlet.longitude]}
                                radius={7000} // 7km in meters
                                pathOptions={{
                                    color: '#16a34a',
                                    fillColor: '#16a34a',
                                    fillOpacity: 0.1,
                                    weight: 2
                                }}
                            />
                        </React.Fragment>
                    ))}

                    {/* Rendering the User's Pinned Location */}
                    {locationData && (
                        <Marker
                            position={[locationData.latitude, locationData.longitude]}
                            icon={userIcon}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default LocationMapPicker;
