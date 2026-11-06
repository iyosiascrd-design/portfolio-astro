// src/lib/mediaPreload.js
//
// Warm the HTTP cache with a page's below-the-fold images, in page order, once
// the hero has loaded and the browser is idle. By the time the visitor scrolls
// to an image it is already local, so lazy-loading no longer shows blank boxes.

import { useEffect } from "react"
import { whenIdle } from "./loadingHints"

const cache = new Map() // src -> Promise<boolean>
const isVideoSrc = (s) => /\.(webm|mp4)$/i.test(s)

// Don't burn data for people who asked us not to (or who are on a very slow link).
function saveDataOn() {
  const c = typeof navigator !== "undefined" ? navigator.connection : null
  return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))
}

export function preloadImage(src) {
  if (cache.has(src)) return cache.get(src)
  const p = new Promise((resolve) => {
    const img = new Image()
    img.decoding = "async"
    if ("fetchPriority" in img) img.fetchPriority = "low" // never compete with the hero
    img.onload = () => {
      const d = img.decode ? img.decode() : Promise.resolve()
      d.catch(() => {}).then(() => resolve(true))
    }
    img.onerror = () => resolve(false)
    img.src = src
  })
  cache.set(src, p)
  return p
}

/**
 * Resolves when every <img> inside `el` has loaded (or failed), or after `max` ms.
 * Used so a reveal animation doesn't play on an empty box.
 */
export function waitForMedia(el, max = 700) {
  const pending = Array.from(el.querySelectorAll("img")).filter((i) => !i.complete)
  if (!pending.length) return Promise.resolve()
  return new Promise((resolve) => {
    let left = pending.length
    const timer = setTimeout(resolve, max)
    const done = () => {
      if (--left <= 0) {
        clearTimeout(timer)
        resolve()
      }
    }
    pending.forEach((i) => {
      i.addEventListener("load", done, { once: true })
      i.addEventListener("error", done, { once: true })
    })
  })
}

/**
 * useIdlePreload(srcs, enabled)
 * srcs: image URLs in the order they appear on the page (videos are skipped;
 *       they already warm themselves in CaseStudyMedia).
 */
export function useIdlePreload(srcs, enabled = true, { concurrency = 2 } = {}) {
  useEffect(() => {
    if (!enabled || saveDataOn()) return
    const list = [...new Set(srcs)].filter((s) => s && !isVideoSrc(s))
    if (!list.length) return

    let dead = false
    let cancelIdle = () => {}
    let heroTimer
    let heroEl

    const run = () => {
      let i = 0
      const next = () => {
        if (dead || i >= list.length) return
        preloadImage(list[i++]).then(next)
      }
      for (let k = 0; k < concurrency; k++) next()
    }
    const start = () => {
      if (dead) return
      cancelIdle = whenIdle(run, 2000)
    }

    // Wait for the hero so we never steal bandwidth from it (3s safety cap).
    heroEl = document.querySelector("[data-hero-img]")
    if (!heroEl || heroEl.complete) {
      start()
    } else {
      const go = () => {
        clearTimeout(heroTimer)
        heroEl.removeEventListener("load", go)
        heroEl.removeEventListener("error", go)
        start()
      }
      heroEl.addEventListener("load", go)
      heroEl.addEventListener("error", go)
      heroTimer = setTimeout(go, 3000)
    }

    return () => {
      dead = true
      clearTimeout(heroTimer)
      cancelIdle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, srcs.join("|")])
}