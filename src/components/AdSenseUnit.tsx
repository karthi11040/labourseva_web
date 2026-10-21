"use client";

import { useEffect, useRef } from "react";

interface AdSenseUnitProps {
  slot: string;
  client?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
  testMode?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdSenseUnit({
  slot,
  client = "ca-pub-3642883735997037",
  format = "auto",
  responsive = true,
  className = "",
  testMode = false,
}: AdSenseUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch {
      // Ignore adsbygoogle repeat push errors during hot reloads
    }
  }, []);

  return (
    <div className={`adsense-wrapper overflow-hidden my-4 text-center ${className}`}>
      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
        Advertisement
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
        {...(testMode ? { "data-adtest": "on" } : {})}
      />
    </div>
  );
}
