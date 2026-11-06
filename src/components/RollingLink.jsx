import React, { useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { customEase } from "../lib/motion"
import { usePageTransition } from "./PageTransitionOverlay"

const ROLL = {
    duration: 0.6,
    ease: customEase,
    padY: 0.12, // em, keeps descenders from being clipped
    offset: "128%", // clears padY (0.12em * 2) even on tight 0.85–0.9 display line-heights
}

// Internal route (e.g. "/work/weyra"). Hash links like "/#work" and
// external URLs stay as plain <a> tags so your onClick scroll handler works.
const isRoute = (href) =>
    typeof href === "string" && href.startsWith("/") && !href.startsWith("/#")

export default function RollingLink({
    href = "#",
    children,
    className = "",
    style,
    onClick,
    ...rest
}) {
    const [hovered, setHovered] = useState(false)
    const pageTransition = usePageTransition()

    // Internal routes go through the curtain transition instead of a plain navigation
    const handleClick = (e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (!isRoute(href) || !pageTransition?.triggerTransition) return
        // let ctrl/cmd/shift/middle-click open in a new tab as normal
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        pageTransition.triggerTransition(href)
    }

    const Tag = isRoute(href) ? Link : "a"
    const linkProps = isRoute(href)
        ? { to: href }
        : {
              href,
              ...(href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {}),
          }

    const transition = { duration: ROLL.duration, ease: ROLL.ease }

    return (
        <Tag
            {...linkProps}
            {...rest}
            onClick={handleClick}
            // Touch taps fire pointerenter/focus and never "leave", which left the link
            // stuck in its rolled state on phones. Only roll for mouse/pen hover and
            // keyboard focus.
            onPointerEnter={(e) => {
                if (e.pointerType !== "touch") setHovered(true)
            }}
            onPointerLeave={() => setHovered(false)}
            onPointerCancel={() => setHovered(false)}
            onFocus={(e) => {
                if (e.target.matches?.(":focus-visible")) setHovered(true)
            }}
            onBlur={() => setHovered(false)}
            className={`relative block w-fit overflow-hidden ${className}`}
            style={{
                paddingTop: `${ROLL.padY}em`,
                paddingBottom: `${ROLL.padY}em`,
                marginTop: `-${ROLL.padY}em`,
                marginBottom: `-${ROLL.padY}em`,
                ...style,
            }}
        >
            {/* Visible text: rolls up and out */}
            <motion.span
                initial={false}
                animate={{ y: hovered ? `-${ROLL.offset}` : "0%" }}
                transition={transition}
                className="block will-change-transform"
            >
                {children}
            </motion.span>

            {/* Duplicate: rolls up from below. aria-hidden so screen readers read it once */}
            <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ y: hovered ? "0%" : ROLL.offset }}
                transition={transition}
                className="absolute left-0 right-0 block will-change-transform"
                style={{ top: `${ROLL.padY}em` }}
            >
                {children}
            </motion.span>
        </Tag>
    )
}