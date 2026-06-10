"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function focusHashTarget() {
  const rawHash = window.location.hash.slice(1);
  if (!rawHash) return;
  const id = decodeURIComponent(rawHash);
  const target = document.getElementById(id);
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "start", behavior: "auto" });
}

export function HashTargetFocus() {
  const pathname = usePathname();

  useEffect(() => {
    const timers = [
      window.setTimeout(focusHashTarget, 40),
      window.setTimeout(focusHashTarget, 400),
    ];
    window.addEventListener("hashchange", focusHashTarget);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("hashchange", focusHashTarget);
    };
  }, [pathname]);

  return null;
}
