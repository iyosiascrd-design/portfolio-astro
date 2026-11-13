// src/components/MobileImageGroups.jsx
//
// Mobile-only (< 768px). Takes a run of consecutive images and packs them into
// groups that each fill exactly one viewport height (header and page padding
// excluded). Grouping follows the images' natural aspect ratios; inside a group
// each image is stretched (cropped with object-cover) so the group fills the
// height exactly. Scroll down and the next group appears.
// The gap between images (and between groups) equals the page side padding.

import React, { useLayoutEffect, useRef, useState } from "react"

const MAX_PER_GROUP = 4

export function useIsMobile() {
  const query = "(max-width: 767px)"
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  )
  useLayoutEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMobile(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return mobile
}

function packGroups(natural, height, gap) {
  const groups = []
  let cur = []
  let sum = 0

  natural.forEach((h, i) => {
    if (!cur.length) {
      cur = [i]
      sum = h
      return
    }
    const withNext = sum + gap + h
    const closer = Math.abs(withNext - height) < Math.abs(sum - height)
    if (closer && cur.length < MAX_PER_GROUP) {
      cur.push(i)
      sum = withNext
    } else {
      groups.push({ ids: cur, sum })
      cur = [i]
      sum = h
    }
  })
  if (cur.length) groups.push({ ids: cur, sum })

  // A short leftover at the end would be stretched far too much: fold it into
  // the previous group instead.
  const last = groups[groups.length - 1]
  if (groups.length > 1 && last.sum < height * 0.55) {
    const prev = groups[groups.length - 2]
    if (prev.ids.length < MAX_PER_GROUP + 1) {
      prev.ids = prev.ids.concat(last.ids)
      groups.pop()
    }
  }
  return groups.map((g) => g.ids)
}

/**
 * items: [{
 *   id: string,
 *   ratio: number,          // natural width / height, e.g. 1472 / 867
 *   ratioClass: string,     // same ratio as a literal Tailwind class, e.g. "aspect-[1472/867]"
 *   bg?: "light" | "dark",  // data-header-bg for the header colour switch
 *   render: ({ ratio, className }) => ReactNode,
 * }]
 * padVar: the CSS variable holding the page padding ("--page-pad" or "--cs-gap").
 */
export default function MobileImageGroups({ items, padVar = "--page-pad" }) {
  const rootRef = useRef(null)
  const probeRef = useRef(null)
  const gapProbeRef = useRef(null)
  const [size, setSize] = useState(null)

  const groupHeight = `calc(100svh - var(--header-h,64px) - 2 * var(${padVar}))`

  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current
      const probe = probeRef.current
      const gapProbe = gapProbeRef.current
      if (!root || !probe || !gapProbe) return
      const w = root.clientWidth
      const h = probe.offsetHeight
      const g = gapProbe.offsetWidth
      if (!w || !h) return
      setSize((prev) =>
        prev && prev.w === w && prev.h === h && prev.g === g ? prev : { w, h, g }
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(rootRef.current)
    window.addEventListener("orientationchange", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("orientationchange", measure)
    }
  }, [])

  const natural = size ? items.map((it) => size.w / it.ratio) : null
  const groups = size ? packGroups(natural, size.h, size.g) : null

  return (
    <div ref={rootRef} className="relative w-full flex flex-col" style={{ gap: `var(${padVar})` }}>
      <div
        ref={gapProbeRef}
        aria-hidden="true"
        style={{ position: "absolute", height: 0, width: `var(${padVar})`, visibility: "hidden", pointerEvents: "none" }}
      />
      <div
        ref={probeRef}
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: groupHeight, visibility: "hidden", pointerEvents: "none" }}
      />

      {!groups &&
        items.map((it) => (
          <div key={it.id} data-header-bg={it.bg} className="w-full">
            {it.render({ ratio: it.ratioClass, className: "" })}
          </div>
        ))}

      {groups &&
        groups.map((ids) => (
          <div
            key={ids.map((i) => items[i].id).join("|")}
            className="w-full flex flex-col"
            style={{ height: groupHeight, gap: `var(${padVar})` }}
          >
            {ids.map((i) => (
              <div
                key={items[i].id}
                data-header-bg={items[i].bg}
                className="relative w-full min-h-0"
                style={{ flex: `${natural[i]} 1 0%` }}
              >
                {items[i].render({ ratio: "aspect-auto", className: "!aspect-auto h-full w-full" })}
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}