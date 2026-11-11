// src/components/PageTransitionOverlay.jsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useMotionValue } from "framer-motion"
import gsap from "gsap"

// ------------------------------------------------------------
// Tuning
// ------------------------------------------------------------
const T = {
    cover: 1.0, // s: white mask wipes up over the old page
    reveal: 1.15, // s: mask wipes away upward
    hold: 120, // ms: page fully covered and logo landed; one last beat before the reveal
    ease: "power3.inOut", // cover: slow, fast, slow
    revealEase: "power4.out", // reveal: starts quick, then slows down a lot at the end
    oldPageTravel: 0.3, // old page moves UP by 30% of the viewport height
    newPageOffset: 0.2, // new page starts 20% of the viewport height DOWN and slides up
    contentDelay: 0.55, // s after the reveal starts before page content may animate in
    maskDelay: 0.07, // s: old page gets a tiny head start
    maskColor: "#ffffff",

    // logo odometer roll (same language as the Preloader)
    logoStart: 0.45, // s after the cover starts: letters begin rising in
    reelIn: 0.9, // s: one letter rises into place
    reelInEase: "power4.out",
    reelOut: 0.55, // s: one letter rolls up and out on reveal
    revealLead: 0.45, // s: letters start leaving this long BEFORE the mask wipe + page slide begin
    reelOutEase: "power3.in",
    letterStagger: 0.05, // s between letters
    rowGap: 0.08, // s extra delay before the second row (ALAS)
    reelGap: 6, // svg units between a glyph and the one that follows it on the reel
}

// Shared with Preloader.jsx
export const PRELOAD_KEY = "iyosias-preloaded"

/**
 * true when the preloader should play on this page load.
 * - once per browser tab session (sessionStorage)
 * - add ?preload to the URL to force it (handy for testing on a phone)
 */
export function shouldPreload() {
    if (typeof window === "undefined") return false
    try {
        if (new URLSearchParams(window.location.search).has("preload")) return true
    } catch {}
    try {
        if (window.sessionStorage.getItem(PRELOAD_KEY)) return false
    } catch {
        // storage blocked (private mode etc.): just play it
    }
    return true
}

// Preloader -> provider handoff that works even if <Preloader /> is rendered outside the
// provider (where the context value is not available to it)
const PRELOAD_DONE_EVENT = "iyosias:preload-done"
export function announcePreloadDone() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(PRELOAD_DONE_EVENT))
}

// Header -> provider handoff: the page has landed on its target section and its layout is
// stable, so the overlay can reveal without the visitor ever seeing a scroll correction.
const PAGE_LANDED_EVENT = "iyosias:page-landed"
export function announcePageLanded() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(PAGE_LANDED_EVENT))
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const PageTransitionContext = createContext(null)

export function usePageTransition() {
    return useContext(PageTransitionContext)
}

/**
 * true when a page may start its entrance animations.
 * For a page that mounts during a transition (or the first page while the preloader is
 * up) it is false until shortly after the reveal begins. For a page that was already on
 * screen it is always true.
 */
export function usePageReady() {
    const ctx = useContext(PageTransitionContext)
    const ready = ctx ? ctx.ready : true

    // Only gate pages that MOUNT during a transition (the incoming page).
    const gated = useRef(!ready)
    useEffect(() => {
        if (ready) gated.current = false
    }, [ready])

    return gated.current ? ready : true
}

/**
 * Use this instead of a plain <main>. The provider moves it during a transition by
 * writing an inline transform directly, and clears that transform completely when the
 * transition ends, so at rest the element has NO transform (a leftover transform /
 * compositing layer can change how the fixed footer layers against sticky content).
 */
export function TransitionMain({ children, ...props }) {
    return (
        <main {...props} data-page-transition="">
            {children}
        </main>
    )
}

// ------------------------------------------------------------
// Logo: seven glyphs, each on its own reel, two rows (IYOS / IAS)
// ------------------------------------------------------------
const ROW_BOUNDS = [
    { yt: -1, yb: 40 },
    { yt: 41, yb: 82 },
]

const ROW_GLYPHS = [
    [0, 1, 2, 3],
    [4, 5, 6],
]

const LETTERS = []
ROW_GLYPHS.forEach((glyphs, row) => {
    glyphs.forEach((glyph, pos) => {
        LETTERS.push({ row, pos, glyph })
    })
})

const rowPitch = (row) => ROW_BOUNDS[row].yb - ROW_BOUNDS[row].yt + T.reelGap

const OFFSETS = LETTERS.map(({ row, pos }) =>
    row === 0
        ? pos * T.letterStagger
        : (ROW_GLYPHS[0].length - 1) * T.letterStagger + T.rowGap + pos * T.letterStagger
)

const LOGO_PATHS = [
    "M0,.5v38.1h7.3V.5H0Z",
    "M36.9.6l-10.5,18.4L15.8.6H7.5s14.1,25.8,14.1,25.8v12.3h4.7s4.7,0,4.7,0v-12.3L45.2.5h-8.3Z",
    "M73.3,8.9c-1.4-2.9-3.5-5.1-6.1-6.7-2.7-1.5-5.9-2.3-9.6-2.3s-6.8.7-9.4,2.3c-.4.3-.9.5-1.3.9-2,1.4-3.7,3.4-4.9,5.8-1.4,2.9-2.1,6.4-2.1,10.6s.7,7.7,2.1,10.6c1.2,2.4,2.9,4.4,4.9,5.8.4.3.8.6,1.3.9,2.7,1.5,5.8,2.3,9.4,2.3s6.9-.8,9.6-2.3c2.7-1.5,4.7-3.7,6.1-6.6,1.4-2.9,2.2-6.4,2.2-10.6s-.7-7.8-2.2-10.6ZM65.3,29.4c-1.7,2.3-4.3,3.4-7.7,3.4s-6-1.2-7.7-3.5c-1.7-2.4-2.5-5.6-2.5-9.7s.9-7.4,2.5-9.7c1.7-2.4,4.3-3.5,7.7-3.5s6,1.2,7.7,3.4c1.8,2.3,2.7,5.6,2.7,9.8s-.9,7.5-2.7,9.8Z",
    "M106,22.8c-.7-1.3-1.6-2.4-2.7-3.3-1.2-.8-2.5-1.5-4-2-1.5-.5-3.2-1-4.9-1.4-1.8-.4-3.4-.9-4.7-1.3-1.3-.4-2.3-1-3-1.7-.7-.7-1-1.6-1-2.8s.5-2.5,1.6-3.4c1-.8,2.6-1.3,4.6-1.3s4,.6,5.3,1.7c1.3,1.1,2,2.7,2,4.8l7.2-.9c-.2-2.4-1-4.4-2.2-6.1-1.2-1.7-2.9-3-4.9-3.9-2-.9-4.5-1.4-7.4-1.4s-5.2.5-7.3,1.4c-2.1,1-3.7,2.3-4.8,3.9-1.1,1.7-1.7,3.6-1.7,5.8s.3,3.3,1,4.6c.7,1.3,1.6,2.4,2.8,3.2,1.2.8,2.7,1.5,4.3,2.1,1.7.6,3.5,1.1,5.5,1.5,1.5.3,2.8.7,4,1.1,1.2.4,2,.9,2.7,1.6.7.7,1,1.7,1,3s-.6,2.9-1.9,3.8c-1.3,1-3,1.4-5.2,1.4s-4.3-.7-5.7-1.9c-1.5-1.3-2.2-3.2-2.3-5.7l-7.2.9c.1,2.4.8,4.6,2,6.5,1.2,1.8,2.9,3.3,5.1,4.4s4.8,1.6,7.9,1.6,5.7-.5,8.1-1.4c2.2-.9,4-2.3,5.2-4,1.3-1.7,1.9-3.7,1.9-6.1s-.3-3.6-1-4.9Z",
    "M0,42.4v38.1h7.3v-38.1H0Z",
    "M30.7,42.4h-8.4l-14.9,38h0c0,.1,7.5.1,7.5.1l3.3-8.5h16.5l3.2,8.5h7.8l-14.9-38.1ZM20.4,66.1l3.8-10.2c.4-1.1.8-2.2,1.2-3.3.4-1.1.7-2.2,1-3.4.3,1.2.7,2.3,1,3.4.4,1.1.8,2.2,1.2,3.3l3.7,10.2h-11.9Z",
    "M72.5,58.4c-1.1-.9-2.4-1.5-3.8-1.8-1.4-.3-2.9-.3-4.5-.1-1.6.2-3.3.5-5,.9-1.9.4-3.5.7-4.9.8-1.4.2-2.5.1-3.4-.3-.9-.3-1.6-1-2.1-2.1-.6-1.3-.6-2.5,0-3.8.6-1.2,1.8-2.2,3.7-3.1,2-.9,3.9-1.2,5.5-.7,1.7.5,3,1.6,3.9,3.5l6.2-3.9c-1.2-2-2.8-3.6-4.5-4.6-1.9-1-3.9-1.5-6.1-1.5-2.3,0-4.7.7-7.2,1.9-2.6,1.2-4.5,2.6-6,4.4-1.5,1.8-2.4,3.6-2.7,5.6-.4,2,0,4,.9,5.9.8,1.6,1.7,2.9,2.8,3.7,1.1.9,2.5,1.5,3.9,1.7,1.5.2,3.1.3,4.8.1,1.8-.1,3.6-.5,5.6-.9,1.5-.3,2.8-.5,4.1-.6,1.2-.1,2.2,0,3.1.3.9.4,1.6,1.1,2.2,2.3.7,1.4.6,2.9-.1,4.3-.7,1.4-2.2,2.6-4.2,3.5-2.1,1-4.1,1.2-6,.7-1.8-.5-3.4-1.9-4.5-4.2l-6.1,3.9c1.1,2.2,2.6,3.9,4.6,5,1.8,1.2,4,1.8,6.5,1.8,2.4,0,5-.6,7.8-1.9,2.7-1.3,5-2.9,6.7-4.7,1.7-1.8,2.7-3.7,3.1-5.8.4-2.1,0-4.2-.9-6.3-.8-1.8-1.8-3.1-2.9-4.1Z",
]

const CLIP_ID = (row) => `iy-transition-clip-${row}`

// Animated by the provider: it writes a translate transform onto each strip <g>.
function TransitionLogo({ stripRefs, className = "" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 107 81"
            className={className}
            style={{ aspectRatio: "107 / 81", overflow: "visible" }}
            role="img"
            aria-hidden="true"
            fill="#000"
        >
            <defs>
                {ROW_BOUNDS.map((b, row) => (
                    <clipPath key={row} id={CLIP_ID(row)} clipPathUnits="userSpaceOnUse">
                        <rect x="-4" y={b.yt} width="115" height={b.yb - b.yt} />
                    </clipPath>
                ))}
            </defs>
            {ROW_GLYPHS.map((glyphs, row) => (
                <g key={row} clipPath={`url(#${CLIP_ID(row)})`}>
                    {glyphs.map((glyph) => {
                        const i = LETTERS.findIndex((l) => l.glyph === glyph)
                        return (
                            <g
                                key={glyph}
                                ref={(el) => (stripRefs.current[i] = el)}
                                transform={`translate(0 ${rowPitch(row)})`}
                            >
                                <path d={LOGO_PATHS[glyph]} />
                            </g>
                        )
                    })}
                </g>
            ))}
        </svg>
    )
}

export function PageTransitionProvider({ children }) {
    const navigate = useNavigate()
    const { pathname, hash } = useLocation()
    const [active, setActive] = useState(false)

    // While the preloader is up the first page is not "ready"; Preloader calls finishPreload
    const [preloading] = useState(shouldPreload)
    const preloadingRef = useRef(preloading)
    const [ready, setReady] = useState(!preloading)

    const busy = useRef(false)
    const mounted = useRef(true)
    const maskRef = useRef(null)
    const stripRefs = useRef([])
    const tickerFn = useRef(null)
    const locRef = useRef({ pathname, hash })
    locRef.current = { pathname, hash }

    // GSAP animates this plain object; onUpdate copies it to the DOM / motion value
    //  top: 100 -> 0  = mask grows upward from the bottom (cover)
    //  bot: 0 -> 100  = mask's bottom edge rises to the top (reveal)
    //  y:   page offset in px
    const proxy = useRef({ top: 100, bot: 0, y: 0 })
    const pageY = useMotionValue(0)

    const finishPreload = useCallback(() => {
        preloadingRef.current = false
        setReady(true)
    }, [])

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
            gsap.killTweensOf(proxy.current)
            if (tickerFn.current) gsap.ticker.remove(tickerFn.current)
        }
    }, [])

    // Release the gated first page when the preloader finishes. Three ways out, so the page
    // can never stay blank: the preloader's event, "no preloader is on screen", or a hard cap.
    useEffect(() => {
        if (!preloading) return
        const done = () => {
            preloadingRef.current = false
            setReady(true)
        }
        window.addEventListener(PRELOAD_DONE_EVENT, done)
        const noPreloader = setTimeout(() => {
            if (!document.querySelector("[data-preloader]")) done()
        }, 800)
        const cap = setTimeout(done, 12000)
        return () => {
            window.removeEventListener(PRELOAD_DONE_EVENT, done)
            clearTimeout(noPreloader)
            clearTimeout(cap)
        }
    }, [preloading])

    const triggerTransition = useCallback(
        async (to) => {
            if (busy.current || preloadingRef.current) return

            const { pathname: p, hash: h } = locRef.current
            if (to === p || to === p + h) return

            const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
            if (reduce) {
                navigate(to)
                return
            }

            busy.current = true
            setReady(false)

            const s = proxy.current
            const H = window.innerHeight

            const paintMask = () => {
                const el = maskRef.current
                if (!el) return
                const clip = `inset(${s.top}% 0% ${s.bot}% 0%)`
                el.style.clipPath = clip
                el.style.webkitClipPath = clip
            }

            // The page wrapper (TransitionMain in SiteLayout), or the first <main>
            const mainEl = document.querySelector("[data-page-transition]") || document.querySelector("main")

            const sync = () => {
                paintMask()
                pageY.set(s.y)
                if (mainEl) {
                    mainEl.style.transform = s.y ? `translate3d(0, ${s.y}px, 0)` : ""
                }
            }

            // Logo reels: y = pitch (hidden below) -> 0 (resting) -> -pitch (gone out the top)
            const reels = LETTERS.map(({ row }) => ({ y: rowPitch(row) }))
            const paintReels = () => {
                for (let i = 0; i < reels.length; i++) {
                    const el = stripRefs.current[i]
                    if (!el) continue
                    el.setAttribute("transform", `translate(0 ${reels[i].y.toFixed(2)})`)
                }
            }
            tickerFn.current = paintReels
            gsap.ticker.add(paintReels)

            const timelines = []

            const lettersIn = () =>
                new Promise((resolve) => {
                    const tl = gsap.timeline({ delay: T.logoStart, onComplete: resolve })
                    timelines.push(tl)
                    reels.forEach((r, i) => {
                        tl.to(r, { y: 0, duration: T.reelIn, ease: T.reelInEase }, OFFSETS[i])
                    })
                })

            const lettersOut = () =>
                new Promise((resolve) => {
                    const tl = gsap.timeline({ onComplete: resolve })
                    timelines.push(tl)
                    reels.forEach((r, i) => {
                        tl.to(
                            r,
                            {
                                y: -rowPitch(LETTERS[i].row),
                                duration: T.reelOut,
                                ease: T.reelOutEase,
                            },
                            OFFSETS[i] * 0.6
                        )
                    })
                })

            // Resolves once the router has actually committed `to` (or after a timeout).
            // A lazy-loaded route keeps the OLD page on screen until its chunk arrives,
            // so navigate() returning does not mean the new page is mounted.
            const routeReached = (dest, timeout = 4000) =>
                new Promise((resolve) => {
                    const clean = (x) => (x.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/")
                    const target = clean(dest)
                    const t0 = performance.now()
                    const tick = () => {
                        if (!mounted.current) return resolve(false)
                        if (clean(locRef.current.pathname) === target) return resolve(true)
                        if (performance.now() - t0 > timeout) return resolve(false)
                        setTimeout(tick, 16)
                    }
                    tick()
                })

            const tween = (vars) =>
                new Promise((resolve) => {
                    gsap.to(s, { ...vars, onUpdate: sync, onComplete: resolve })
                })

            // Set when the router could not mount the new page and we fall back to a full load
            let hardNav = false

            // Always leave the page exactly as it was, even if something above throws
            const resetAll = () => {
                gsap.killTweensOf(s)
                gsap.killTweensOf(reels)
                timelines.forEach((tl) => tl.kill())
                gsap.ticker.remove(paintReels)
                tickerFn.current = null
                s.top = 100
                s.bot = 0
                s.y = 0
                pageY.set(0)
                if (mainEl) mainEl.style.transform = ""
                busy.current = false
                if (mounted.current) {
                    setActive(false)
                    setReady(true)
                }
            }

            try {
                // Start: mask fully hidden below the screen
                s.top = 100
                s.bot = 0
                s.y = pageY.get()
                setActive(true)
                await nextFrame()
                await nextFrame()
                paintMask()
                paintReels()

                // 1) COVER: mask wipes up, old page moves up 30%, logo letters start rising in
                const lettersLanded = lettersIn()
                await Promise.all([
                    tween({ top: 0, duration: T.cover, delay: T.maskDelay, ease: T.ease }),
                    tween({ y: -T.oldPageTravel * H, duration: T.cover + T.maskDelay, ease: T.ease }),
                ])

                if (!mounted.current) return

                // 2) SWAP: fully covered, change route; new page starts lower down.
                // A target with a #section means the Header will scroll to it: listen BEFORE
                // navigating, so the reveal can wait until that scroll has settled.
                const landed = to.includes("#")
                    ? new Promise((resolve) => {
                          const done = () => {
                              window.removeEventListener(PAGE_LANDED_EVENT, done)
                              clearTimeout(cap)
                              resolve()
                          }
                          const cap = setTimeout(done, 2000) // never hold the reveal forever
                          window.addEventListener(PAGE_LANDED_EVENT, done)
                      })
                    : Promise.resolve()
                navigate(to)
                s.y = T.newPageOffset * H
                sync()

                // Stay covered until the new route is really on screen, never reveal the old page
                const arrived = await routeReached(to)
                if (!mounted.current) return
                if (!arrived) {
                    // URL changed but React never swapped the page (e.g. a lazy route that
                    // is stuck). Keep the mask up and load the target with a real navigation
                    // instead of revealing the old page.
                    console.warn("Page transition: route did not mount in time, hard navigating", to)
                    hardNav = true
                    window.location.assign(to)
                    return
                }

                // Let the logo finish landing, and the page finish settling, before anything is revealed
                await Promise.all([lettersLanded, landed])
                await nextFrame()
                await nextFrame()
                await wait(T.hold)

                if (!mounted.current) return

                // 3) REVEAL: letters roll out the top, mask wipes away upward, new page slides up
                // Letters start rolling out first; the swipe follows after revealLead, so the
                // logo is visibly leaving as the mask edge reaches it (power4.out clears the
                // centre of the screen almost instantly, so without a lead it was never seen)
                const lettersGone = lettersOut()
                await wait(T.revealLead * 1000)
                if (!mounted.current) return
                gsap.delayedCall(T.contentDelay, () => mounted.current && setReady(true))
                await Promise.all([
                    lettersGone,
                    tween({ bot: 100, duration: T.reveal, ease: T.revealEase }),
                    tween({ y: 0, duration: T.reveal, ease: T.revealEase }),
                ])
            } catch (err) {
                console.error("Page transition failed", err)
                // make sure we still land on the page that was asked for
                if (locRef.current.pathname + locRef.current.hash !== to) navigate(to)
            } finally {
                if (!hardNav) resetAll()
            }
        },
        [navigate, pageY]
    )

    const value = useMemo(
        () => ({ triggerTransition, pageY, ready, finishPreload }),
        [triggerTransition, pageY, ready, finishPreload]
    )

    return (
        <PageTransitionContext.Provider value={value}>
            {children}

            {active && (
                <div
                    ref={maskRef}
                    aria-hidden="true"
                    className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto select-none"
                    style={{
                        backgroundColor: T.maskColor,
                        clipPath: "inset(100% 0% 0% 0%)",
                        WebkitClipPath: "inset(100% 0% 0% 0%)",
                        willChange: "clip-path",
                    }}
                >
                    <TransitionLogo
                        stripRefs={stripRefs}
                        className="h-[44px] md:h-[56px] w-auto block pointer-events-none"
                    />
                </div>
            )}
        </PageTransitionContext.Provider>
    )
}