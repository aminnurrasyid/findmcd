import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Chatbot from "./chatbot";
import { createContext } from 'react';
export const MarkerContext = createContext();

const createCustomIcon = (size, isColorful = false, hasBorder = false) =>
  L.icon({
    iconUrl: isColorful ? "/McDonald's_Logo_WebIcon.svg" : "/McDonald's_Logo_WebIcon_white.png",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -20],
    className: hasBorder ? "custom-icon-shadow bordered-icon" : "custom-icon-shadow",
  });

const fetchOutlets = async () => {
  try {
    const response = await fetch('https://findmcd-0-0-1.onrender.com/fetchOutlet');
    if (!response.ok) {
      throw new Error('Network response failed.');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    return [];
  }
};

const isIntersecting = (outlet, otherOutlet) => {
  const dx = outlet.lng - otherOutlet.lng;
  const dy = outlet.lat - otherOutlet.lat;
  const distance = Math.sqrt(dx * dx + dy * dy) * 111000; // Approximate conversion to meters
  return distance < outlet.radius + otherOutlet.radius;
};

export default function MapComponent() {
  const [outlets, setOutlets] = useState([]);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [iconSizes, setIconSizes] = useState({});
  const [useColorfulIcons, setUseColorfulIcons] = useState(false);
  const [highlightedOutlets, setHighlightedOutlets] = useState([]);
  const [markersWithBorder, setMarkersWithBorder] = useState(new Set());

  const markerRefs = useRef({});

  useEffect(() => {
    fetchOutlets().then(setOutlets);
  }, []);

  useEffect(() => {
    if (hoveredMarker !== null) {
      let size = 30;
      const animateIncrease = () => {
        setIconSizes((prev) => {
          const newSize = Math.min((prev[hoveredMarker] || 30) + 1, 40);
          return { ...prev, [hoveredMarker]: newSize };
        });
        if (size < 40) {
          size += 1;
          requestAnimationFrame(animateIncrease);
        }
      };
      animateIncrease();

      // Find outlets whose radius intersects with the hovered marker's radius
      const hoveredOutlet = outlets.find(outlet => outlet.id === hoveredMarker);
      const overlappingMarkers = outlets.filter(outlet => 
        outlet.id !== hoveredMarker && isIntersecting(hoveredOutlet, outlet)
      ).map(outlet => outlet.id);

      // Include the hovered marker itself
      overlappingMarkers.push(hoveredMarker);

      // Update markers with border
      setMarkersWithBorder(new Set(overlappingMarkers));
    } else {
      Object.keys(iconSizes).forEach((id) => {
        let size = 40;
        const animateDecrease = () => {
          setIconSizes((prev) => {
            const newSize = Math.max((prev[id] || 40) - 1, 30);
            return { ...prev, [id]: newSize };
          });
          if (size > 30) {
            size -= 1;
            requestAnimationFrame(animateDecrease);
          }
        };
        animateDecrease();
      });

      // Clear the markers with border when mouse leaves
      setMarkersWithBorder(new Set());
    }
  }, [hoveredMarker, outlets]);

  const highlightOutletsByName = (outletNames) => {
    if (!outletNames || !Array.isArray(outletNames)) return;
    
    if (outletNames.length === 0) {
      setHighlightedOutlets([]);
      return;
    }
    
    setHighlightedOutlets(outletNames);
  };

  const openOutletPopup = (outletName) => {
    const outlet = outlets.find(o => o.name.includes(outletName));
    
    if (outlet && markerRefs.current[outlet.id]) {
      markerRefs.current[outlet.id].openPopup();
        
      if (markerRefs.current[outlet.id]._map) {
        markerRefs.current[outlet.id]._map.flyTo(
          [outlet.lat, outlet.lng], 
          markerRefs.current[outlet.id]._map.getZoom(), 
          { duration: 0.5 }
        );
      }
    }
  };

  const shouldUseColor = (outlet) => {
    if (useColorfulIcons) return true;
    return highlightedOutlets.some(name => outlet.name.includes(name));
  };

  return (
    <MarkerContext.Provider value={{ highlightOutletsByName, openOutletPopup }}>
      <div style={{ position: "relative" }}>
        <MapContainer center={[3.1319, 101.6841]} zoom={12} style={{ height: "100vh", width: "100%", zIndex: 1 }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          />
          {outlets.map((outlet) => (
            <div key={`container-${outlet.id}`}>
              {hoveredMarker === outlet.id && (
                <Circle
                  key={`circle-${outlet.id}`}
                  center={[outlet.lat, outlet.lng]}
                  radius={outlet.radius}
                  color={"lightblue"}
                />
              )}
              <Marker
                key={`marker-${outlet.id}`}
                position={[outlet.lat, outlet.lng]}
                icon={createCustomIcon(iconSizes[outlet.id] || 30, shouldUseColor(outlet), markersWithBorder.has(outlet.id))}
                eventHandlers={{
                  mouseover: () => setHoveredMarker(outlet.id),
                  mouseout: () => setHoveredMarker(null),
                }}
                ref={(ref) => {
                  if (ref) {
                    markerRefs.current[outlet.id] = ref;
                  }
                }}
              >
                <Popup closeButton={false}>
                  <div style={{ padding: "8px", textAlign: "center", fontFamily: "Arial, sans-serif", fontSize: "18px" }}>
                    <p style={{ margin: "5px 0 0", fontWeight: "bold" }}>{outlet.name}</p>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", fontWeight: "normal" }}>{outlet.address}</p>
                    <p style={{ margin: "5px 0 0" }}>
                      <a href={outlet.waze_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", textDecoration: "none", color: "blue" }}>
                        Open in Waze
                      </a>
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          ))}
        </MapContainer>

        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
          <Chatbot />
        </div>
      </div>
    </MarkerContext.Provider>
  );
}
