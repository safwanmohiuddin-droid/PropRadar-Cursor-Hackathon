"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Small map. Uses Mapbox GL when NEXT_PUBLIC_MAPBOX_TOKEN is set; otherwise
 * renders a styled coordinate placeholder so the demo works with no token.
 */
export default function MiniMap({
  latitude,
  longitude,
  label,
  height = 180,
}: {
  latitude: number;
  longitude: number;
  label?: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !ref.current) return;
    let map: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (!document.getElementById("mapbox-gl-css")) {
          const link = document.createElement("link");
          link.id = "mapbox-gl-css";
          link.rel = "stylesheet";
          link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
          document.head.appendChild(link);
        }
        if (cancelled || !ref.current) return;
        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
          container: ref.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [longitude, latitude],
          zoom: 12,
          attributionControl: false,
        });
        new mapboxgl.Marker({ color: "#6366f1" }).setLngLat([longitude, latitude]).addTo(map as never);
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [token, latitude, longitude]);

  if (!token || failed) {
    return (
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-lg border border-line bg-surface"
        style={{ height }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative text-center">
          <div className="text-2xl">📍</div>
          <p className="mt-1 text-xs text-zinc-400">{label}</p>
          <p className="font-mono text-[10px] text-zinc-600">
            {latitude.toFixed(3)}, {longitude.toFixed(3)}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={ref} className="overflow-hidden rounded-lg border border-line" style={{ height }} />;
}
