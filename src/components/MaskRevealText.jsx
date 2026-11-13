// src/components/MaskRevealText.jsx

import React, { useLayoutEffect, useRef, useMemo } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useContext } from "react"
import { ViewportContext } from "../lib/viewport"

gsap.registerPlugin(ScrollTrigger)

const LINES_FROM = { md: 768, lg: 1024 }
const PAD_Y = "0.14em"
const PAD_X = "0.08em"

const maskStyle = {
    padding: `0 ${PAD_X} ${PAD_Y}`,
    margin: `0 -${PAD_X} -${PAD_Y}`,
}

export default function MaskRevealText({
    children,
    as = "div",
    mode = "words",
    linesFrom,
    delay = 0,
    stagger = 0.05,
    active,
    className = "",
}) {
    const vp = useContext(ViewportContext)
    const viewportWidth =
        vp?.width ?? (typeof window !== "undefined" ? window.innerWidth : 1440)

    const containerRef = useRef(null)
    const Tag = as

    const isString = typeof children === "string"
    const useLines =
        isString &&
        mode === "lines" &&
        (!linesFrom || viewportWidth >= (LINES_FROM[linesFrom] ?? 0))
    const useLetters = mode === "letters"

    const tokens = useMemo(() => {
        const out = []
        const parts = React.Children.toArray(children)
        parts.forEach((child, ci) => {
            if (typeof child === "string" || typeof child === "number") {
                const str = String(child)
                if (useLines) {
                    str.split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .forEach((l) => out.push({ type: "line", text: l }))
                    return
                }
                str.split(/(\s+)/).forEach((piece) => {
                    if (!piece) return
                    if (/^\s+$/.test(piece)) out.push({ type: "space" })
                    else out.push({ type: "word", text: piece })
                })
            } else {
                out.push({ type: "node", node: child, key: child.key ?? `n${ci}` })
            }
        })
        if (isString) {
            while (out[0]?.type === "space") out.shift()
            while (out[out.length - 1]?.type === "space") out.pop()
        }
        return out
    }, [children, useLines, isString])

    const contentKey = tokens
        .map((t) => (t.type === "node" ? `<${t.key}>` : t.type === "space" ? " " : t.text))
        .join("|")

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return

        const innerSpans = el.querySelectorAll(".mask-inner")
        if (!innerSpans.length) return

        gsap.set(innerSpans, { y: "110%", opacity: 0 })

        const animConfig = {
            y: "0%",
            opacity: 1,
            duration: 1.2, // INCREASED FROM 0.9
            stagger: stagger,
            delay: delay,
            ease: "power3.out",
        }

        if (active !== undefined) {
            if (active) {
                gsap.to(innerSpans, animConfig)
            } else {
                gsap.set(innerSpans, { y: "110%", opacity: 0 })
            }
        } else {
            const st = ScrollTrigger.create({
                trigger: el,
                start: "top 85%",
                once: true,
                onEnter: () => {
                    gsap.to(innerSpans, animConfig)
                },
            })
            return () => st.kill()
        }
    }, [active, delay, stagger, contentKey, useLetters])

    const flatLabel = tokens
        .map((t) => (t.type === "space" || t.type === "node" ? " " : t.text))
        .join("")
        .replace(/\s+/g, " ")
        .trim()

    const renderWord = (text, key) => {
        if (useLetters) {
            return (
                <span
                    key={key}
                    aria-hidden="true"
                    className="inline-block whitespace-nowrap align-top"
                >
                    {Array.from(text).map((ch, j) => (
                        <span
                            key={`${ch}-${j}`}
                            className="inline-block overflow-hidden align-top"
                            style={maskStyle}
                        >
                            <span className="mask-inner inline-block will-change-transform">
                                {ch}
                            </span>
                        </span>
                    ))}
                </span>
            )
        }
        return (
            <span
                key={key}
                aria-hidden="true"
                className="inline-block overflow-hidden align-top"
                style={maskStyle}
            >
                <span className="mask-inner inline-block will-change-transform">
                    {text}
                </span>
            </span>
        )
    }

    return (
        <Tag ref={containerRef} aria-label={flatLabel} className={className}>
            {tokens.map((t, i) => {
                if (t.type === "space") return <React.Fragment key={`s${i}`}> </React.Fragment>
                if (t.type === "node") return t.node
                if (t.type === "line") {
                    return (
                        <span
                            key={`l${i}`}
                            aria-hidden="true"
                            className="block overflow-hidden"
                            style={maskStyle}
                        >
                            <span className="mask-inner block will-change-transform">
                                {t.text}
                            </span>
                        </span>
                    )
                }
                return renderWord(t.text, `w${i}`)
            })}
        </Tag>
    )
}