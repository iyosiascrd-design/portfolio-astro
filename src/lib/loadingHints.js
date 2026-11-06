// src/lib/loadingHints.js
//
// Tiny helpers for resource-loading hints. Kept dependency-free so any page
// (Home included) can import them without pulling in animation code.

import React from "react"

// React 19 expects `fetchPriority`; React <=18 only passes through the lowercase
// attribute (camelCase triggers an unknown-prop warning). Pick by version.
const REACT_MAJOR = parseInt(React.version, 10)
export const FETCH_PRIORITY_KEY = REACT_MAJOR >= 19 ? "fetchPriority" : "fetchpriority"

export const fetchPriorityProp = (value) => ({ [FETCH_PRIORITY_KEY]: value })

// Spread onto the first-screen hero <img> / Media of every page.
export const HERO_IMG_PROPS = {
  loading: "eager",
  decoding: "async",
  ...fetchPriorityProp("high"),
}

// Run `fn` when the browser is idle (Safari has no requestIdleCallback).
// Returns a cancel function.
export function whenIdle(fn, timeout = 2000) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 200)
  return () => clearTimeout(id)
}