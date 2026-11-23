// src/lib/useCaseStudyReveal.js

import { useLayoutEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { waitForMedia } from "./mediaPreload"

gsap.registerPlugin(ScrollTrigger)

export const REVEAL = {
  imageWait: 700,         // ms: max time a reveal waits for its image before playing anyway
  rise: 72,               // Enough vertical travel to clearly read as a slide-up against scroll
  duration: 0.95,         // Snappy total time, zero sluggish tail
  opacityDuration: 0.45,  // Hits full opacity fast so you see the majority of the upward slide
  rowStagger: 0.1,        // Vertical stagger between rows
  colStagger: 0.14,       // Clear left-to-right cascade on 2-up and 3-up grids
  maxDelay: 0.32,         // Cap delay for multi-item batches
  ease: "power2.out",     // Keeps movement visible throughout the duration instead of front-loading it
  rootMargin: "0px 0px -16% 0px", // Fires once the frame is clearly inside the viewport

  // Clip-path wipe (images / video). Text blocks keep the slide-up above.
  wipeFrom: "inset(0% 0% 100% 0%)", // fully hidden; the wipe reveals downward from the top edge
  wipeTo: "inset(0% 0% 0% 0%)",
  wipeDuration: 1.15,
  wipeEase: "power3.inOut",
}

// Parallax: media height as % of its frame, and how far it slides (yPercent of its own height each way).
// travel must stay under (heightPct - 100) / 2 / (heightPct / 100) or an edge will show.
export const PARALLAX = {
  desktop: { heightPct: 115, travel: 6 },
  mobile: { heightPct: 112, travel: 4.5 },
  scrub: 0, // 0 = locked to scroll like Osmo; raise (e.g. 0.6) for a softer lag
}

// <el data-reveal>            auto: wipe if it holds only media, slide-up if it holds text
// <el data-reveal="wipe">     force the clip-path wipe
// <el data-reveal="slide">    force the slide-up
const canClip = () =>
  typeof CSS !== "undefined" && !!CSS.supports?.("clip-path", "inset(0% 0% 0% 0%)")

const usesWipe = (el) => {
  if (!canClip()) return false
  const mode = el.getAttribute("data-reveal")
  if (mode === "wipe") return true
  if (mode === "slide") return false
  const hasMedia = el.matches("img, video") || !!el.querySelector("img, video")
  return hasMedia && el.textContent.trim() === ""
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export function useCaseStudyReveal(rootRef) {
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current) return

    let revealIO = null
    let dead = false
    const oversized = []
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray("[data-reveal]")

      const wipeItems = items.filter(usesWipe)
      const slideItems = items.filter((el) => !wipeItems.includes(el))

      gsap.set(slideItems, { y: REVEAL.rise, opacity: 0, force3D: true })
      gsap.set(wipeItems, { clipPath: REVEAL.wipeFrom, y: 0, opacity: 1 })

      let pending = []
      let flushTimer = null

      const flush = () => {
        flushTimer = null
        const batch = pending.sort((x, y) => {
          const rx = x.getBoundingClientRect()
          const ry = y.getBoundingClientRect()
          return Math.abs(rx.top - ry.top) > 8 ? rx.top - ry.top : rx.left - ry.left
        })
        pending = []

        // Hold the batch until its images have arrived (capped), so the slide-up
        // plays on a finished picture instead of an empty box.
        Promise.all(batch.map((el) => waitForMedia(el, REVEAL.imageWait))).then(() => {
          if (!dead) play(batch)
        })
      }

      const play = (batch) => {
        let rowIdx = -1
        let colIdx = 0
        let rowTop = null

        batch.forEach((el) => {
          const top = el.getBoundingClientRect().top
          if (rowTop === null || Math.abs(top - rowTop) > 8) {
            rowIdx += 1
            colIdx = 0
            rowTop = top
          } else {
            colIdx += 1
          }

          const rawDelay = rowIdx * REVEAL.rowStagger + colIdx * REVEAL.colStagger
          const delay = Math.min(rawDelay, REVEAL.maxDelay)

          if (wipeItems.includes(el)) {
            gsap.fromTo(
              el,
              { clipPath: REVEAL.wipeFrom },
              {
                clipPath: REVEAL.wipeTo,
                duration: REVEAL.wipeDuration,
                ease: REVEAL.wipeEase,
                delay,
                overwrite: "auto",
                clearProps: "clipPath", // leave no inline clip-path once revealed
              }
            )
            return
          }

          gsap.fromTo(
            el,
            { opacity: 0 },
            {
              opacity: 1,
              duration: REVEAL.opacityDuration,
              ease: "power1.out",
              delay,
              overwrite: "auto",
            }
          )

          gsap.fromTo(
            el,
            { y: REVEAL.rise },
            {
              y: 0,
              duration: REVEAL.duration,
              ease: REVEAL.ease,
              delay,
              force3D: true,
              overwrite: "auto",
            }
          )
        })
      }

      revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            revealIO.unobserve(entry.target)
            pending.push(entry.target)
          })
          if (pending.length && !flushTimer) flushTimer = setTimeout(flush, 32)
        },
        { rootMargin: REVEAL.rootMargin, threshold: 0 }
      )

      items.forEach((el) => revealIO.observe(el))

      // Osmo-style parallax: the media is made taller than its frame and slid with yPercent
      // (no zoom). The spare height is what stops an empty edge from showing.
      const desktop = window.matchMedia("(min-width: 1024px)").matches
      const par = desktop ? PARALLAX.desktop : PARALLAX.mobile

      gsap.utils.toArray("[data-parallax]").forEach((img) => {
        const parent = img.parentElement
        const clipped =
          parent && /hidden|clip/.test(getComputedStyle(parent).overflow) &&
          getComputedStyle(img).position === "absolute"

        if (clipped) {
          // oversize and centre the media inside its clipped frame; !important beats the h-full classes
          img.style.setProperty("height", `${par.heightPct}%`, "important")
          img.style.setProperty("top", `${-(par.heightPct - 100) / 2}%`, "important")
          img.style.setProperty("bottom", "auto", "important")
          oversized.push(img)
        }

        const from = clipped ? { yPercent: -par.travel, scale: 1 } : { scale: 1.06, yPercent: -2 }
        const to = clipped ? { yPercent: par.travel, scale: 1 } : { scale: 1.04, yPercent: 2 }

        gsap.fromTo(img, from, {
          ...to,
          ease: "none",
          scrollTrigger: {
            trigger: img.closest("[data-reveal]") || img.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: PARALLAX.scrub,
          },
        })
      })
    }, rootRef)

    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener("load", onLoad)

    return () => {
      window.removeEventListener("load", onLoad)
      dead = true
      revealIO?.disconnect()
      ctx.revert()
      oversized.forEach((el) => {
        el.style.removeProperty("height")
        el.style.removeProperty("top")
        el.style.removeProperty("bottom")
      })
    }
  }, [rootRef])
}