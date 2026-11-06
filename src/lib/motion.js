// src/lib/motion.js
import gsap from "gsap"
import { Draggable } from "gsap/Draggable"

gsap.registerPlugin(Draggable)

export const customEase = [0.16, 1, 0.3, 1]
export const taylorEase = [0.22, 1, 0.36, 1]
export const PARALLAX_FACTOR = 0.75

export const TICKER_HEIGHT = "clamp(200px, 50svh, 400px)"

export const TICKER_REVEAL = {
    from: "110%",
    duration: 2.2,
    stagger: 0.16,
    delay: 0.3,
}

export const TICKER_MOTION = {
    copies: 3,
    baseSpeed: 80,
    hoverFactor: 0,
    // Hover stop: ease-OUT = brakes smoothly with a long, soft tail.
    hoverStopDuration: 2.4,
    hoverStopEase: "power3.out",
    // Hover resume: waits a beat, then ease-IN-OUT = slow gentle ramp, no sudden pickup.
    hoverResumeDuration: 2.4,
    hoverResumeDelay: 0.2,
    hoverResumeEase: "power3.inOut",
    flickMinDuration: 0.9,    // s, glide time for a gentle flick
    flickMaxDuration: 2.4,    // s, glide time for a max-speed flick
    flickMax: 4000,           // px/s cap
    flingGain: 1,             // 1 = release speed equals finger speed
    velocityWindow: 100,      // ms of pointer history used to measure a flick
    dragThreshold: 4,
    parallaxDepth: 0.12,
}

export const ACCORDION = {
    duration: 0.8,
    ease: [0.32, 0.72, 0, 1],
    fadeIn: 0.5,
    fadeInDelay: 0.15,
    fadeOut: 0.3,
}
export const ACCORDION_EASE = "cubic-bezier(0.32, 0.72, 0, 1)"

export const SERVICES_REVEAL = {
    stagger: 0.25,
    delay: 0.3,
    rowDuration: 1.6,
    dividerDuration: 1.8,
    rise: 56,
}

export const SERVICES_VIEWPORT = { once: true, amount: "some", margin: "0px 0px -12% 0px" }

export const servicesListContainerVariants = {
    hidden: {},
    show: {
        transition: { staggerChildren: SERVICES_REVEAL.stagger, delayChildren: SERVICES_REVEAL.delay },
    },
}

export const servicesRowVariants = {
    hidden: { y: SERVICES_REVEAL.rise, opacity: 0 },
    show: {
        y: 0, opacity: 1,
        transition: {
            y: { duration: SERVICES_REVEAL.rowDuration, ease: customEase },
            opacity: { duration: SERVICES_REVEAL.rowDuration * 0.7, ease: "easeOut" },
        },
    },
}

export const servicesDividerVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    show: {
        scaleX: 1, opacity: 1,
        transition: {
            scaleX: { duration: SERVICES_REVEAL.dividerDuration, ease: customEase },
            opacity: { duration: SERVICES_REVEAL.dividerDuration * 0.5, ease: "easeOut" },
        },
    },
}

export const servicesContainerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}

export const taylorServiceRowVariants = {
    hidden: { y: 48, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.9, ease: taylorEase } },
}

export const dividerVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    show: { scaleX: 1, opacity: 1, transition: { duration: 0.95, ease: taylorEase } },
}

export const maskContainerVariants = {
    hidden: {},
    show: (custom = {}) => ({
        transition: { staggerChildren: custom.stagger || 0.045, delayChildren: custom.delay || 0.08 },
    }),
}

export const maskItemVariants = {
    hidden: { y: "115%", opacity: 0 },
    show: { y: "0%", opacity: 1, transition: { duration: 0.85, ease: customEase } },
}

export const captionVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: taylorEase } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: "easeOut" } },
}

export const wrapperVariants = {
    open: { height: "auto", transition: { duration: 0.6, ease: customEase } },
    closed: { height: 0, transition: { duration: 0.5, ease: customEase, delay: 0.15 } },
}

export const navListVariants = {
    open: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
    closed: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
}

export const linkItemVariants = {
    open: { y: "0%", opacity: 1, transition: { duration: 0.7, ease: customEase } },
    closed: { y: "110%", opacity: 0, transition: { duration: 0.4, ease: customEase } },
}

export const socialVariants = {
    open: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.45, ease: customEase } },
    closed: { opacity: 0, y: 10, transition: { duration: 0.3, ease: "easeIn" } },
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

export function createTicker(viewport, track, cfg = TICKER_MOTION) {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const slides = Array.from(track.children)
    const frames = slides.map((s) => s.querySelector("[data-ticker-parallax]"))
    const perCopy = Math.round(slides.length / cfg.copies)
    const baseSpeed = reduceMotion ? 0 : cfg.baseSpeed

    // GSAP's fastest write path: cached setters, no per-frame string building.
    gsap.set(track, { force3D: true, x: 0 })
    const setTrackX = gsap.quickSetter(track, "x", "px")
    const setFrameX = frames.map((f) => {
        if (!f) return null
        f.style.willChange = "transform"
        gsap.set(f, { force3D: true, x: 0 })
        return gsap.quickSetter(f, "x", "px")
    })

    let loopW = 0
    let vpW = 0
    let lefts = []
    let widths = []

    let x = 0        // wrapped position (painted)
    let travel = 0   // unwrapped position (flick velocity is measured from this)

    // Velocity = auto-scroll part + flick part. Each is driven by ONE gsap tween,
    // so nothing eases on top of anything else.
    const m = { cruise: 1, flick: 0 }
    let cruiseTween = null
    let flickTween = null
    let hoverTarget = 1

    const tweenCruise = (to, stopping) => {
        cruiseTween?.kill()
        cruiseTween = gsap.to(m, {
            cruise: to,
            duration: stopping ? cfg.hoverStopDuration : cfg.hoverResumeDuration,
            ease: stopping ? cfg.hoverStopEase : cfg.hoverResumeEase,
            delay: stopping ? 0 : cfg.hoverResumeDelay,
        })
    }
    const takeOver = () => { // finger/trackpad owns motion
        cruiseTween?.kill()
        flickTween?.kill()
        m.cruise = 0
        m.flick = 0
    }
    const release = (flickV) => { // hand motion back to the ticker, continuously
        const v = clamp(flickV, -cfg.flickMax, cfg.flickMax)
        flickTween?.kill()
        m.flick = v
        if (v) {
            const dur = gsap.utils.mapRange(0, cfg.flickMax, cfg.flickMinDuration, cfg.flickMaxDuration, Math.abs(v))
            flickTween = gsap.to(m, { flick: 0, duration: dur, ease: "power3.out" })
        }
        tweenCruise(hoverTarget, hoverTarget !== 1)
    }

    let visible = true
    let paintedX = NaN
    let pressed = false
    let dragging = false
    let suppressClick = false
    let lastPX = 0
    let wheelActive = false
    let lastWheelT = 0

    // ---- velocity sampler (unwrapped position over a short time window) ----
    const samples = []
    const pushSample = () => {
        const t = performance.now()
        samples.push({ p: travel, t })
        while (samples.length > 2 && t - samples[0].t > cfg.velocityWindow * 2) samples.shift()
    }
    const sampledVelocity = () => {
        const now = performance.now()
        const recent = samples.filter((s) => now - s.t <= cfg.velocityWindow)
        if (recent.length < 2) return 0
        const a = recent[0]
        const b = recent[recent.length - 1]
        const dt = (b.t - a.t) / 1000
        if (dt < 0.016) return 0
        const fresh = clamp(1 - (now - b.t) / cfg.velocityWindow, 0, 1)
        return ((b.p - a.p) / dt) * fresh * cfg.flingGain
    }

    const measure = () => {
        if (!slides.length) return
        vpW = viewport.clientWidth
        const rects = slides.map((s) => s.getBoundingClientRect())
        const first = rects[0].left
        lefts = rects.map((r) => r.left - first)
        widths = rects.map((r) => r.width)
        loopW = lefts[perCopy] || 0
    }

    const wrap = () => {
        if (!loopW) return
        x = x % loopW
        if (x > 0) x -= loopW
    }

    const paint = () => {
        if (x === paintedX) return
        paintedX = x
        setTrackX(x)
        for (let i = 0; i < slides.length; i++) {
            const set = setFrameX[i]
            if (!set) continue
            const w = widths[i]
            const left = lefts[i] + x
            if (left > vpW || left + w < 0) continue
            const p = (left + w / 2 - vpW / 2) / ((vpW + w) / 2)
            set(-p * cfg.parallaxDepth * w)
        }
    }

    const tick = () => {
        if (!visible || !loopW) return
        // deltaRatio is GSAP's lag-smoothed frame time: steady on 60/120/144Hz and after hitches
        const dt = Math.min(gsap.ticker.deltaRatio(60), 3) / 60

        if (wheelActive && performance.now() - lastWheelT > 120) {
            wheelActive = false
            release(sampledVelocity())
        }

        if (!pressed && !dragging && !wheelActive) {
            const vel = -baseSpeed * m.cruise + m.flick
            x += vel * dt
            travel += vel * dt
        }

        wrap()
        paint()
    }

    const proxy = document.createElement("div")

    const endDrag = () => {
        if (!dragging) return
        dragging = false
        delete viewport.dataset.dragging
        setTimeout(() => { suppressClick = false }, 80)
    }

    const draggable = Draggable.create(proxy, {
        trigger: viewport,
        type: "x",
        lockAxis: true,
        minimumMovement: cfg.dragThreshold,
        cursor: "grab",
        activeCursor: "grabbing",
        onPress() {
            pressed = true
            wheelActive = false
            takeOver()
            samples.length = 0
            lastPX = this.pointerX
            pushSample()
        },
        onDragStart() {
            dragging = true
            suppressClick = true
            viewport.dataset.dragging = "true"
            lastPX = this.pointerX
        },
        onDrag() {
            const px = this.pointerX
            const dx = px - lastPX
            lastPX = px
            x += dx
            travel += dx
            pushSample()
            wrap()
            paint()
        },
        onRelease() {
            pressed = false
            release(dragging ? sampledVelocity() : 0)
            endDrag()
        },
    })[0]

    const onEnter = (e) => {
        if (e.pointerType !== "mouse") return
        hoverTarget = cfg.hoverFactor
        if (!pressed && !dragging && !wheelActive) tweenCruise(hoverTarget, true)
    }
    const onLeave = (e) => {
        if (e.pointerType !== "mouse") return
        hoverTarget = 1
        if (!pressed && !dragging && !wheelActive) tweenCruise(1, false)
    }

    // Trackpad: 1:1 position, the OS already provides momentum events.
    const onWheel = (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || dragging) return
        e.preventDefault()
        let dx = e.deltaX
        if (e.deltaMode === 1) dx *= 16
        else if (e.deltaMode === 2) dx *= vpW
        if (!wheelActive) { wheelActive = true; takeOver(); samples.length = 0; pushSample() }
        lastWheelT = performance.now()
        x -= dx
        travel -= dx
        pushSample()
        wrap()
        paint()
    }

    viewport.addEventListener("pointerenter", onEnter)
    viewport.addEventListener("pointerleave", onLeave)
    viewport.addEventListener("wheel", onWheel, { passive: false })

    const ro = new ResizeObserver(measure)
    ro.observe(viewport)
    ro.observe(track)

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(viewport)

    track.style.willChange = "transform"
    measure()
    paint()
    gsap.ticker.add(tick)

    return {
        consumeDrag: () => suppressClick,
        destroy() {
            gsap.ticker.remove(tick)
            draggable.kill()
            cruiseTween?.kill()
            flickTween?.kill()
            ro.disconnect()
            io.disconnect()
            viewport.removeEventListener("pointerenter", onEnter)
            viewport.removeEventListener("pointerleave", onLeave)
            viewport.removeEventListener("wheel", onWheel)
            track.style.willChange = ""
            gsap.set(track, { clearProps: "transform" })
            frames.forEach((f) => { if (f) { f.style.willChange = ""; gsap.set(f, { clearProps: "transform" }) } })
        },
    }
}