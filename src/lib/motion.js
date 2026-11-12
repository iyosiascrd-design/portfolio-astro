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

    // ── Apple-style motion ─────────────────────────────────────────────────────────────────
    // 1. Finger tracking is strictly 1:1. No lag, no smoothing: the content is attached to your
    //    finger. Input is only coalesced to one position write per frame.
    // 2. Letting go preserves your exact finger velocity (no boost, no jump), then the ticker
    //    coasts with UIScrollView's exponential deceleration: v *= rate ^ milliseconds.
    // 3. Cruise speed is a spring described the way SwiftUI does (response + dampingFraction).
    //    It is critically damped (no bounce: there is no gesture momentum to justify one) and it
    //    keeps its velocity when retargeted, so hover-stop, resume, or changing your mind halfway
    //    never jerks. Starting from rest therefore always eases in with zero initial jerk.
    decelerationRate: 0.998,                        // 0.998 = UIScrollView "normal", 0.99 = "fast"
    stopSpring:   { response: 0.9, damping: 1 },    // hover in: eases to a stop (s, 1 = no overshoot)
    resumeSpring: { response: 1.3, damping: 1 },    // hover out / after a flick: eases up to speed
    catchSpring:  { response: 0.3, damping: 1 },    // finger lands on a moving ticker
    catchRate: 22,            // 1/s, how quickly a coasting flick is caught when you touch it
    flickMax: 5000,           // px/s cap
    flickMinSpeed: 40,        // px/s, slower releases don't coast
    flingGain: 1,             // 1 = release speed equals finger speed
    velocityWindow: 80,       // ms of finger history used to measure release velocity
    dragThreshold: 4,
    parallaxDepth: 0, // test: 0 = no per-frame image parallax (was 0.12)
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

// Longest frame gap that still counts as real elapsed time. Anything longer (tab was in the
// background, debugger pause, ...) is treated as a pause instead of a leap.
const MAX_FRAME_DT = 0.1

export function createTicker(viewport, track, cfg = TICKER_MOTION) {
    const motionQuery = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null
    const slides = Array.from(track.children)
    // With parallaxDepth 0 nothing ever writes to the per-slide frames, so don't promote each one
    // to its own GPU layer (3 copies x every image) for no reason.
    const frames = slides.map((s) => (cfg.parallaxDepth ? s.querySelector("[data-ticker-parallax]") : null))
    const perCopy = Math.round(slides.length / cfg.copies)
    let baseSpeed = motionQuery?.matches ? 0 : cfg.baseSpeed

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

    let x = 0        // wrapped position, always in (-loopW, 0]
    let travel = 0   // unwrapped position (release velocity is measured from this)

    // ---- state: ONE velocity, made of two parts, both integrated here in tick() --------------
    //   cruise : multiplier on baseSpeed, a critically damped spring (stop / resume)
    //   flick  : px/s left over from a release, decays exponentially (UIScrollView style)
    // No GSAP tweens drive velocity, so nothing can fight anything else, and every hand-off
    // keeps the velocity it had.
    let started = !cfg.startPaused
    let cruise = started ? 1 : 0
    let cruiseVel = 0
    let cruiseTarget = started ? 1 : 0
    let spring = cfg.resumeSpring
    let flick = 0
    let hoverTarget = 1
    let userPaused = false           // the visible pause control (WCAG 2.2.2)
    let focusHeld = false            // keyboard focus is inside: hold still so it can be read
    let pending = 0                  // finger movement received since the last frame (px)
    const decayRate = -Math.log(cfg.decelerationRate) * 1000 // 1/s

    const targetSpeed = () => (userPaused || focusHeld ? 0 : hoverTarget)

    // Retarget the speed spring. Its current velocity is kept, so this never jerks.
    const aim = (to, s) => {
        if (!started) return
        cruiseTarget = to
        spring = s
    }
    const aimHover = () => {
        const t = targetSpeed()
        aim(t, t !== 1 ? cfg.stopSpring : cfg.resumeSpring)
    }

    const takeOver = () => { // finger / trackpad owns motion now
        cruise = 0
        cruiseVel = 0
        cruiseTarget = 0
        flick = 0
        pending = 0
    }
    // Finger landed on a moving ticker: catch it quickly and softly (not a dead freeze).
    const catchIt = () => {
        cruiseTarget = 0
        spring = cfg.catchSpring
    }
    const release = (flickV, fromDrag = true) => {
        if (fromDrag) {
            const v = clamp(flickV, -cfg.flickMax, cfg.flickMax)
            flick = Math.abs(v) >= cfg.flickMinSpeed ? v : 0 // exact finger velocity, no boost
        }
        aimHover() // a plain tap leaves a coasting flick alone; it decays on its own
    }

    let visible = true
    let paintedX = NaN
    let pressed = false
    let dragging = false
    let suppressClick = false
    let lastPX = 0
    let wheelActive = false
    let lastWheelT = 0

    // ---- velocity sampler: unwrapped position, one sample per frame while the finger drives ----
    const samples = []
    const pushSample = () => {
        const t = performance.now()
        samples.push({ p: travel, t })
        while (samples.length > 2 && t - samples[0].t > cfg.velocityWindow * 2) samples.shift()
    }
    const sampledVelocity = () => {
        pushSample() // end the measurement exactly at release
        const now = performance.now()
        const recent = samples.filter((s) => now - s.t <= cfg.velocityWindow)
        if (recent.length < 2) return 0
        const a = recent[0]
        const b = recent[recent.length - 1]
        const dt = (b.t - a.t) / 1000
        if (dt < 0.016) return 0
        return ((b.p - a.p) / dt) * cfg.flingGain // holding still before release => ~0, like iOS
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
        if (!cfg.parallaxDepth) return // no parallax: skip the per-slide writes entirely
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

    // ---- compositor cruise ------------------------------------------------------------------
    // Once the speed spring has settled and nothing is touching the ticker, steady drift is
    // handed to a Web Animation on the track. The browser runs it on the compositor thread, so
    // main-thread work elsewhere on the page (scroll handlers, React renders, image decode)
    // cannot make it stutter. JavaScript takes the position back the instant anything needs
    // it: finger, trackpad, hover, focus, pause, resize.
    let anim = null
    let glideDur = 0
    let glideLoopW = 0

    const canGlide = () =>
        !anim &&
        started &&
        baseSpeed > 0 &&
        loopW > 0 &&
        typeof track.animate === "function" &&
        !dragging && !wheelActive && !pressed &&
        pending === 0 && flick === 0 &&
        cruiseTarget > 0 &&
        Math.abs(cruise - cruiseTarget) < 1e-3 &&
        Math.abs(cruiseVel) < 2e-3

    // ---- frame loop: the display's own timestamp, not a smoothed clock ----------------------
    let rafId = 0
    let lastT = 0
    const loop = (ts) => {
        rafId = requestAnimationFrame(loop)
        tick(ts)
    }
    const startLoop = () => {
        if (!rafId) rafId = requestAnimationFrame(loop)
    }
    const stopLoop = () => {
        cancelAnimationFrame(rafId)
        rafId = 0
        lastT = 0
    }

    const toCompositor = () => {
        cruise = cruiseTarget
        cruiseVel = 0
        glideLoopW = loopW
        glideDur = (loopW / baseSpeed) * 1000
        anim = track.animate(
            [{ transform: "translate3d(0px, 0px, 0px)" }, { transform: `translate3d(${-loopW}px, 0px, 0px)` }],
            { duration: glideDur, iterations: Infinity, easing: "linear" }
        )
        anim.currentTime = (-x / loopW) * glideDur
        anim.playbackRate = cruise
        stopLoop() // nothing left to do per frame
    }

    // Take the position back from the compositor, painted this very task so nothing flashes.
    const toJS = () => {
        if (!anim) return
        const t = Number(anim.currentTime) || 0
        const phase = (((t % glideDur) + glideDur) % glideDur) / glideDur
        x = -phase * glideLoopW
        anim.cancel()
        anim = null
        paintedX = NaN
        paint()
        startLoop()
    }

    const tick = (ts) => {
        if (!visible || !loopW) {
            lastT = 0
            return
        }
        // Real elapsed time from the display's frame timestamp. A dropped frame therefore costs
        // exactly the distance it should: the ticker keeps the true time, it never "slows down".
        const dt = lastT ? clamp((ts - lastT) / 1000, 0, MAX_FRAME_DT) : 1 / 60
        lastT = ts

        if (wheelActive && performance.now() - lastWheelT > 120) {
            wheelActive = false
            pending = 0
            release(0, false) // the OS already supplies trackpad momentum; no extra flick on top
        }

        if (dragging || wheelActive) {
            // Direct manipulation: 1:1 with the finger, written once per frame.
            x += pending
            travel += pending
            pending = 0
            pushSample()
        } else {
            // 1) flick: exponential deceleration (caught faster while a finger is down)
            flick *= Math.exp(-(pressed ? cfg.catchRate : decayRate) * dt)
            if (Math.abs(flick) < 1) flick = 0

            // 2) cruise: critically damped spring, response/damping like SwiftUI. Semi-implicit
            //    Euler in small sub-steps, stable on any frame rate.
            const omega = (2 * Math.PI) / spring.response
            const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
            const h = dt / steps
            for (let i = 0; i < steps; i++) {
                const accel = omega * omega * (cruiseTarget - cruise) - 2 * spring.damping * omega * cruiseVel
                cruiseVel += accel * h
                cruise += cruiseVel * h
            }
            if (cruise < 0) { cruise = 0; cruiseVel = 0 } // never drift backwards
            if (cruiseTarget === 0 && cruise < 0.002) { cruise = 0; cruiseVel = 0 }

            const vel = -baseSpeed * cruise + flick
            x += vel * dt
            travel += vel * dt
        }

        wrap()
        paint()
        if (canGlide()) toCompositor()
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
            toJS()
            pressed = true
            wheelActive = false
            pending = 0
            catchIt()
            lastPX = this.pointerX
        },
        onDragStart() {
            dragging = true
            suppressClick = true
            viewport.dataset.dragging = "true"
            takeOver() // lastPX stays from the press, so the first few px are not lost
            samples.length = 0
            pushSample()
        },
        onDrag() {
            const px = this.pointerX
            pending += px - lastPX // applied 1:1 in the next tick
            lastPX = px
        },
        onRelease() {
            pressed = false
            if (dragging) {
                const v = sampledVelocity()
                pending = 0
                release(v)
            } else {
                release(0, false)
            }
            endDrag()
        },
    })[0]

    const onEnter = (e) => {
        if (e.pointerType !== "mouse") return
        toJS()
        hoverTarget = cfg.hoverFactor
        if (!pressed && !dragging && !wheelActive) aimHover()
    }
    const onLeave = (e) => {
        if (e.pointerType !== "mouse") return
        toJS()
        hoverTarget = 1
        if (!pressed && !dragging && !wheelActive) aimHover()
    }

    // Trackpad: 1:1 position, the OS already provides momentum events.
    const onWheel = (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || dragging) return
        e.preventDefault()
        toJS()
        let dx = e.deltaX
        if (e.deltaMode === 1) dx *= 16
        else if (e.deltaMode === 2) dx *= vpW
        if (!wheelActive) { wheelActive = true; takeOver(); samples.length = 0; pushSample() }
        lastWheelT = performance.now()
        pending -= dx
    }

    // ---- keyboard / assistive tech ---------------------------------------------------------
    // Slides can take focus. The viewport is overflow:hidden, so the browser may "scroll" it to
    // a focused slide; the ticker is moved with transforms, so undo that and bring the slide
    // into view by moving the track instead.
    const ensureVisible = (el) => {
        const i = slides.indexOf(el)
        if (i < 0 || !loopW) return
        toJS()
        const left = lefts[i] + x
        const w = widths[i]
        if (left < 0) x -= left
        else if (left + w > vpW) x -= left + w - vpW
        wrap()
        paint()
    }
    const onFocusIn = (e) => {
        viewport.scrollLeft = 0
        // Only keyboard focus holds the ticker; a mouse click must not move or stop anything.
        if (!e.target.matches?.(":focus-visible")) return
        toJS()
        focusHeld = true
        const slide = slides.find((s) => s.contains(e.target))
        if (slide) ensureVisible(slide)
        aimHover()
    }
    const onFocusOut = (e) => {
        if (viewport.contains(e.relatedTarget)) return
        if (!focusHeld) return
        focusHeld = false
        aimHover()
    }
    const onViewportScroll = () => {
        if (viewport.scrollLeft) viewport.scrollLeft = 0
    }

    // The reduced-motion preference is honoured live, not just at creation.
    const onMotionPref = () => {
        toJS()
        baseSpeed = motionQuery.matches ? 0 : cfg.baseSpeed
        cruise = 0
        cruiseVel = 0
        aimHover()
    }

    viewport.addEventListener("pointerenter", onEnter)
    viewport.addEventListener("pointerleave", onLeave)
    viewport.addEventListener("wheel", onWheel, { passive: false })
    viewport.addEventListener("focusin", onFocusIn)
    viewport.addEventListener("focusout", onFocusOut)
    viewport.addEventListener("scroll", onViewportScroll, { passive: true })
    motionQuery?.addEventListener?.("change", onMotionPref)

    const ro = new ResizeObserver(() => {
        toJS() // keyframes depend on the loop width: rebuild them after a resize
        measure()
    })
    ro.observe(viewport)
    ro.observe(track)

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(viewport)

    track.style.willChange = "transform"
    measure()
    paint()
    startLoop()

    return {
        consumeDrag: () => suppressClick,
        start() {
            if (started) return
            started = true
            aimHover()
        },
        setPaused(p) {
            toJS()
            userPaused = !!p
            aimHover()
        },
        destroy() {
            stopLoop()
            anim?.cancel()
            anim = null
            draggable.kill()
            ro.disconnect()
            io.disconnect()
            viewport.removeEventListener("pointerenter", onEnter)
            viewport.removeEventListener("pointerleave", onLeave)
            viewport.removeEventListener("wheel", onWheel)
            viewport.removeEventListener("focusin", onFocusIn)
            viewport.removeEventListener("focusout", onFocusOut)
            viewport.removeEventListener("scroll", onViewportScroll)
            motionQuery?.removeEventListener?.("change", onMotionPref)
            track.style.willChange = ""
            gsap.set(track, { clearProps: "transform" })
            frames.forEach((f) => { if (f) { f.style.willChange = ""; gsap.set(f, { clearProps: "transform" }) } })
        },
    }
}