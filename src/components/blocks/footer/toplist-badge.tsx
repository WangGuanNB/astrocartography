"use client";

import { useEffect, useRef } from "react";

const TOPLIST_ID = "1841305";

/**
 * TOPlist.cz traffic counter badge (full script behavior).
 * Renders link + noscript fallback; in JS, injects tracking img with referrer/title/URL/screen.
 */
export default function ToplistBadge() {
  const containerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof document === "undefined") return;
    const d = document;
    const e = encodeURIComponent;
    const s = window.screen;
    const params =
      `id=${TOPLIST_ID}&http=` +
      e(d.referrer || "") +
      "&t=" +
      e(d.title || "") +
      "&l=" +
      e(d.URL || "") +
      "&wi=" +
      e(String(s.width)) +
      "&he=" +
      e(String(s.height)) +
      "&cd=" +
      e(String(s.colorDepth || ""));
    el.innerHTML = `<img src="https://toplist.cz/count.asp?${params}" width="88" height="31" border="0" alt="TOPlist" />`;
  }, []);

  return (
    <a
      ref={containerRef}
      href="https://www.toplist.cz"
      id={`toplistcz${TOPLIST_ID}`}
      title="TOPlist"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block opacity-60 hover:opacity-80 transition-opacity"
    >
      <noscript>
        <img
          src={`https://toplist.cz/count.asp?id=${TOPLIST_ID}&njs=1`}
          width={88}
          height={31}
          border={0}
          alt="TOPlist"
        />
      </noscript>
    </a>
  );
}
