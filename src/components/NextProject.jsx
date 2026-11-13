// src/components/NextProject.jsx
import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { usePageTransition } from "./PageTransitionOverlay"

export const PROJECTS = [
  { slug: "weyra", route: "/work/weyra", title: "Weyra", disciplines: ["Brand Identity"], year: "2023", hero: "/weyra-hero.jpg" },
  { slug: "yimaj", route: "/work/yimaj", title: "Yimaj", disciplines: ["Brand Identity", "3D Visuals"], year: "2025", hero: "/yimaj-hero.jpg" },
  { slug: "origen", route: "/work/origen", title: "Origen", disciplines: ["Brand Identity"], year: "2025", hero: "/origen-hero.jpg" },
  { slug: "zhongshan", route: "/work/zhongshan", title: "Zhongshan", disciplines: ["Brand Identity", "3D Visuals"], year: "2026", hero: "/zhongshan-house.jpg" },
]

const SHOW_MARGIN = "0px 0px -5% 0px"

export default function NextProject({ current }) {
  const pageTransition = usePageTransition()
  const rowRef = useRef(null)
  const [visible, setVisible] = useState(false)

  const index = PROJECTS.findIndex((p) => p.slug === current)
  const next = PROJECTS[(index + 1) % PROJECTS.length]
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length]

  useEffect(() => {
    const el = rowRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: SHOW_MARGIN, threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const go = (e, route) => {
    if (!pageTransition?.triggerTransition) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    pageTransition.triggerTransition(route)
  }

  return (
    <div ref={rowRef} className="relative z-40 w-full flex items-center justify-between pt-[32px] pb-[var(--cs-gap)] overflow-hidden">
      
      {/* BACK Button */}
      <Link
        to={prev.route}
        onClick={(e) => go(e, prev.route)}
        className="group flex items-center text-[var(--text-light-primary)]"
      >
        {/* Thumbnail */}
        <div
          className="hidden md:block w-0 opacity-0 overflow-hidden rounded-lg md:rounded-[12px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none group-hover:w-[96px] group-hover:opacity-100 group-hover:mr-[16px] h-[54px]"
        >
          <img 
            src={prev.hero} 
            alt={`Previous project: ${prev.title}`} 
            className="block w-full h-full object-cover object-center" 
          />
        </div>

        <span
          className={`block pb-[0.04em] [font-family:var(--font-heading)] font-medium uppercase text-[clamp(32px,3.3vw,64px)] leading-[1.02] tracking-[-0.04em] transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            visible ? "translate-y-0" : "translate-y-[110%]"
          }`}
        >
          BACK
        </span>
      </Link>

      {/* NEXT Button */}
      <Link
        to={next.route}
        onClick={(e) => go(e, next.route)}
        className="group flex items-center justify-end text-[var(--text-light-primary)]"
      >
        <span
          className={`block pb-[0.04em] [font-family:var(--font-heading)] font-medium uppercase text-[clamp(32px,3.3vw,64px)] leading-[1.02] tracking-[-0.04em] transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            visible ? "translate-y-0" : "translate-y-[110%]"
          }`}
        >
          NEXT
        </span>

        {/* Thumbnail */}
        <div
          className="hidden md:block w-0 opacity-0 overflow-hidden rounded-lg md:rounded-[12px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none group-hover:w-[96px] group-hover:opacity-100 group-hover:ml-[16px] h-[54px]"
        >
          <img 
            src={next.hero} 
            alt={`Next project: ${next.title}`} 
            className="block w-full h-full object-cover object-center" 
          />
        </div>
      </Link>

    </div>
  )
}