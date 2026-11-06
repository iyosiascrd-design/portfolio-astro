// src/components/FlipbookCarousel.jsx
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import gsap from "gsap"
import { ArrowRight } from "lucide-react"

const CARD_VW = 80
const CARD_RATIO = 1.5
const SIDE_GUTTER = 12
const SCALE_DROP = 0.08
const TUCK_ROTATE = 62 
const SPACING = 0.94
const PERSPECTIVE = 1200
const CARD_TOP = 24      // px gap above the cards (pushes them lower)
const CARD_BOTTOM = 72   // px of room under the cards so the drop shadow isn't cut off

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

// React 19 wants fetchPriority, React 18 wants the lowercase attribute
const FETCH_PRIORITY_ATTR = parseInt(React.version, 10) >= 19 ? "fetchPriority" : "fetchpriority"

const vp = { w: typeof window !== "undefined" ? window.innerWidth : 390 }

const wrap = (x, n) => ((((x + n / 2) % n) + n) % n) - n / 2
const mod = (x, n) => ((x % n) + n) % n

const R = (TUCK_ROTATE * Math.PI) / 180
const offsetFor = (v, W) => {
    const t = Math.abs(v)
    const inner = Math.min(t, 1)
    let x = (W * Math.sin(R * inner)) / R
    if (t > 1) x += (t - 1) * W * Math.cos(R)
    return Math.sign(v) * x * SPACING
}

const DrumCard = ({ project, index, count, pos, onActivate }) => {
    const d = useTransform(pos, (p) => wrap(index - p, count))

    const transform = useTransform(d, (v) => {
        const abs = Math.abs(v)
        const scale = Math.max(0.8, 1 - abs * SCALE_DROP)
        const W = (vp.w * CARD_VW) / 100
        const x = offsetFor(v, W)
        const rotate = -Math.max(-1, Math.min(1, v)) * TUCK_ROTATE
        return `perspective(${PERSPECTIVE}px) translateX(${x}px) rotateY(${rotate}deg) scale(${scale})`
    })

    const zIndex = useTransform(d, (v) => Math.round(1000 - Math.abs(v) * 100) + (index * 0.001))

    // Load order: the front card first, its two neighbours next, the rest at low priority,
    // so the cards you can actually see are not competing with the ones that are tucked away.
    const [loaded, setLoaded] = useState(false)
    const imgRef = useRef(null)
    const isNeighbour = index === 0 || index === 1 || index === count - 1
    const priority = index === 0 ? "high" : isNeighbour ? "auto" : "low"
    useEffect(() => {
        const el = imgRef.current
        if (el?.complete && el.naturalWidth) setLoaded(true) // already cached
    }, [])

    const opacity = useTransform(d, [-1.8, -1.2, 1.2, 1.8], [0, 1, 1, 0])
    const shade = useTransform(d, [-1.5, -1, 0, 1, 1.5], [0.6, 0.3, 0, 0.3, 0.6])
    const pointerEvents = useTransform(d, (v) => (Math.abs(v) > 1.2 ? "none" : "auto"))
    
    // Shadow fades in fully at center (d=0) and disappears as it tucks away
    const shadowOpacity = useTransform(d, [-0.6, 0, 0.6], [0, 1, 0])

    return (
        <motion.div
            role="button"
            tabIndex={0}
            aria-label={`Open ${project.name}`}
            onClick={() => onActivate(index, project.name)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onActivate(index, project.name)
                }
            }}
            style={{
                transform,
                zIndex,
                opacity,
                pointerEvents,
                width: `${CARD_VW}vw`,
                height: `${CARD_VW * CARD_RATIO}vw`,
                left: `${(100 - CARD_VW) / 2}vw`,
                transformOrigin: "center center",
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
            }}
            className="absolute top-0 cursor-pointer select-none"
        >
            {/* 1. HARDWARE-ACCELERATED SHADOW LAYER (Softened for dark mode) */}
            <motion.div
                style={{ opacity: shadowOpacity }}
                className="absolute inset-0 rounded-[16px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] pointer-events-none will-change-opacity"
            />

            {/* 2. VISUAL CONTENT CLIPPING WRAPPER */}
            <div className="absolute inset-0 overflow-hidden rounded-[16px] bg-[var(--bg-surface-dark)]">
                <img
                    ref={imgRef}
                    src={project.image}
                    srcSet={project.srcSet}
                    sizes={project.srcSet ? `${CARD_VW}vw` : undefined}
                    alt={project.name}
                    draggable={false}
                    decoding="async"
                    {...{ [FETCH_PRIORITY_ATTR]: priority }}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                    style={{ opacity: loaded ? 1 : 0 }}
                    className="absolute inset-0 object-cover w-full h-full pointer-events-none select-none transition-opacity duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                
                <motion.div
                    style={{ opacity: shade }}
                    className="absolute inset-0 bg-black rounded-[inherit] pointer-events-none"
                />

                <div className="absolute bottom-0 inset-x-0 z-10 flex items-end justify-between p-[20px] text-white pointer-events-none">
                    <span className="Caption !text-[12px] uppercase !font-medium text-white leading-[1.2]">
                        {project.name}
                    </span>

                    <span className="Caption !text-[12px] uppercase !font-medium leading-[1.2] flex items-center gap-[6px] text-white">
                        <span>VIEW PROJECT</span>
                        <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                            className="flex items-center"
                        >
                            <ArrowRight className="w-[1.1em] h-[1.1em]" strokeWidth={2.5} />
                        </motion.span>
                    </span>
                </div>
            </div>
        </motion.div>
    )
}

// Pass a ref to get { goTo(index) }: flips to that card by the shortest way round.
const FlipbookCarousel = forwardRef(function FlipbookCarousel({ projects, onSelect }, ref) {
    const count = projects.length
    const pos = useMotionValue(0)
    const state = useRef({ v: 0 }) 
    const tween = useRef(null)
    const wrapRef = useRef(null)
    const drag = useRef({ id: null, locked: null, x0: 0, y0: 0, pos0: 0, from: 0, samples: [] })
    const moved = useRef(false)
    const paused = useRef(false)
    const inView = useRef(true)
    const resumeTimer = useRef(null)

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

    useEffect(() => {
        const onResize = () => (vp.w = window.innerWidth)
        onResize()
        window.addEventListener("resize", onResize)
        return () => {
            window.removeEventListener("resize", onResize)
            killTween()
        }
    }, [])

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
            if (paused.current || !inView.current || document.hidden) return
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

    const cardPx = () => (vp.w * CARD_VW) / 100

    const release = (velocity) => {
        const cur = pos.get()
        const speed = Math.abs(velocity)

        if (speed >= FLING_MIN_VELOCITY) {
            const v = Math.max(-FLING_MAX_VELOCITY, Math.min(FLING_MAX_VELOCITY, velocity))
            const s = Math.abs(v)
            const target = Math.round(cur + (v * FLING_COAST) )
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
                velocity = -((last.x - first.x) / dt) * 1000 / cardPx()
            }
            release(velocity)
        }
        resumeAutoplay()
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
        <div
            ref={wrapRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, false)}
            onPointerCancel={(e) => endDrag(e, true)}
            style={{
                touchAction: "pan-y",
                height: `calc(${CARD_VW * CARD_RATIO}vw + ${CARD_TOP + CARD_BOTTOM}px)`,
            }}
            className="relative w-full overflow-hidden"
        >
            <div className="absolute inset-x-0 bottom-0" style={{ top: CARD_TOP }}>
                {projects.map((project, i) => (
                    <DrumCard
                        key={project.id || i}
                        project={project}
                        index={i}
                        count={count}
                        pos={pos}
                        onActivate={handleActivate}
                    />
                ))}
            </div>
        </div>
    )
})

export default FlipbookCarousel