// src/components/TransitionLink.jsx
import React from "react"
import { useNavigate } from "react-router-dom"
import { usePageTransition } from "./PageTransitionOverlay"

export default function TransitionLink({ href, to, children, className = "", onClick, ...props }) {
    const target = href || to
    const pageTransition = usePageTransition()
    const navigate = useNavigate()

    const handleClick = (e) => {
        if (onClick) onClick(e)
        
        // Let the browser handle new tabs, external links, or modified clicks naturally
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (!target || target.startsWith("http") || target.startsWith("mailto") || props.target === "_blank") return

        e.preventDefault()

        // Trigger the GSAP overlay animation, fallback to instant navigation if the provider is missing
        if (pageTransition?.triggerTransition) {
            pageTransition.triggerTransition(target)
        } else {
            navigate(target)
        }
    }

    return (
        <a href={target} onClick={handleClick} className={className} {...props}>
            {children}
        </a>
    )
}