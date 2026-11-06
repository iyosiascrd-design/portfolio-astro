// src/lib/useCaseStudyReveal.js

import { useLayoutEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export const REVEAL = {
  rise: 72,               // Enough vertical travel to clearly read as a slide-up against scroll
  duration: 0.95,         // Snappy total time, zero sluggish tail
  opacityDuration: 0.45,  // Hits full opacity fast so you see the majority of the upward slide
  rowStagger: 0.1,        // Vertical stagger between rows
  colStagger: 0.14,       // Clear left-to-right cascade on 2-up and 3-up grids
  maxDelay: 0.32,         // Cap delay for multi-item batches
  ease: "power2.out",     // Keeps movement visible throughout the duration instead of front-loading it
  rootMargin: "0px 0px -16% 0px", // Fires once the frame is clearly inside the viewport
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export function useCaseStudyReveal(rootRef, lenisRef) {
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current) return

    let revealIO = null
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray("[data-reveal]")

      gsap.set(items, { y: REVEAL.rise, opacity: 0, force3D: true })

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

      const desktop = window.matchMedia("(min-width: 1024px)").matches
      const par = desktop
        ? { from: { scale: 1.08, yPercent: -3 }, to: { scale: 1.06, yPercent: 3 } }
        : { from: { scale: 1.06, yPercent: -2 }, to: { scale: 1.04, yPercent: 2 } }

      gsap.utils.toArray("[data-parallax]").forEach((img) => {
        gsap.fromTo(
          img,
          par.from,
          {
            ...par.to,
            ease: "none",
            scrollTrigger: {
              trigger: img.closest("[data-reveal]") || img.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          }
        )
      })
    }, rootRef)

    const lenis = lenisRef?.current
    lenis?.on("scroll", ScrollTrigger.update)

    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener("load", onLoad)

    return () => {
      window.removeEventListener("load", onLoad)
      lenis?.off("scroll", ScrollTrigger.update)
      revealIO?.disconnect()
      ctx.revert()
    }
  }, [rootRef, lenisRef])
}