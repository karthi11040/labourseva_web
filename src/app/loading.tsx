"use client";

import { useEffect, useState } from "react";

type ConnectionInfo = { effectiveType?: string; saveData?: boolean };

export default function Loading() {
  const [connection, setConnection] = useState("Loading");

  useEffect(() => {
    const info = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
    if (info?.saveData || info?.effectiveType === "slow-2g" || info?.effectiveType === "2g") {
      setConnection("Slow connection · loading carefully");
    } else if (info?.effectiveType === "3g") {
      setConnection("Loading over a moderate connection");
    } else {
      setConnection("Loading LabourSeva");
    }
  }, []);

  return (
    <main className="ls-loading-screen" aria-live="polite" aria-busy="true">
      <div className="ls-loading-card">
        <div className="ls-loading-mark" aria-hidden="true">LS</div>
        <p className="ls-loading-title">Loading LabourSeva</p>
        <div className="ls-loading-spinner" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <span key={index} style={{ transform: `rotate(${index * 30}deg) translateY(-34px)` }} />)}
        </div>
        <p className="ls-loading-message">{connection}</p>
      </div>
    </main>
  );
}
