"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import AdSenseUnit from "@/components/AdSenseUnit";

export interface ManualAdItem {
  id: string;
  title: string;
  image: string;
  link?: string;
  placement?: string;
  sortOrder?: number;
}

export interface AdSenseItem {
  id: string;
  name: string;
  slotId: string;
  format?: string;
  placement?: string;
  size?: string;
}

interface ManualAdSliderProps {
  initialAds?: ManualAdItem[];
  placement?: string;
  className?: string;
  previewMode?: boolean; // When rendered in admin preview
  fill?: boolean;
}

export default function ManualAdSlider({
  initialAds,
  placement = "HOME_SLIDER",
  className = "",
  previewMode = false,
  fill = false,
}: ManualAdSliderProps) {
  const [ads, setAds] = useState<ManualAdItem[]>(initialAds || []);
  const [adsenseUnits, setAdsenseUnits] = useState<AdSenseItem[]>([]);
  const [publisherId, setPublisherId] = useState<string>("ca-pub-3642883735997037");
  const [homeAdMode, setHomeAdMode] = useState<"MANUAL" | "ADSENSE" | "BOTH">("MANUAL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(!initialAds);

  // Fetch live ads if not supplied via props
  useEffect(() => {
    if (previewMode && initialAds) {
      setAds(initialAds);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchPromos = async () => {
      try {
        let res = await fetch(`/api/promotions?placement=${encodeURIComponent(placement)}`).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`/api/ads?placement=${encodeURIComponent(placement)}`).catch(() => null);
        }
        if (!res || !res.ok) {
          if (isMounted) setLoading(false);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!isMounted || !data) return;
        if (data.manualAds && Array.isArray(data.manualAds)) {
          setAds(data.manualAds);
        }
        if (data.adsenseUnits && Array.isArray(data.adsenseUnits)) {
          setAdsenseUnits(data.adsenseUnits);
        }
        if (data.publisherId) setPublisherId(data.publisherId);
        if (data.homeAdMode) setHomeAdMode(data.homeAdMode);
      } catch (err) {
        console.warn("Could not fetch promotional slides:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPromos();

    return () => {
      isMounted = false;
    };
  }, [placement, previewMode, initialAds]);

  // Keep index within bounds if ads change
  useEffect(() => {
    if (ads.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= ads.length) {
      setCurrentIndex(0);
    }
  }, [ads.length, currentIndex]);

  // Auto-play timer (slides every 5 seconds)
  useEffect(() => {
    if (isPaused || ads.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, ads.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const currentAd = ads[currentIndex];

  // AdSense Fallback / Mode handling
  const showAdSense = !fill && (homeAdMode === "ADSENSE" || (homeAdMode === "BOTH" && !previewMode)) && adsenseUnits.length > 0;
  const showManual = placement === "HOME_SLIDER"
    ? homeAdMode === "MANUAL" || homeAdMode === "BOTH" || previewMode || adsenseUnits.length === 0
    : ads.length > 0;

  if (loading) {
    return (
      <div className={`w-full ${fill ? "min-h-[16rem] flex-1" : "h-44 sm:h-52 md:h-64 rounded-2xl"} bg-slate-100 animate-pulse flex items-center justify-center ${className}`}>
        {!fill && <span className="text-xs font-semibold text-slate-400">Loading promotional banner...</span>}
      </div>
    );
  }

  return (
    <div className={`w-full ${fill ? "flex min-h-0 flex-1" : "space-y-4"} ${className}`}>
      {/* 1. Google AdSense Slot if configured */}
      {showAdSense && adsenseUnits.length > 0 && (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
          <AdSenseUnit
            slot={adsenseUnits[0].slotId}
            client={publisherId}
            format="horizontal"
            className="my-0"
          />
        </div>
      )}

      {/* 2. Manual Ads Slider Carousel (As in user's screenshot) */}
      {showManual && ads.length > 0 && (
        <div
          className={`relative w-full overflow-hidden select-none group ${fill ? "min-h-[16rem] flex-1 bg-slate-100" : "rounded-2xl bg-[#eff1f5] border border-slate-200/80 shadow-xs"}`}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          role="region"
          aria-label="Promotional Carousel"
        >
          {/* Banner Container */}
          <div className={`relative w-full flex items-center justify-center ${fill ? "h-full min-h-[16rem] p-0" : "h-48 sm:h-56 md:h-68 lg:h-76 p-2 sm:p-4"}`}>
            {ads.map((ad, idx) => {
              const isActive = idx === currentIndex;
              const content = (
                <div
                  className={`absolute inset-0 flex items-center justify-center ${fill ? "p-0" : "p-2 sm:p-4"} transition-all duration-500 ease-in-out ${
                    isActive
                      ? "opacity-100 scale-100 pointer-events-auto z-10"
                      : "opacity-0 scale-98 pointer-events-none z-0"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.image}
                    alt={ad.title || "Promotional Banner"}
                    className={`max-h-full max-w-full ${fill ? "h-full w-full rounded-none object-contain" : "rounded-lg object-contain drop-shadow-xs transition-transform duration-300 hover:scale-[1.01]"}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                </div>
              );

              if (ad.link && ad.link.trim()) {
                const isExternal = ad.link.startsWith("http://") || ad.link.startsWith("https://");
                return isExternal ? (
                  <a
                    key={ad.id || idx}
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contents"
                  >
                    {content}
                  </a>
                ) : (
                  <Link key={ad.id || idx} href={ad.link} className="contents">
                    {content}
                  </Link>
                );
              }

              return <div key={ad.id || idx} className="contents">{content}</div>;
            })}

            {/* Left Chevron Navigation Button */}
            {ads.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md active:scale-95 cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Right Chevron Navigation Button */}
            {ads.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md active:scale-95 cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>

          {/* Bottom Dot Indicators */}
          {ads.length > 1 && !fill && (
            <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1.5 sm:gap-2">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex
                      ? "w-6 sm:w-8 bg-[#1e3a8a] shadow-xs"
                      : "w-2 sm:w-2.5 bg-slate-400/50 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
