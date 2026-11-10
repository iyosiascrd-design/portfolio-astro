import React, { createContext, useContext, useState, useEffect } from "react"

// Breakpoints: mobile < 768 · tablet 768–1023 · desktop >= 1024
export const getViewport = () => {
    const w = typeof window === "undefined" ? 1280 : window.innerWidth
    return {
        width: w,
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isDesktop: w >= 1024,
    }
}

const DEFAULT_VIEWPORT = {
    width: 1280,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
}

export const ViewportContext = createContext(DEFAULT_VIEWPORT)

export function useViewport() {
    // Keep the first client render identical to the server render; update to the
    // actual viewport immediately after hydration.
    const [vp, setVp] = useState(DEFAULT_VIEWPORT)

    useEffect(() => {
        const onResize = () => {
            const next = getViewport()
            setVp((prev) =>
                prev.isMobile === next.isMobile &&
                prev.isTablet === next.isTablet &&
                prev.isDesktop === next.isDesktop
                    ? prev
                    : next
            )
        }
        window.addEventListener("resize", onResize)
        onResize()
        return () => window.removeEventListener("resize", onResize)
    }, [])

    return vp
}