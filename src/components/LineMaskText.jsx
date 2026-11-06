// src/components/LineMaskText.jsx
//
// Mask reveal for paragraphs, staggered by *rendered* line. The text is
// measured in the browser, split into the lines it actually wraps to at the
// current width, and each line slides up out of its own mask. Re-splits when
// the width changes (resize / rotate) or webfonts finish loading.

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const PAD_Y = "0.14em"
const PAD_X = "0.08em"
const maskStyle = {
    padding: `0 ${PAD_X} ${PAD_Y}`,
    margin: `0 -${PAD_X} -${PAD_Y}`,
}

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export default function LineMaskText({
    children,
    as: Tag = "p",
    className = "",
    stagger = 0.12,
    delay = 0,
    start = "top 88%",
}) {
    const text = (typeof children === "string" ? children : React.Children.toArray(children).join(""))
        .replace(/\s+/g, " ")
        .trim()

    const ref = useRef(null)
    const revealedRef = useRef(false)
    const lastWidthRef = useRef(0)
    const [lines, setLines] = useState(null) // null = measuring

    // Measure: render words inline, group them by their line position.
    useLayoutEffect(() => {
        if (lines) return
        const el = ref.current
        if (!el) return
        const words = el.querySelectorAll("[data-w]")
        const out = []
        let currentTop = null
        let current = []
        words.forEach((w) => {
            const top = Math.round(w.getBoundingClientRect().top)
            if (currentTop === null || Math.abs(top - currentTop) > 2) {
                if (current.length) out.push(current.join(" "))
                current = []
                currentTop = top
            }
            current.push(w.textContent)
        })
        if (current.length) out.push(current.join(" "))
        setLines(out.length ? out : [text])
    }, [lines, text])

    // Re-measure when the width changes or fonts load.
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const remeasure = () => setLines(null)
        lastWidthRef.current = Math.round(el.getBoundingClientRect().width)
        let ro
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => {
                const w = Math.round(el.getBoundingClientRect().width)
                if (w !== lastWidthRef.current) {
                    lastWidthRef.current = w
                    remeasure()
                }
            })
            ro.observe(el)
        }
        let cancelled = false
        document.fonts?.ready.then(() => {
            if (!cancelled) remeasure()
        })
        return () => {
            cancelled = true
            ro?.disconnect()
        }
    }, [text])

    // Animate once on scroll. After a re-split, keep the revealed state.
    useEffect(() => {
        const el = ref.current
        if (!el || !lines) return
        const inners = el.querySelectorAll(".line-inner")
        if (!inners.length) return

        if (revealedRef.current || prefersReducedMotion()) {
            gsap.set(inners, { y: "0%", opacity: 1 })
            return
        }

        gsap.set(inners, { y: "110%", opacity: 0 })
        const st = ScrollTrigger.create({
            trigger: el,
            start,
            once: true,
            onEnter: () => {
                revealedRef.current = true
                gsap.to(inners, {
                    y: "0%",
                    opacity: 1,
                    duration: 0.9,
                    stagger,
                    delay,
                    ease: "power3.out",
                })
            },
        })
        return () => st.kill()
    }, [lines, stagger, delay, start])

    return (
        <Tag ref={ref} aria-label={text} className={className}>
            {lines
                ? lines.map((line, i) => (
                      <span
                          key={i}
                          aria-hidden="true"
                          className="block overflow-hidden"
                          style={maskStyle}
                      >
                          <span className="line-inner block whitespace-nowrap will-change-transform">
                              {line}
                          </span>
                      </span>
                  ))
                : text.split(" ").map((w, i, arr) => (
                      <React.Fragment key={i}>
                          <span data-w="" aria-hidden="true">{w}</span>
                          {i < arr.length - 1 ? " " : null}
                      </React.Fragment>
                  ))}
        </Tag>
    )
}