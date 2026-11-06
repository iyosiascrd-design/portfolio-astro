// src/components/CaseStudyMedia.jsx
//
// Shared image / video primitives for the case-study pages.
// Replaces the near-identical Img / Video / LoopingVideo copies that lived in
// Origen, Weyra, Yimaj and Zhongshan, and centralises loading behaviour:
//   - below-the-fold images are lazy + async-decoded
//   - hero images get high fetch priority
//   - videos only fetch fully when they get near the viewport
//   - `will-change: transform` is only applied while an image is near the viewport

import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { REVEAL } from "../lib/useCaseStudyReveal"

gsap.registerPlugin(ScrollTrigger)

// Loading-hint helpers live in lib/loadingHints.js (shared with Home).
export { FETCH_PRIORITY_KEY, fetchPriorityProp, HERO_IMG_PROPS } from "../lib/loadingHints"

/* -------------------------------------------------------------------------- */
/* Layout refresh for images that define their own height                     */
/* -------------------------------------------------------------------------- */

let refreshTimer
// Lazy images that size their container (height:auto) change page height when
// they finish loading, so ScrollTrigger positions must be recalculated.
export function scheduleScrollTriggerRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150)
}

// <img> that is lazy-loaded and drives its own layout height.
export function LazyImg({ onLoad, ...props }) {
  // Video sources (.webm/.mp4) can't go in an <img>; render a muted looping video instead.
  if (isVideo(props.src || "")) {
    const { src, alt, className, ...rest } = props
    return <LoopingVideo src={src} alt={alt} className={className} mediaProps={rest} />
  }
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      loading="lazy"
      decoding="async"
      {...props}
      onLoad={(e) => {
        scheduleScrollTriggerRefresh()
        onLoad?.(e)
      }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* will-change scoping                                                        */
/* -------------------------------------------------------------------------- */

// One shared observer for every image instead of one per image.
let nearObserver
const nearHandlers = new WeakMap()

function observeNear(el, cb) {
  if (typeof IntersectionObserver === "undefined") {
    cb(true)
    return () => {}
  }
  if (!nearObserver) {
    nearObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => nearHandlers.get(e.target)?.(e.isIntersecting)),
      { rootMargin: "100% 0px 100% 0px" }
    )
  }
  nearHandlers.set(el, cb)
  nearObserver.observe(el)
  return () => {
    nearObserver.unobserve(el)
    nearHandlers.delete(el)
  }
}

/* -------------------------------------------------------------------------- */
/* Media / Img                                                                */
/* -------------------------------------------------------------------------- */

export const isVideo = (src) => /\.(webm|mp4)$/i.test(src)

// Images whose own height defines the container's height (static + h-auto).
// These stay eager: lazy-loading them would collapse the container to 0px.
const FLOW_RE = /\[&_img\]:!static/

/**
 * Shared playback logic for muted looping videos: plays only while on screen,
 * and recovers from Safari / autoplay-policy stalls (watchdog, restart on end,
 * manual frame stepping if play() is blocked, retry on first user gesture).
 */
function useVideoPlayback(videoRef, src, name, getTrigger) {
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.loop = true

    let inView = false
    let scrubbing = false
    let raf = 0
    let t0 = 0
    const tick = (ts) => {
      if (!scrubbing) return
      if (!t0) t0 = ts
      if (inView && !document.hidden && v.duration && !v.seeking) {
        v.currentTime = ((ts - t0) / 1000) % v.duration
      }
      raf = requestAnimationFrame(tick)
    }
    const startScrub = () => {
      if (scrubbing) return
      scrubbing = true
      t0 = 0
      raf = requestAnimationFrame(tick)
    }
    const stopScrub = () => {
      scrubbing = false
      cancelAnimationFrame(raf)
    }
    const play = () => {
      const p = v.play()
      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          console.warn(`${name} video play() blocked, using manual playback:`, err)
          if (inView) startScrub()
        })
      }
    }
    const playIfInView = () => {
      if (inView && !document.hidden) play()
    }
    const restart = () => {
      v.currentTime = 0
      play()
    }
    const onPause = () => {
      if (inView && !document.hidden && !v.ended) play()
    }
    const onVisible = () => {
      if (!document.hidden && inView && v.paused) play()
    }
    const onError = () => console.warn(`${name} video failed to load`, v.error, v.currentSrc)
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)
    const onTime = () => {
      if (!isSafari || scrubbing) return
      if (v.duration && v.currentTime >= v.duration - 0.12) restart()
    }
    let lastT = -1
    let frozen = 0
    const watchdog = setInterval(() => {
      if (!inView || document.hidden || v.seeking || scrubbing) return
      if (v.paused || v.ended) {
        play()
        frozen = 0
      } else if (v.currentTime === lastT) {
        frozen += 1
        if (frozen >= 2) {
          frozen = 0
          restart()
        }
      } else {
        frozen = 0
      }
      lastT = v.currentTime
    }, 1500)

    const onPlaying = () => stopScrub()
    const onGesture = () => {
      if (inView && v.paused) play()
    }
    v.addEventListener("playing", onPlaying)
    window.addEventListener("pointerdown", onGesture, { passive: true })
    window.addEventListener("keydown", onGesture)
    window.addEventListener("touchstart", onGesture, { passive: true })
    v.addEventListener("ended", restart)
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("pause", onPause)
    v.addEventListener("canplay", playIfInView)
    v.addEventListener("loadeddata", playIfInView)
    v.addEventListener("stalled", playIfInView)
    v.addEventListener("error", onError, true)
    document.addEventListener("visibilitychange", onVisible)

    let io
    let warmIo
    let first = true
    const trigger = getTrigger(v)
    if (trigger && typeof IntersectionObserver !== "undefined") {
      // Upgrade metadata -> full buffering one viewport before the video is visible.
      warmIo = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            v.preload = "auto"
            warmIo.disconnect()
          }
        },
        { rootMargin: "100% 0px", threshold: 0 }
      )
      warmIo.observe(trigger)

      io = new IntersectionObserver(
        (entries) => {
          inView = entries.some((e) => e.isIntersecting)
          if (!inView) return
          if (v.preload !== "auto") v.preload = "auto"
          if (first) {
            first = false
            v.currentTime = 0
            play()
          } else if (v.paused) {
            play()
          }
        },
        { rootMargin: REVEAL.rootMargin, threshold: 0 }
      )
      io.observe(trigger)
    } else {
      inView = true
      v.preload = "auto"
      play()
    }

    return () => {
      clearInterval(watchdog)
      stopScrub()
      v.removeEventListener("playing", onPlaying)
      window.removeEventListener("pointerdown", onGesture)
      window.removeEventListener("keydown", onGesture)
      window.removeEventListener("touchstart", onGesture)
      v.removeEventListener("ended", restart)
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("pause", onPause)
      v.removeEventListener("canplay", playIfInView)
      v.removeEventListener("loadeddata", playIfInView)
      v.removeEventListener("stalled", playIfInView)
      v.removeEventListener("error", onError, true)
      document.removeEventListener("visibilitychange", onVisible)
      io?.disconnect()
      warmIo?.disconnect()
    }
  }, [src, name]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function LoopingVideo({ src, alt, className, mediaProps = {} }) {
  const ref = useRef(null)
  const mp4 = src.replace(/\.webm$/i, ".mp4")

  const setRef = (el) => {
    ref.current = el
    if (el) {
      el.muted = true
      el.defaultMuted = true
      el.setAttribute("muted", "")
      el.setAttribute("playsinline", "")
    }
  }

  useVideoPlayback(ref, src, "looping", (v) => v)

  return (
    <video
      ref={setRef}
      aria-label={alt}
      muted
      loop
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      preload="metadata"
      className={className}
      {...mediaProps}
    >
      <source src={mp4} type="video/mp4" />
      <source src={src} type="video/webm" />
    </video>
  )
}

export function Media({ src, alt, className, mediaProps = {}, lazy = true }) {
  if (isVideo(src)) {
    return <LoopingVideo src={src} alt={alt} className={className} mediaProps={mediaProps} />
  }
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      src={src}
      alt={alt}
      decoding="async"
      {...(lazy ? { loading: "lazy" } : {})}
      className={className}
      {...mediaProps}
    />
  )
}

/**
 * Case-study image block.
 *   placeholder  - Tailwind bg class shown behind the image until it loads
 *                  (skipped when `className` already sets its own bg-*)
 *   hideOnError  - hide the <img> if it fails to load
 *   natural      - render at natural height instead of filling an aspect box
 */
export function Img({
  src,
  alt,
  ratio,
  className = "",
  imgClassName = "",
  parallax = true,
  fade = false,
  rounded = true,
  natural = false,
  placeholder = "",
  hideOnError = false,
}) {
  const wrapRef = useRef(null)
  const flow = FLOW_RE.test(className)
  const roundingClass = rounded ? "rounded-lg md:rounded-[12px]" : ""
  const bg = placeholder && !/(^|\s)bg-/.test(className) ? placeholder : ""

  // Only keep the image on its own GPU layer while it is near the viewport.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || natural || flow) return
    return observeNear(wrap, (near) => {
      const el = wrap.firstElementChild
      if (el) el.style.willChange = near ? "transform" : ""
    })
  }, [natural, flow])

  if (natural) {
    return (
      <div
        data-reveal
        {...(fade ? { "data-fade": "" } : {})}
        className={`relative w-full overflow-hidden rounded-lg md:rounded-[12px] ${className}`}
      >
        <LazyImg src={src} alt={alt} className={`block w-full h-auto ${imgClassName}`} />
      </div>
    )
  }

  const mediaProps = {
    ...(parallax ? { "data-parallax": "" } : {}),
    ...(hideOnError ? { onError: (e) => (e.currentTarget.style.visibility = "hidden") } : {}),
  }

  return (
    <div
      ref={wrapRef}
      data-reveal
      {...(fade ? { "data-fade": "" } : {})}
      className={`relative isolate w-full overflow-hidden ${roundingClass} ${bg} ${ratio} lg:aspect-auto ${className}`}
    >
      <Media
        src={src}
        alt={alt}
        lazy={!flow}
        mediaProps={mediaProps}
        className={`absolute inset-0 w-full h-full object-cover rounded-[inherit] ${imgClassName}`}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* SceneVideo (formerly Yimaj `Video` / Zhongshan `Video`)                     */
/* -------------------------------------------------------------------------- */

/**
 * Muted looping scene video with Safari/autoplay fallbacks.
 *   name            - prefix for the CSS hook class and console warnings
 *   videoClassName  - position/size classes for the <video> element
 *   placeholder     - Tailwind bg class behind the video (skipped if className has bg-*)
 *
 * Loads metadata only until the video is within one viewport of the screen,
 * then upgrades to full preload.
 */
export function SceneVideo({
  src,
  label,
  ratio,
  className = "",
  name = "scene",
  videoClassName = "absolute inset-0 w-full h-full",
  placeholder = "",
}) {
  const bg = placeholder && !/(^|\s)bg-/.test(className) ? placeholder : ""
  const videoRef = useRef(null)
  const mp4 = src.replace(/\.webm$/i, ".mp4")

  const setRef = (el) => {
    videoRef.current = el
    if (el) {
      el.muted = true
      el.defaultMuted = true
      el.setAttribute("muted", "")
      el.setAttribute("playsinline", "")
    }
  }

  useVideoPlayback(videoRef, src, name, (v) => v.parentElement?.parentElement || v.parentElement)

  return (
    <div
      data-reveal
      data-fade
      className={`relative w-full overflow-hidden rounded-lg md:rounded-[12px] ${bg} ${ratio} lg:aspect-auto ${className}`}
    >
      <style>{`
        .${name}-video::-webkit-media-controls,
        .${name}-video::-webkit-media-controls-panel,
        .${name}-video::-webkit-media-controls-play-button,
        .${name}-video::-webkit-media-controls-start-playback-button,
        .${name}-video::-webkit-media-controls-overlay-play-button,
        .${name}-video::-webkit-media-controls-enclosure { display: none !important; opacity: 0 !important; -webkit-appearance: none; }
      `}</style>
      <video
        ref={setRef}
        aria-label={label}
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        loop
        muted
        playsInline
        preload="metadata"
        className={`${name}-video ${videoClassName} object-cover pointer-events-none will-change-transform [transform:translateZ(0)] [backface-visibility:hidden]`}
      >
        <source src={mp4} type="video/mp4" />
        <source src={src} type="video/webm" />
      </video>
    </div>
  )
}