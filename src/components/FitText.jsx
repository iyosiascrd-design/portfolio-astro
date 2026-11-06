// src/components/FitText.jsx
import React, { useRef, useLayoutEffect, useCallback } from "react"

const PROBE_SIZE = 100 // px, size used to measure the text's natural width

/**
 * Renders its children on one line and scales the font size so the text
 * exactly fills the width of its wrapper.
 *
 * Props
 *  - as:               tag for the text element (default "div")
 *  - wrapperClassName: classes for the outer wrapper (spacing etc.)
 *  - className:        classes for the text element (font, tracking, colour...)
 */
export default function FitText({
    as: Tag = "div",
    wrapperClassName = "",
    className = "",
    children,
}) {
    const wrapRef = useRef(null)
    const textRef = useRef(null)

    const fit = useCallback(() => {
        const wrap = wrapRef.current
        const text = textRef.current
        if (!wrap || !text) return

        const available = wrap.clientWidth
        if (!available) return

        text.style.fontSize = `${PROBE_SIZE}px`
        const natural = text.getBoundingClientRect().width
        if (!natural) return

        const size = Math.floor((available / natural) * PROBE_SIZE * 100) / 100
        text.style.fontSize = `${size}px`
    }, [])

    useLayoutEffect(() => {
        fit()

        const wrap = wrapRef.current
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null
        if (wrap && ro) ro.observe(wrap)

        window.addEventListener("resize", fit)
        // Re-fit once the web fonts have loaded (widths change)
        document.fonts?.ready?.then(fit).catch(() => {})

        return () => {
            ro?.disconnect()
            window.removeEventListener("resize", fit)
        }
    }, [fit])

    return (
        <div ref={wrapRef} className={`w-full ${wrapperClassName}`}>
            <Tag
                ref={textRef}
                className={`m-0 p-0 ${className}`}
                style={{ display: "block", width: "max-content", whiteSpace: "nowrap" }}
            >
                {children}
            </Tag>
        </div>
    )
}