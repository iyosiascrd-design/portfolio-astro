// src/lib/useCaseStudyVideoLoad.js
import { useEffect, useState } from "react"

export const VIDEO_RELEASE_GAP_MS = 700

/**
 * Releases videos one by one in page order at VIDEO_RELEASE_GAP_MS intervals
 * once the page and hero have settled, while letting near-viewport videos
 * load immediately via useNearViewportVideo.
 */
export function useQueuedVideoIndices(videoSrcs, enabled) {
  const [releasedCount, setReleasedCount] = useState(0)

  useEffect(() => {
    if (!enabled || !videoSrcs.length) {
      setReleasedCount(0)
      return
    }
    if (typeof navigator !== "undefined" && navigator.connection?.saveData) {
      setReleasedCount(0)
      return
    }

    let count = 0
    let timerId

    const step = () => {
      count += 1
      setReleasedCount(count)
      if (count < videoSrcs.length) {
        timerId = setTimeout(step, VIDEO_RELEASE_GAP_MS)
      }
    }

    timerId = setTimeout(step, 250)
    return () => clearTimeout(timerId)
  }, [enabled, videoSrcs])

  return releasedCount
}

/**
 * Returns true as soon as `enabled` is true and either:
 * 1) The target element is within `rootMargin` of the viewport, or
 * 2) The background stagger queue has reached this video's index.
 */
export function useVideoShouldLoad({
  ref,
  src,
  videoSrcs,
  releasedCount,
  enabled,
  rootMargin = "500px 0px",
}) {
  const [nearViewport, setNearViewport] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const el = ref?.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0.01 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, enabled, rootMargin])

  const videoIndex = videoSrcs.indexOf(src)
  const queuedReady = enabled && videoIndex !== -1 && releasedCount > videoIndex

  return Boolean(enabled && (nearViewport || queuedReady))
}