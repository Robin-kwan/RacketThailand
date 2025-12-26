"use client";

import { useEffect, useMemo, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export type NearbyMapCourt = {
  id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  href: string;
};

type NearbyMapProps = {
  userLocation: { latitude: number; longitude: number } | null;
  courts: NearbyMapCourt[];
};

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

const mapStyles = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4b5563" }],
  },
] satisfies google.maps.MapTypeStyle[];

const mapOptions = {
  zoom: 13,
  disableDefaultUI: true,
  zoomControl: true,
  styles: mapStyles,
  ...(MAP_ID ? { mapId: MAP_ID } : {}),
} as const;

const createCourtLabel = (name: string, href: string) => {
  const container = document.createElement("div");
  container.style.display = "inline-flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.gap = "10px";
  container.style.transform = "translate(-10px, -10px)";

  const label = document.createElement("div");
  label.style.background = "#ffffff";
  label.style.borderRadius = "999px";
  label.style.padding = "6px 12px";
  label.style.fontSize = "12px";
  label.style.fontWeight = "600";
  label.style.color = "#0f172a";
  label.style.boxShadow = "0 8px 20px rgba(15,23,42,0.15)";
  label.style.whiteSpace = "nowrap";
  label.textContent = name;
  container.appendChild(label);

  const pin = document.createElement("div");
  pin.style.width = "14px";
  pin.style.height = "14px";
  pin.style.borderRadius = "999px";
  pin.style.background = "#ea4335";
  pin.style.border = "2px solid #ffffff";
  pin.style.boxShadow = "0 4px 10px rgba(15,23,42,0.3)";
  container.style.cursor = "pointer";
  container.title = name;
  container.addEventListener("click", () => {
    window.open(href, "_blank", "noopener,noreferrer");
  });
  container.appendChild(pin);

  return container;
};

const createInlineLabel = (name: string) => {
  const label = document.createElement("div");
  label.style.background = "#ffffff";
  label.style.borderRadius = "999px";
  label.style.padding = "6px 12px";
  label.style.fontSize = "12px";
  label.style.fontWeight = "600";
  label.style.color = "#0f172a";
  label.style.boxShadow = "0 8px 20px rgba(15,23,42,0.15)";
  label.style.whiteSpace = "nowrap";
  label.style.position = "absolute";
  label.style.pointerEvents = "auto";
  label.style.cursor = "pointer";
  label.textContent = name;
  return label;
};

const createLabelOverlay = (
  maps: typeof google.maps,
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  name: string,
  href: string,
) => {
  class InlineLabel extends maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private readonly location: google.maps.LatLngLiteral;

    private readonly href: string;

    constructor(loc: google.maps.LatLngLiteral, href: string) {
      super();
      this.location = loc;
      this.href = href;
    }

    onAdd() {
      this.div = createInlineLabel(name);
      const pane = this.getPanes()?.overlayMouseTarget;
      pane?.appendChild(this.div as HTMLDivElement);
      this.div?.addEventListener("click", () => {
        window.open(this.href, "_blank", "noopener,noreferrer");
      });
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new maps.LatLng(this.location),
      );
      if (point) {
        this.div.style.left = `${point.x + 18}px`;
        this.div.style.top = `${point.y - 6}px`;
      }
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  }

  const overlay = new InlineLabel(position, href);
  overlay.setMap(map);
  return overlay;
};

export function NearbyMap({ userLocation, courts }: NearbyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const visibleCourts = useMemo(() => courts.slice(0, 15), [courts]);
  const userLatLng = useMemo(() => {
    if (!userLocation) return null;
    const lat = Number(userLocation.latitude);
    const lng = Number(userLocation.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;
  }, [userLocation]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !userLatLng ||
      Number.isNaN(userLatLng.lat) ||
      Number.isNaN(userLatLng.lng) ||
      !apiKey
    ) {
      return;
    }
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["marker"],
    });
    let mapInstance: google.maps.Map | null = null;
    let userMarker: google.maps.Marker | null = null;
    const courtMarkers: Array<() => void> = [];
    const labelOverlays: google.maps.OverlayView[] = [];
    let isActive = true;

    loader.load().then(() => {
      if (!mapRef.current || !isActive) return;
      const maps = window.google?.maps;
      if (!maps) return;

      mapInstance = new maps.Map(mapRef.current, {
        ...mapOptions,
        center: userLatLng,
      });
      userMarker = new maps.Marker({
        map: mapInstance,
        position: userLatLng,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: "You are here",
      });

      const AdvancedMarker = window.google?.maps?.marker
        ?.AdvancedMarkerElement;
      const canUseAdvancedMarker = Boolean(MAP_ID && AdvancedMarker);

      visibleCourts.forEach((court) => {
        if (canUseAdvancedMarker) {
          const labelContent = createCourtLabel(
            court.name ?? "Court",
            court.href,
          );
          const marker = new AdvancedMarker({
            map: mapInstance as google.maps.Map,
            position: {
              lat: Number(court.latitude),
              lng: Number(court.longitude),
            },
            title: court.name ?? "Court",
            content: labelContent,
          });
          marker.addListener("click", () => {
            window.open(court.href, "_blank", "noopener,noreferrer");
          });
          courtMarkers.push(() => {
            (marker as google.maps.marker.AdvancedMarkerElement).map = null;
          });
        } else {
          const fallbackMarker = new maps.Marker({
            map: mapInstance as google.maps.Map,
            position: {
              lat: Number(court.latitude),
              lng: Number(court.longitude),
            },
            title: court.name ?? "Court",
          });
          fallbackMarker.addListener("click", () => {
            window.open(court.href, "_blank", "noopener,noreferrer");
          });
          courtMarkers.push(() => fallbackMarker.setMap(null));
          if (court.name) {
            const overlay = createLabelOverlay(
              maps,
              mapInstance as google.maps.Map,
              {
                lat: Number(court.latitude),
                lng: Number(court.longitude),
              },
              court.name,
              court.href,
            );
            labelOverlays.push(overlay);
          }
        }
      });
    });

    return () => {
      isActive = false;
      courtMarkers.forEach((clearMarker) => clearMarker());
      labelOverlays.forEach((overlay) => overlay.setMap(null));
      userMarker?.setMap(null);
      mapInstance = null;
    };
  }, [apiKey, userLatLng, visibleCourts]);

  if (!apiKey || !userLatLng) {
    return null;
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl border border-slate-200"
      style={{ aspectRatio: "4 / 3" }}
    />
  );
}
