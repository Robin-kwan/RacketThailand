"use client";

import { memo, useEffect, useRef } from "react";
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

let googleMapsPromise: Promise<typeof google> | null = null;

const loadGoogleMaps = (apiKey: string) => {
  googleMapsPromise ??= new Loader({
    apiKey,
    version: "weekly",
    libraries: ["marker"],
  }).load();
  return googleMapsPromise;
};

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
      pane?.appendChild(this.div);
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

function areCourtsEqual(previous: NearbyMapCourt[], next: NearbyMapCourt[]) {
  if (previous.length !== next.length) return false;
  return previous.every((court, index) => {
    const nextCourt = next[index];
    return (
      nextCourt &&
      court.id === nextCourt.id &&
      court.name === nextCourt.name &&
      court.latitude === nextCourt.latitude &&
      court.longitude === nextCourt.longitude &&
      court.href === nextCourt.href
    );
  });
}

function NearbyMapComponent({ userLocation, courts }: NearbyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const courtsRef = useRef(courts);
  const courtMarkersRef = useRef<Array<() => void>>([]);
  const labelOverlaysRef = useRef<google.maps.OverlayView[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const lastMarkersKeyRef = useRef("");
  const lastCenterKeyRef = useRef("");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const visibleCourtsKey = courts
    .slice(0, 15)
    .map((court) =>
      [
        court.id,
        court.name ?? "",
        court.latitude,
        court.longitude,
        court.href,
      ].join(":"),
    )
    .join("|");
  const userLat = Number(userLocation?.latitude);
  const userLng = Number(userLocation?.longitude);
  const hasUserLatLng = Number.isFinite(userLat) && Number.isFinite(userLng);

  useEffect(() => {
    courtsRef.current = courts;
  }, [courts]);

  useEffect(() => {
    return () => {
      courtMarkersRef.current.forEach((clearMarker) => clearMarker());
      courtMarkersRef.current = [];
      labelOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      labelOverlaysRef.current = [];
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      mapInstanceRef.current = null;
      lastMarkersKeyRef.current = "";
      lastCenterKeyRef.current = "";
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !hasUserLatLng || !apiKey) {
      return;
    }
    const userLatLng = { lat: userLat, lng: userLng };
    const centerKey = `${userLatLng.lat},${userLatLng.lng}`;
    let isActive = true;

    loadGoogleMaps(apiKey).then(() => {
      if (!mapRef.current || !isActive) return;
      const maps = window.google?.maps;
      if (!maps) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new maps.Map(mapRef.current, {
          ...mapOptions,
          center: userLatLng,
        });
        lastCenterKeyRef.current = centerKey;
      } else if (lastCenterKeyRef.current !== centerKey) {
        mapInstanceRef.current.setCenter(userLatLng);
        lastCenterKeyRef.current = centerKey;
      }

      if (!userMarkerRef.current) {
        userMarkerRef.current = new maps.Marker({
          map: mapInstanceRef.current,
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
      } else {
        userMarkerRef.current.setPosition(userLatLng);
      }

      if (lastMarkersKeyRef.current === visibleCourtsKey) {
        return;
      }
      courtMarkersRef.current.forEach((clearMarker) => clearMarker());
      courtMarkersRef.current = [];
      labelOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      labelOverlaysRef.current = [];
      lastMarkersKeyRef.current = visibleCourtsKey;

      const AdvancedMarker = window.google?.maps?.marker
        ?.AdvancedMarkerElement;
      const canUseAdvancedMarker = Boolean(MAP_ID && AdvancedMarker);
      const visibleCourts = courtsRef.current.slice(0, 15);

      visibleCourts.forEach((court) => {
        if (canUseAdvancedMarker) {
          const labelContent = createCourtLabel(
            court.name ?? "Court",
            court.href,
          );
          const marker = new AdvancedMarker({
            map: mapInstanceRef.current as google.maps.Map,
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
          courtMarkersRef.current.push(() => {
            (marker as google.maps.marker.AdvancedMarkerElement).map = null;
          });
        } else {
          const fallbackMarker = new maps.Marker({
            map: mapInstanceRef.current as google.maps.Map,
            position: {
              lat: Number(court.latitude),
              lng: Number(court.longitude),
            },
            title: court.name ?? "Court",
          });
          fallbackMarker.addListener("click", () => {
            window.open(court.href, "_blank", "noopener,noreferrer");
          });
          courtMarkersRef.current.push(() => fallbackMarker.setMap(null));
          if (court.name) {
            const overlay = createLabelOverlay(
              maps,
              mapInstanceRef.current as google.maps.Map,
              {
                lat: Number(court.latitude),
                lng: Number(court.longitude),
              },
              court.name,
              court.href,
            );
            labelOverlaysRef.current.push(overlay);
          }
        }
      });
    });

    return () => {
      isActive = false;
    };
  }, [apiKey, hasUserLatLng, userLat, userLng, visibleCourtsKey]);

  if (!apiKey || !hasUserLatLng) {
    return null;
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg border border-slate-200"
      style={{ aspectRatio: "4 / 3" }}
    />
  );
}

export const NearbyMap = memo(NearbyMapComponent, (previous, next) => {
  const previousLocation = previous.userLocation;
  const nextLocation = next.userLocation;
  const sameLocation =
    previousLocation?.latitude === nextLocation?.latitude &&
    previousLocation?.longitude === nextLocation?.longitude;
  return sameLocation && areCourtsEqual(previous.courts, next.courts);
});
