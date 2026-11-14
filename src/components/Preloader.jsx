import React, { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { usePageTransition, shouldPreload, announcePreloadDone, PRELOAD_KEY } from "./PageTransitionOverlay"

const P = {
    minWait: 2.2, // s: minimum time the preloader stays up
    maxWait: 6000, // ms: hard cap on waiting for assets

    // intro: odometer reels rise into place
    reelDuration: 1.2,
    letterStagger: 0.07,
    rowGap: 0.12,
    reelEase: "power4.out", // eases out but uses the whole duration (expo.out lands too early)
    reelGap: 6,

    // loop: after the intro, the same odometer roll repeats. The count is picked once,
    // when the intro ends, from how far along loading is (see pickLoopCount).
    loopMin: 1, // always at least this many repeats, even if loading is instant
    loopMax: 2, // never more than this many repeats
    loopDuration: 1.0, // s: one repeat roll per letter
    loopEase: "power3.inOut", // starts and ends at rest, so it chains smoothly with the intro and exit

    // exit
    logoHold: 0.12, // s: tiny beat once everything is loaded (exit chains straight off the last landing)
    rollOut: 0.7, // s: each letter rolls up and out
    rollOutEase: "power3.in",
    revealLead: 0.5, // s after exit starts: mask begins wiping while letters are still leaving
    reveal: 1.3, // s: mask wipe
    revealEase: "power4.inOut",
    pageExtra: 0.2, // s: page rises a little longer than the mask (parallax)
    pageEase: "power3.out",
    contentDelay: 0.25, // s after reveal starts: page content may animate in
    newPageOffset: 0.15, // fraction of viewport height the new page starts below
}

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

const rowHeight = (row) => ROW_BOUNDS[row].yb - ROW_BOUNDS[row].yt
const rowPitch = (row) => rowHeight(row) + P.reelGap

const LOGO_PATHS = [
    "M0,.5v38.1h7.3V.5H0Z",
    "M36.9.6l-10.5,18.4L15.8.6H7.5s14.1,25.8,14.1,25.8v12.3h4.7s4.7,0,4.7,0v-12.3L45.2.5h-8.3Z",
    "M73.3,8.9c-1.4-2.9-3.5-5.1-6.1-6.7-2.7-1.5-5.9-2.3-9.6-2.3s-6.8.7-9.4,2.3c-.4.3-.9.5-1.3.9-2,1.4-3.7,3.4-4.9,5.8-1.4,2.9-2.1,6.4-2.1,10.6s.7,7.7,2.1,10.6c1.2,2.4,2.9,4.4,4.9,5.8.4.3.8.6,1.3.9,2.7,1.5,5.8,2.3,9.4,2.3s6.9-.8,9.6-2.3c2.7-1.5,4.7-3.7,6.1-6.6,1.4-2.9,2.2-6.4,2.2-10.6s-.7-7.8-2.2-10.6ZM65.3,29.4c-1.7,2.3-4.3,3.4-7.7,3.4s-6-1.2-7.7-3.5c-1.7-2.4-2.5-5.6-2.5-9.7s.9-7.4,2.5-9.7c1.7-2.4,4.3-3.5,7.7-3.5s6,1.2,7.7,3.4c1.8,2.3,2.7,5.6,2.7,9.8s-.9,7.5-2.7,9.8Z",
    "M106,22.8c-.7-1.3-1.6-2.4-2.7-3.3-1.2-.8-2.5-1.5-4-2-1.5-.5-3.2-1-4.9-1.4-1.8-.4-3.4-.9-4.7-1.3-1.3-.4-2.3-1-3-1.7-.7-.7-1-1.6-1-2.8s.5-2.5,1.6-3.4c1-.8,2.6-1.3,4.6-1.3s4,.6,5.3,1.7c1.3,1.1,2,2.7,2,4.8l7.2-.9c-.2-2.4-1-4.4-2.2-6.1-1.2-1.7-2.9-3-4.9-3.9-2-.9-4.5-1.4-7.4-1.4s-5.2.5-7.3,1.4c-2.1,1-3.7,2.3-4.8,3.9-1.1,1.7-1.7,3.6-1.7,5.8s.3,3.3,1,4.6c.7,1.3,1.6,2.4,2.8,3.2,1.2.8,2.7,1.5,4.3,2.1,1.7.6,3.5,1.1,5.5,1.5,1.5.3,2.8.7,4,1.1,1.2.4,2,.9,2.7,1.6.7.7,1,1.7,1,3s-.6,2.9-1.9,3.8c-1.3,1-3,1.4-5.2,1.4s-4.3-.7-5.7-1.9c-1.5-1.3-2.2-3.2-2.3-5.7l-7.2.9c.1,2.4.8,4.6,2,6.5,1.2,1.8,2.9,3.3,5.1,4.4s4.8,1.6,7.9,1.6,5.7-.5,8.1-1.4c2.2-.9,4-2.3,5.2-4,1.3-1.7,1.9-3.7,1.9-6.1s-.3-3.6-1-4.9Z",
    "M0,42.4v38.1h7.3v-38.1H0Z",
    "M30.7,42.4h-8.4l-14.9,38h0c0,.1,7.5.1,7.5.1l3.3-8.5h16.5l3.2,8.5h7.8l-14.9-38.1ZM20.4,66.1l3.8-10.2c.4-1.1.8-2.2,1.2-3.3.4-1.1.7-2.2,1-3.4.3,1.2.7,2.3,1,3.4.4,1.1.8,2.2,1.2,3.3l3.7,10.2h-11.9Z",
    "M72.5,58.4c-1.1-.9-2.4-1.5-3.8-1.8-1.4-.3-2.9-.3-4.5-.1-1.6.2-3.3.5-5,.9-1.9.4-3.5.7-4.9.8-1.4.2-2.5.1-3.4-.3-.9-.3-1.6-1-2.1-2.1-.6-1.3-.6-2.5,0-3.8.6-1.2,1.8-2.2,3.7-3.1,2-.9,3.9-1.2,5.5-.7,1.7.5,3,1.6,3.9,3.5l6.2-3.9c-1.2-2-2.8-3.6-4.5-4.6-1.9-1-3.9-1.5-6.1-1.5-2.3,0-4.7.7-7.2,1.9-2.6,1.2-4.5,2.6-6,4.4-1.5,1.8-2.4,3.6-2.7,5.6-.4,2,0,4,.9,5.9.8,1.6,1.7,2.9,2.8,3.7,1.1.9,2.5,1.5,3.9,1.7,1.5.2,3.1.3,4.8.1,1.8-.1,3.6-.5,5.6-.9,1.5-.3,2.8-.5,4.1-.6,1.2-.1,2.2,0,3.1.3.9.4,1.6,1.1,2.2,2.3.7,1.4.6,2.9-.1,4.3-.7,1.4-2.2,2.6-4.2,3.5-2.1,1-4.1,1.2-6,.7-1.8-.5-3.4-1.9-4.5-4.2l-6.1,3.9c1.1,2.2,2.6,3.9,4.6,5,1.8,1.2,4,1.8,6.5,1.8,2.4,0,5-.6,7.8-1.9,2.7-1.3,5-2.9,6.7-4.7,1.7-1.8,2.7-3.7,3.1-5.8.4-2.1,0-4.2-.9-6.3-.8-1.8-1.8-3.1-2.9-4.1Z",
]

const CLIP_ID = (row) => `iy-preload-clip-${row}`

const LOGO_CLASS = "h-[44px] md:h-[56px] w-auto block pointer-events-none"

function trackLoading(onProgress) {
    const tasks = []

    tasks.push(document.fonts?.ready ?? Promise.resolve())
    tasks.push(
        document.readyState === "complete"
            ? Promise.resolve()
            : new Promise((r) => window.addEventListener("load", r, { once: true }))
    )

    Array.from(document.images).forEach((img) => {
        if (img.closest("[data-preloader]")) return
        if (img.complete) return
        if (img.loading === "lazy") return
        tasks.push(
            new Promise((r) => {
                img.addEventListener("load", r, { once: true })
                img.addEventListener("error", r, { once: true })
            })
        )
    })

    const total = tasks.length
    let done = 0
    onProgress(0)
    tasks.forEach((t) =>
        Promise.resolve(t).then(
            () => onProgress(++done / total),
            () => onProgress(++done / total)
        )
    )
}

export default function Preloader() {
    const ctxTransition = usePageTransition()
    const finishPreload = ctxTransition?.finishPreload
    const [show, setShow] = useState(shouldPreload)

    const overlayRef = useRef(null)
    const stripRefs = useRef([])
    const copyRefs = useRef([])

    useEffect(() => {
        if (!show) return

        try {
            window.sessionStorage.setItem(PRELOAD_KEY, "1")
        } catch {}

        // Read the viewport height ONCE, before any DOM write, and keep it fresh on resize.
        // Reading window.innerHeight later (inside exit(), right after style/attribute
        // writes) forces a synchronous reflow of the whole page.
        let viewH = window.innerHeight
        const onResize = () => {
            viewH = window.innerHeight
        }
        window.addEventListener("resize", onResize, { passive: true })

        document.body.style.overflow = "hidden"

        let ctx = gsap.context(() => {
            const overlay = overlayRef.current
            const findMain = () => document.querySelector("[data-page-transition]") || document.querySelector("main")
            let mainEl = findMain()

            let finished = false
            let maxTimer = null
            let introTl = null
            let loopTl = null
            let exitTl = null
            let loopDone = false
            let rawP = 0 
            const t0 = performance.now()

            const unlock = () => {
                document.body.style.overflow = ""
            }

            const reels = LETTERS.map(({ row }) => ({ y: rowPitch(row) }))

            const paintReels = () => {
                for (let i = 0; i < reels.length; i++) {
                    const el = stripRefs.current[i]
                    if (!el) continue
                    el.setAttribute("transform", `translate(0 ${reels[i].y.toFixed(2)})`)
                }
            }
            paintReels()
            gsap.ticker.add(paintReels)

            const offsets = LETTERS.map(({ row, pos }) =>
                row === 0
                    ? pos * P.letterStagger
                    : (ROW_GLYPHS[0].length - 1) * P.letterStagger + P.rowGap + pos * P.letterStagger
            )

            const s = { bot: 0, y: 0 }

            const sync = () => {
                if (overlay) {
                    const clip = `inset(0% 0% ${s.bot}% 0%)`
                    overlay.style.clipPath = clip
                    overlay.style.webkitClipPath = clip
                }
                if (mainEl) {
                    mainEl.style.transform = s.y ? `translate3d(0, ${s.y}px, 0)` : ""
                }
            }

            const clearMain = () => {
                if (mainEl) mainEl.style.transform = ""
            }

            const handOver = () => {
                clearMain()
                unlock()
                setShow(false)
            }

            introTl = gsap.timeline()
            reels.forEach((r, i) => {
                introTl.to(r, { y: 0, duration: P.reelDuration, ease: P.reelEase }, offsets[i])
            })

            const maxOffset = Math.max(...offsets)
            const cycle = maxOffset + P.loopDuration

            const pickLoopCount = () => {
                if (rawP >= 0.999) return P.loopMin 
                if (rawP <= 0.05) return P.loopMax 
                const elapsed = (performance.now() - t0) / 1000
                const remaining = Math.max(0, elapsed / rawP - elapsed)
                const n = Math.ceil(remaining / cycle)
                return Math.min(P.loopMax, Math.max(P.loopMin, n))
            }

            const startLoop = () => {
                const count = pickLoopCount()
                loopTl = gsap.timeline({
                    onComplete: () => {
                        loopDone = true
                    },
                })
                reels.forEach((r, i) => {
                    for (let k = 0; k < count; k++) {
                        loopTl.fromTo(
                            r,
                            { y: 0 },
                            {
                                y: -rowPitch(LETTERS[i].row),
                                duration: P.loopDuration,
                                ease: P.loopEase,
                                immediateRender: false,
                                onComplete: () => {
                                    r.y = 0
                                },
                            },
                            offsets[i] + k * P.loopDuration
                        )
                    }
                })
            }
            introTl.call(startLoop, null, P.reelDuration)

            const master = { p: 0 }
            const real = { v: 0 }

            const setReal = (r) => {
                rawP = r
                gsap.to(real, { v: r, duration: 0.5, ease: "power2.out", overwrite: true })
            }

            trackLoading(setReal)
            maxTimer = setTimeout(() => setReal(1), P.maxWait)
            gsap.to(master, { p: 1, duration: P.minWait, ease: "linear" })

            const exit = () => {
                reels.forEach((r) => (r.y = 0))
                copyRefs.current.forEach((el) => el && (el.style.display = "none"))
                paintReels()

                const H = viewH
                const revealAt = P.logoHold + P.revealLead

                mainEl = findMain() 
                s.y = P.newPageOffset * H
                sync()

                exitTl = gsap.timeline({ onComplete: handOver, onUpdate: sync })

                reels.forEach((r, i) => {
                    exitTl.to(
                        r,
                        { y: -rowPitch(LETTERS[i].row), duration: P.rollOut, ease: P.rollOutEase },
                        P.logoHold + offsets[i] * 0.6
                    )
                })

                exitTl.to(s, { bot: 100, duration: P.reveal, ease: P.revealEase }, revealAt)
                exitTl.to(s, { y: 0, duration: P.reveal + P.pageExtra, ease: P.pageEase }, revealAt)

                exitTl.add(() => {
                    finishPreload?.()
                    announcePreloadDone()
                }, revealAt + P.contentDelay)
            }

            const tick = () => {
                if (finished) return
                if (master.p < 1 || real.v < 0.999) return
                if (introTl.progress() < 1) return
                if (!loopDone) return
                finished = true
                gsap.ticker.remove(tick)
                exit()
            }
            gsap.ticker.add(tick)

            return () => {
                window.removeEventListener("resize", onResize)
                clearTimeout(maxTimer)
                gsap.ticker.remove(tick)
                gsap.ticker.remove(paintReels)
                clearMain()
                unlock()
            }
        })

        return () => {
            ctx.revert()
        }
    }, [show, finishPreload])

    if (!show) return null

    return (
        <div
            ref={overlayRef}
            data-preloader=""
            data-transition-mask=""
            aria-hidden="true"
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black pointer-events-auto select-none"
            style={{
                clipPath: "inset(0% 0% 0% 0%)",
                WebkitClipPath: "inset(0% 0% 0% 0%)",
                willChange: "clip-path",
            }}
        >
            <div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 107 81"
                    className={LOGO_CLASS}
                    style={{ aspectRatio: "107 / 81", overflow: "visible" }}
                    fill="#fff"
                    role="img"
                    aria-hidden="true"
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
                                        <path
                                            ref={(el) => (copyRefs.current[i] = el)}
                                            d={LOGO_PATHS[glyph]}
                                            transform={`translate(0 ${rowPitch(row)})`}
                                        />
                                    </g>
                                )
                            })}
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    )
}