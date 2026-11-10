// src/components/FlipbookCarousel.jsx
import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
    useEffect,
    useLayoutEffect,
    useState,
} from "react"
import { motion, useMotionValue, useTransform, useReducedMotion } from "framer-motion"
import gsap from "gsap"
import { ArrowRight } from "lucide-react"

/* ---------- sizing ---------- */
const CARD_VW_MAX = 78
const CARD_RATIO = 1.4
const MAX_VIEWPORT_H = 0.82
const MIN_CARD_PX = 160
const SIDE_SCALE = 0.89

const TUCK_ROTATE = 30
const FAN_ROTATE = 32

// Decreased from 4.5 to 2.2 for much stronger 3D keystoning
const PERSPECTIVE_PER_W =2.2 

const PEEK = 0.14
const EDGE_MARGIN = 8
const DRAG_STEP = 0.55
const CARD_TOP = 24
const CARD_BOTTOM = 72
const CARD_RADIUS = "clamp(12px, 5vw, 20px)"

const FLING_MIN_VELOCITY = 1.4
const FLING_MAX_VELOCITY = 16
const FLING_COAST = 0.55
const FLING_MIN_TIME = 0.5
const FLING_MAX_TIME = 2.6
const SNAP_TIME = 0.6
const STEP_TIME = 0.95
const VELOCITY_WINDOW = 100
const AUTOPLAY_MS = 3200
const RESUME_MS = 2500

/* ---------- layered shadows (negative spread + downward offset keeps them from bleeding past the top/bottom of the carousel) ---------- */
const ACTIVE_SHADOW = [
    "0 1px 2px rgba(0,0,0,0.12)",
    "0 4px 8px -1px rgba(0,0,0,0.14)",
    "0 12px 20px -4px rgba(0,0,0,0.18)",
    "0 24px 40px -10px rgba(0,0,0,0.28)",
].join(", ")

const SIDE_SHADOW = [
    "0 1px 2px rgba(0,0,0,0.10)",
    "0 6px 12px -6px rgba(0,0,0,0.14)",
    "0 14px 24px -14px rgba(0,0,0,0.20)",
].join(", ")

/* Hard guard: a shadow can never paint outside the carousel's own margins.
   Side cards: limited to CARD_TOP / CARD_BOTTOM / EDGE_MARGIN on all sides.
   Active card: same top/bottom, but free sideways so it can fall onto its neighbours. */
const SIDE_SHADOW_CLIP = `inset(-${CARD_TOP}px -${EDGE_MARGIN}px -${CARD_BOTTOM}px -${EDGE_MARGIN}px)`
const ACTIVE_SHADOW_CLIP = `inset(-${CARD_TOP}px -1000px -${CARD_BOTTOM}px -1000px)`

const FETCH_PRIORITY_ATTR = parseInt(React.version, 10) >= 19 ? "fetchPriority" : "fetchpriority"

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

const wrap = (x, n) => ((((x + n / 2) % n) + n) % n) - n / 2
const mod = (x, n) => ((x % n) + n) % n
const lerp = (a, b, t) => a + (b - a) * t

/* ---------- flipbook fan-out & tuck maths ---------- */
const R = (TUCK_ROTATE * Math.PI) / 180
const SIDE_HALF = 0.5 * SIDE_SCALE * Math.cos(R)
const SIDE_T = (SIDE_SCALE * Math.sin(R)) / (2 * PERSPECTIVE_PER_W)
const SIDE_OUTER = SIDE_HALF / (1 - SIDE_T)

const SIDE_REST = 0.5 + PEEK - SIDE_OUTER
const FAN_PEAK = 0.38 
const SIDE_EXTENT = 0.5 + PEEK

const offsetFor = (v, W) => {
    const s = Math.sign(v)
    const a = Math.abs(v)

    let shift
    if (a <= 0.5) {
        const t = a / 0.5
        const ease = Math.sin((t * Math.PI) / 2)
        shift = lerp(0, FAN_PEAK, ease)
    } else if (a <= 1) {
        const t = (a - 0.5) / 0.5
        const ease = 0.5 - 0.5 * Math.cos(t * Math.PI)
        shift = lerp(FAN_PEAK, SIDE_REST, ease)
    } else {
        shift = SIDE_REST
    }

    return s * shift * W
}

const scaleFor = (v) => {
    const a = Math.abs(v)
    if (a <= 0.5) {
        return lerp(1, SIDE_SCALE, a / 0.5)
    }
    return SIDE_SCALE
}

const rotateFor = (v) => {
    const s = Math.sign(v)
    const a = Math.abs(v)
    if (a <= 0.5) {
        const t = a / 0.5
        return -s * lerp(0, FAN_ROTATE, Math.sin((t * Math.PI) / 2))
    } else if (a <= 1) {
        const t = (a - 0.5) / 0.5
        return -s * lerp(FAN_ROTATE, TUCK_ROTATE, 0.5 - 0.5 * Math.cos(t * Math.PI))
    }
    return -s * TUCK_ROTATE
}

// 0 = active, 1 = visible side card, 2 = fully faded out (culled)
const bandOf = (v) => {
    const a = Math.abs(v)
    return a < 0.5 ? 0 : a < 1.35 ? 1 : 2
}

// The wrapper carries the page's side padding (var(--page-pad), falling back to EDGE_MARGIN).
// Read it back in px so the tucked side cards end exactly at the page margin on both sides.
const readPagePad = (el) => {
    if (!el || typeof window === "undefined") return EDGE_MARGIN
    const pad = parseFloat(window.getComputedStyle(el).paddingLeft)
    return Number.isFinite(pad) ? pad : EDGE_MARGIN
}

const computeCardW = (el) => {
    const vw = el ? el.clientWidth : typeof window !== "undefined" ? window.innerWidth : 390
    const vh = typeof window !== "undefined" ? window.innerHeight : 800
    const pad = readPagePad(el)

    const maxByWidth = Math.min((vw * CARD_VW_MAX) / 100, (vw / 2 - pad) / SIDE_EXTENT)
    const maxByViewportH = (vh * MAX_VIEWPORT_H) / CARD_RATIO

    return Math.max(MIN_CARD_PX, Math.min(maxByWidth, maxByViewportH))
}

const DrumCard = ({ project, index, count, pos, cardW, onActivate }) => {
    const reduce = useReducedMotion()
    const d = useTransform(pos, (p) => wrap(index - p, count))

    const outerTransform = useTransform([d, cardW], ([v, W]) => {
        const x = offsetFor(v, W) - W / 2
        return `translate3d(${x}px, 0px, 0px)`
    })

    const innerTransform = useTransform([d, cardW], ([v, W]) => {
        const scale = scaleFor(v)
        const rotate = rotateFor(v)
        return `perspective(${W * PERSPECTIVE_PER_W}px) rotateY(${rotate}deg) scale(${scale})`
    })

    const height = useTransform(cardW, (W) => W * CARD_RATIO)

    const zIndex = useTransform(d, (v) => {
        const distScore = Math.round((count - Math.abs(v)) * 100)
        return 1000 + distScore * count + index
    })

    const [band, setBand] = useState(() => bandOf(d.get()))
    useEffect(() => {
        setBand(bandOf(d.get()))
        return d.on("change", (v) => setBand(bandOf(v)))
    }, [d])

    const [loaded, setLoaded] = useState(false)
    const imgRef = useRef(null)
    const isNeighbour = index === 0 || index === 1 || index === count - 1
    const priority = index === 0 ? "high" : isNeighbour ? "auto" : "low"
    
    useEffect(() => {
        const el = imgRef.current
        if (el?.complete && el.naturalWidth) setLoaded(true)
    }, [])

    const opacity = useTransform(d, [-1.35, -1, 1, 1.35], [0, 1, 1, 0])
    
    // Active card casts a large, soft shadow onto its neighbours; fades out as it leaves centre
    const activeShadowOpacity = useTransform(d, [-0.6, 0, 0.6], [0, 1, 0])
    // Side cards keep a constant, tighter contact shadow (same for every side card)
    const sideShadowOpacity = useTransform(d, [-0.6, 0, 0.6], [1, 0, 1])
    const pointerEvents = useTransform(d, (v) => (Math.abs(v) > 1.2 ? "none" : "auto"))

    return (
        <motion.div
            role="button"
            tabIndex={band === 0 ? 0 : -1}
            aria-label={band === 0 ? `Open ${project.name}` : `Show ${project.name}`}
            aria-current={band === 0 ? "true" : undefined}
            aria-hidden={band === 2 ? true : undefined}
            data-index={index}
            onClick={() => onActivate(index, project.name)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onActivate(index, project.name)
                }
            }}
            style={{
                transform: outerTransform,
                zIndex,
                opacity,
                pointerEvents,
                width: cardW,
                height,
                left: "50%",
                isolation: "isolate",
                // Fully faded cards are skipped by the renderer and don't hold a GPU layer
                visibility: band === 2 ? "hidden" : "visible",
                willChange: band === 2 ? "auto" : "transform, opacity",
            }}
            className="group absolute top-0 cursor-pointer select-none outline-none"
        >
            <motion.div
                style={{
                    transform: innerTransform,
                    transformOrigin: "center center",
                    willChange: "transform",
                }}
                className="relative h-full w-full"
            >
                {/* Side cards: soft contact shadow */}
                <motion.div
                    style={{
                        opacity: sideShadowOpacity,
                        borderRadius: CARD_RADIUS,
                        boxShadow: SIDE_SHADOW,
                        clipPath: SIDE_SHADOW_CLIP,
                    }}
                    className="pointer-events-none absolute inset-0"
                />

                {/* Active card: layered, realistic shadow cast onto the side cards */}
                <motion.div
                    style={{
                        opacity: activeShadowOpacity,
                        borderRadius: CARD_RADIUS,
                        boxShadow: ACTIVE_SHADOW,
                        clipPath: ACTIVE_SHADOW_CLIP,
                    }}
                    className="pointer-events-none absolute inset-0"
                />

                <div
                    className="absolute inset-0 overflow-hidden bg-[var(--bg-surface-dark)]"
                    style={{ borderRadius: CARD_RADIUS }}
                >
                    <img
                        ref={imgRef}
                        src={project.image}
                        srcSet={project.srcSet}
                        sizes={project.srcSet ? `${CARD_VW_MAX}vw` : undefined}
                        alt={project.name}
                        draggable={false}
                        decoding="async"
                        {...{ [FETCH_PRIORITY_ATTR]: priority }}
                        onLoad={() => setLoaded(true)}
                        onError={() => setLoaded(true)}
                        style={{ opacity: loaded ? 1 : 0 }}
                        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-500 ease-out"
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                    <div
                        className="pointer-events-none absolute inset-0 z-20 opacity-0 ring-2 ring-inset ring-white transition-opacity group-focus-visible:opacity-100"
                        style={{ borderRadius: CARD_RADIUS }}
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-[20px] text-white">
                        <span className="Caption !text-[12px] uppercase !font-medium leading-[1.2] text-white">
                            {project.name}
                        </span>

                        <span className="Caption flex items-center gap-[6px] !text-[12px] uppercase !font-medium leading-[1.2] text-white">
                            <span>VIEW PROJECT</span>
                            <motion.span
                                animate={reduce || band !== 0 ? { x: 0 } : { x: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                className="flex items-center"
                            >
                                <ArrowRight className="h-[1.1em] w-[1.1em]" strokeWidth={2.5} />
                            </motion.span>
                        </span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

const FlipbookCarousel = forwardRef(function FlipbookCarousel({ projects, onSelect }, ref) {
    const count = projects.length
    const pos = useMotionValue(0)
    const cardW = useMotionValue(computeCardW(null))
    const wrapHeight = useTransform(cardW, (W) => W * CARD_RATIO + CARD_TOP + CARD_BOTTOM)

    const state = useRef({ v: 0 })
    const tween = useRef(null)
    const wrapRef = useRef(null)
    const drag = useRef({ id: null, locked: null, x0: 0, y0: 0, pos0: 0, from: 0, samples: [] })
    const moved = useRef(false)
    const paused = useRef(false)
    const inView = useRef(true)
    const resumeTimer = useRef(null)
    const focusPaused = useRef(false)
    const endDragRef = useRef(() => {})

    const reduceMotion = () =>
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    const setPos = (v) => {
        state.current.v = v
        pos.set(v)
    }

    const killTween = () => {
        tween.current?.kill()
        tween.current = null
    }

    const animateTo = (target, duration, ease) => {
        killTween()
        state.current.v = pos.get()
        if (reduceMotion() || duration <= 0) {
            setPos(target)
            return
        }
        tween.current = gsap.to(state.current, {
            v: target,
            duration,
            ease,
            overwrite: true,
            onUpdate: () => pos.set(state.current.v),
            onComplete: () => {
                pos.set(target)
                tween.current = null
            },
        })
    }

    const settle = (target) => {
        const dist = Math.abs(target - pos.get())
        animateTo(target, Math.min(1.6, STEP_TIME + (dist - 1) * 0.25), "power3.inOut")
    }

    useIsoLayoutEffect(() => {
        const el = wrapRef.current
        if (!el) return

        const measure = () => {
            const next = computeCardW(el)
            if (Math.abs(next - cardW.get()) > 0.5) cardW.set(next)
        }
        measure()

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
        ro?.observe(el)
        ro?.observe(document.body)
        window.addEventListener("resize", measure)
        window.addEventListener("orientationchange", measure)
        return () => {
            ro?.disconnect()
            window.removeEventListener("resize", measure)
            window.removeEventListener("orientationchange", measure)
        }
    }, [cardW])

    useEffect(() => () => killTween(), [])

    useEffect(() => {
        const el = wrapRef.current
        if (!el || typeof IntersectionObserver === "undefined") return
        const io = new IntersectionObserver(
            ([entry]) => {
                inView.current = entry.isIntersecting
            },
            { threshold: 0.3 }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])

    useEffect(() => {
        if (count < 2) return
        const id = setInterval(() => {
            if (paused.current || focusPaused.current) return
            if (!inView.current || document.hidden) return
            if (reduceMotion()) return
            settle(Math.round(pos.get()) + 1)
        }, AUTOPLAY_MS)
        return () => {
            clearInterval(id)
            clearTimeout(resumeTimer.current)
        }
    }, [count])

    const pauseAutoplay = () => {
        paused.current = true
        clearTimeout(resumeTimer.current)
    }

    const resumeAutoplay = () => {
        clearTimeout(resumeTimer.current)
        resumeTimer.current = setTimeout(() => {
            paused.current = false
        }, RESUME_MS)
    }

    const cardPx = () => Math.max(1, cardW.get() * DRAG_STEP)

    const release = (velocity) => {
        const cur = pos.get()
        const speed = Math.abs(velocity)

        if (speed >= FLING_MIN_VELOCITY) {
            const v = Math.max(-FLING_MAX_VELOCITY, Math.min(FLING_MAX_VELOCITY, velocity))
            const s = Math.abs(v)
            const target = Math.round(cur + v * FLING_COAST)
            const dist = Math.abs(target - cur)
            const time = Math.max(FLING_MIN_TIME, Math.min(FLING_MAX_TIME, (3 * dist) / s))
            animateTo(target, time, "power3.out")
            return
        }

        const from = Math.round(drag.current.from)
        const step = Math.max(-1, Math.min(1, Math.round(cur + velocity * 0.25) - from))
        animateTo(from + step, SNAP_TIME, "power3.out")
    }

    const onPointerDown = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        const d = drag.current
        killTween()
        d.id = e.pointerId
        d.locked = null
        d.x0 = e.clientX
        d.y0 = e.clientY
        d.pos0 = pos.get()
        d.from = pos.get()
        d.samples = [{ t: performance.now(), x: e.clientX }]
        moved.current = false
        pauseAutoplay()
    }

    const onPointerMove = (e) => {
        const d = drag.current
        if (d.id !== e.pointerId) return

        if (!d.locked) {
            const dx = e.clientX - d.x0
            const dy = e.clientY - d.y0
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return
            if (Math.abs(dx) > Math.abs(dy)) {
                d.locked = "x"
                moved.current = true
                d.x0 = e.clientX
                d.pos0 = pos.get()
                try {
                    wrapRef.current?.setPointerCapture(e.pointerId)
                } catch (_) {}
            } else {
                d.locked = "y"
                return
            }
        }
        if (d.locked !== "x") return

        setPos(d.pos0 - (e.clientX - d.x0) / cardPx())

        const now = performance.now()
        d.samples.push({ t: now, x: e.clientX })
        while (d.samples.length > 2 && now - d.samples[0].t > VELOCITY_WINDOW) d.samples.shift()
    }

    const endDrag = (e, cancelled) => {
        const d = drag.current
        if (d.id !== e.pointerId) return
        d.id = null
        try {
            wrapRef.current?.releasePointerCapture(e.pointerId)
        } catch (_) {}

        if (d.locked === "x") {
            let velocity = 0
            const s = d.samples
            const last = s[s.length - 1]
            const first = s[0]
            if (!cancelled && last && first && last !== first && performance.now() - last.t < 80) {
                const dt = Math.max(1, last.t - first.t)
                velocity = (-((last.x - first.x) / dt) * 1000) / cardPx()
            }
            release(velocity)
        }
        resumeAutoplay()
    }

    endDragRef.current = endDrag

    // Listen on window so a press that ends outside the carousel can never leave autoplay paused
    useEffect(() => {
        const up = (e) => endDragRef.current(e, false)
        const cancel = (e) => endDragRef.current(e, true)
        window.addEventListener("pointerup", up)
        window.addEventListener("pointercancel", cancel)
        return () => {
            window.removeEventListener("pointerup", up)
            window.removeEventListener("pointercancel", cancel)
        }
    }, [])

    const onKeyDown = (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
        e.preventDefault()
        const next = Math.round(pos.get()) + (e.key === "ArrowRight" ? 1 : -1)
        settle(next)
        wrapRef.current
            ?.querySelector(`[data-index="${mod(next, count)}"]`)
            ?.focus({ preventScroll: true })
    }

    const handleActivate = (index, name) => {
        if (moved.current) return
        const front = Math.round(pos.get())
        if (mod(front, count) === index) {
            onSelect(name)
        } else {
            settle(front + wrap(index - front, count))
        }
    }

    useImperativeHandle(ref, () => ({
        goTo: (index) => {
            if (index < 0 || index >= count) return
            pauseAutoplay()
            const front = Math.round(pos.get())
            settle(front + wrap(index - front, count))
            resumeAutoplay()
        },
    }))

    return (
        <motion.div
            ref={wrapRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerEnter={(e) => e.pointerType === "mouse" && pauseAutoplay()}
            onPointerLeave={(e) => e.pointerType === "mouse" && !drag.current.id && resumeAutoplay()}
            onKeyDown={onKeyDown}
            onFocus={(e) => {
                if (e.target.matches?.(":focus-visible")) focusPaused.current = true
            }}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) focusPaused.current = false
            }}
            role="region"
            aria-roledescription="carousel"
            aria-label="Projects"
            style={{
                touchAction: "pan-y",
                height: wrapHeight,
                paddingInline: `var(--page-pad, ${EDGE_MARGIN}px)`,
            }}
            className="relative w-full overflow-hidden"
        >
            <div
                className="absolute inset-x-0 bottom-0 isolate"
                style={{ top: CARD_TOP }}
                aria-live="off"
            >
                {projects.map((project, i) => (
                    <DrumCard
                        key={project.id || i}
                        project={project}
                        index={i}
                        count={count}
                        pos={pos}
                        cardW={cardW}
                        onActivate={handleActivate}
                    />
                ))}
            </div>
        </motion.div>
    )
})

export default FlipbookCarousel