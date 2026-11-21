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
    hoverFactor: 0.15,                              // hover slows to 15% instead of freezing (0 = full stop)

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
    stopSpring:   { response: 0.6, damping: 1 },    // hover in / pause: eases down (s, 1 = no overshoot)
    resumeSpring: { response: 0.7, damping: 1 },    // hover out / after a flick: eases up to speed
    catchSpring:  { response: 0.3, damping: 1 },    // finger lands on a moving ticker
    catchRate: 22,            // 1/s, how quickly a coasting flick is caught when you touch it
    flickMax: 5000,           // px/s cap
    flickMinSpeed: 40,        // px/s, slower releases don't coast
    flingGain: 1,             // 1 = release speed equals finger speed
    velocityWindow: 80,       // ms of finger history used to measure release velocity
    dragThreshold: 3,

    // ── Wheel / trackpad scrolling ──────────────────────────────────────────────────────────
    wheelVertical: false,     // true = a vertical wheel / two-finger scroll over the ticker also moves it
    wheelGain: 1,             // px of ticker travel per px of wheel delta (raise for faster scrolling)
    wheelSmoothing: 10,       // 1/s, how quickly a mouse-wheel notch glides out (lower = longer glide)

    // ── 3D tilt (disabled) ──────────────────────────────────────────────────────────────────
    tilt: {
        enabled: false,
        perspective: 1100,
        refSpeed: 1600,
        deadzone: 40,
        left:  { rotateY: 12, rotateX: 9 },
        right: { rotateY: 10, rotateX: 16 },
        spring: { response: 0.5, damping: 0.72 },
    },
}

// Phones: slides are narrower, so the same px/s reads faster. Merged over TICKER_MOTION on small screens.
export const TICKER_MOTION_MOBILE = {
    baseSpeed: 55,
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
    const perCopy = Math.round(slides.length / cfg.copies)
    let baseSpeed = motionQuery?.matches ? 0 : cfg.baseSpeed

    // GSAP's fastest write path: cached setters, no per-frame string building.
    gsap.set(track, { force3D: true, x: 0 })
    const setTrackX = gsap.quickSetter(track, "x", "px")

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

    // ---- 3D tilt state ----------------------------------------------------------------------
    const tiltCfg = cfg.tilt
    let tiltOn = !!tiltCfg?.enabled && !motionQuery?.matches
    let lean = 0
    let leanVel = 0
    let leanTarget = 0
    let tiltPrimed = false
    const setRotX = slides.map((s) => gsap.quickSetter(s, "rotationX", "deg"))
    const setRotY = slides.map((s) => gsap.quickSetter(s, "rotationY", "deg"))
    const tiltBusy = () => tiltOn && (lean !== 0 || leanVel !== 0 || leanTarget !== 0)

    // Retarget the speed spring. Its current velocity is kept, so this never jerks.
    const aim = (to, s) => {
        if (!started) return
        if (plan) takeFromPlan()
        cruiseTarget = to
        spring = s
        if (loopW && canGlide()) {
            buildPlan(nowMs())
            stopLoop()
        } else startLoop()
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
    let curVel = 0 // px/s the track is moving right now (negative = left), for getState()
    let paintedX = NaN
    let pressed = false
    let dragging = false
    let suppressClick = false
    let lastPX = 0
    let wheelActive = false
    let lastWheelT = 0
    let wheelRemain = 0 // px of mouse-wheel travel still to glide out (same sign as `pending`)

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

    const stepLean = (dt, userV) => {
        if (!tiltOn) return
        const a = Math.abs(userV)
        leanTarget = a < tiltCfg.deadzone ? 0 : Math.sign(userV) * Math.tanh((a - tiltCfg.deadzone) / tiltCfg.refSpeed)
        const { response, damping } = tiltCfg.spring
        const omega = (2 * Math.PI) / response
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
        const h = dt / steps
        for (let i = 0; i < steps; i++) {
            const accel = omega * omega * (leanTarget - lean) - 2 * damping * omega * leanVel
            leanVel += accel * h
            lean += leanVel * h
        }
        if (leanTarget === 0 && Math.abs(lean) < 0.0005 && Math.abs(leanVel) < 0.005) {
            lean = 0
            leanVel = 0
        }
    }

    const drawTilt = (all = false) => {
        if (!tiltCfg) return
        let rx = 0
        let ry = 0
        if (lean < 0) {
            ry = lean * tiltCfg.left.rotateY
            rx = lean * tiltCfg.left.rotateX
        } else if (lean > 0) {
            ry = lean * tiltCfg.right.rotateY
            rx = lean * tiltCfg.right.rotateX
        }
        if (!tiltPrimed) {
            if (!lean) return
            gsap.set(slides, { transformPerspective: tiltCfg.perspective })
            tiltPrimed = true
        }
        const lo = -vpW * 0.5
        const hi = vpW * 1.5
        for (let i = 0; i < slides.length; i++) {
            if (!all) {
                const l = lefts[i] + x
                if (l > hi || l + widths[i] < lo) continue
            }
            setRotX[i](rx)
            setRotY[i](ry)
        }
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
    }

    // ---- compositor motion plan -------------------------------------------------------------
    let plan = null

    const SIM_H = 1 / 240
    const KEY_STEPS = 8
    const MAX_PLAN_S = 6
    const SETTLE_C = 1e-3
    const SETTLE_V = 2e-3
    const nowMs = () => {
        const t = typeof document !== "undefined" ? document.timeline?.currentTime : null
        return t != null ? Number(t) : performance.now()
    }
    const fmt = (v) => `translate3d(${v.toFixed(3)}px, 0px, 0px)`

    const simulate = (p, until, onKey) => {
        const omega = (2 * Math.PI) / p.spring.response
        let px = p.x0
        let c = p.c0
        let v = p.v0
        let tau = 0
        let step = 0
        let settled = false
        onKey?.(0, px)
        while (tau < until && tau < MAX_PLAN_S) {
            const h = Math.min(SIM_H, until - tau)
            const accel = omega * omega * (p.T - c) - 2 * p.spring.damping * omega * v
            v += accel * h
            c += v * h
            if (c < 0) { c = 0; v = 0 }
            if (p.T === 0 && c < 0.002) { c = 0; v = 0 }
            px -= p.base * c * h
            tau += h
            step++
            if (Math.abs(c - p.T) < SETTLE_C && Math.abs(v) < SETTLE_V) {
                c = p.T
                v = 0
                settled = true
                if (onKey) onKey(tau, px)
                break
            }
            if (onKey && step % KEY_STEPS === 0) onKey(tau, px)
        }
        return { x: px, c, v, tau, settled }
    }

    const evalPlan = (pl, tMs) => {
        const tau = Math.max(0, (tMs - pl.t0) / 1000)
        if (tau >= pl.tEnd) {
            const drift = pl.T > 0 ? pl.base * pl.T * (tau - pl.tEnd) : 0
            return { x: pl.xEnd - drift, c: pl.T, v: 0 }
        }
        const r = simulate(pl, tau)
        return { x: r.x, c: r.c, v: r.v }
    }

    const canGlide = () =>
        !plan &&
        visible &&
        started &&
        baseSpeed > 0 &&
        loopW > 0 &&
        typeof track.animate === "function" &&
        !dragging && !wheelActive && !pressed &&
        pending === 0 && flick === 0 &&
        !tiltBusy()

    const buildPlan = (t0) => {
        plan?.anims.forEach((a) => a.cancel())
        wrap()
        const p = { t0, x0: x, c0: cruise, v0: cruiseVel, T: cruiseTarget, spring, base: baseSpeed }
        const keys = []
        const end = simulate(p, Infinity, (tau, px) => keys.push([tau, px]))
        p.tEnd = end.tau
        p.xEnd = end.x
        const anims = []

        const A = track.animate(
            keys.map(([tau, px], i) => ({
                offset: i === keys.length - 1 ? 1 : tau / p.tEnd,
                transform: fmt(px),
            })),
            { duration: p.tEnd * 1000, easing: "linear", fill: "forwards" }
        )
        A.startTime = t0
        anims.push(A)

        if (p.T > 0) {
            let xw = p.xEnd % loopW
            if (xw > 0) xw -= loopW
            const B = track.animate([{ transform: fmt(xw) }, { transform: fmt(xw - loopW) }], {
                duration: (loopW / (p.base * p.T)) * 1000,
                delay: p.tEnd * 1000,
                iterations: Infinity,
                easing: "linear",
                fill: "none",
            })
            B.startTime = t0
            anims.push(B)
        }
        plan = { ...p, anims }
    }

    const takeFromPlan = () => {
        if (!plan) return
        const st = evalPlan(plan, nowMs())
        plan.anims.forEach((a) => a.cancel())
        plan = null
        x = st.x
        cruise = st.c
        cruiseVel = st.v
        wrap()
    }

    const toJS = () => {
        if (!plan) return
        takeFromPlan()
        paintedX = NaN
        paint()
        startLoop()
    }

    // ---- frame loop -------------------------------------------------------------------------
    let rafId = 0
    let lastT = 0
    const loop = (ts) => {
        rafId = requestAnimationFrame(loop)
        tick(ts)
    }
    function startLoop() {
        if (!rafId) rafId = requestAnimationFrame(loop)
    }
    const stopLoop = () => {
        cancelAnimationFrame(rafId)
        rafId = 0
        lastT = 0
    }

    const stepCruise = (dt) => {
        const omega = (2 * Math.PI) / spring.response
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
        const h = dt / steps
        for (let i = 0; i < steps; i++) {
            const accel = omega * omega * (cruiseTarget - cruise) - 2 * spring.damping * omega * cruiseVel
            cruiseVel += accel * h
            cruise += cruiseVel * h
        }
        if (cruise < 0) { cruise = 0; cruiseVel = 0 }
        if (cruiseTarget === 0 && cruise < 0.002) { cruise = 0; cruiseVel = 0 }
    }

    const tick = (ts) => {
        if (plan) {
            stopLoop()
            return
        }
        if (!visible) {
            stopLoop()
            return
        }
        if (!loopW) {
            lastT = 0
            return
        }
        const dt = lastT ? clamp((ts - lastT) / 1000, 0, MAX_FRAME_DT) : 1 / 60
        lastT = ts

        if (wheelActive && performance.now() - lastWheelT > 120 && Math.abs(wheelRemain) < 0.5) {
            wheelActive = false
            wheelRemain = 0
            pending = 0
            release(0, false)
        }

        let userV = 0

        if (dragging || wheelActive) {
            if (wheelRemain) {
                const take =
                    Math.abs(wheelRemain) < 0.5 ? wheelRemain : wheelRemain * (1 - Math.exp(-cfg.wheelSmoothing * dt))
                wheelRemain -= take
                pending += take
            }
            userV = dt > 0 ? pending / dt : 0
            curVel = userV
            x += pending
            travel += pending
            pending = 0
            pushSample()
        } else {
            flick *= Math.exp(-(pressed ? cfg.catchRate : decayRate) * dt)
            if (Math.abs(flick) < 1) flick = 0

            stepCruise(dt)

            const vel = -baseSpeed * cruise + flick
            x += vel * dt
            travel += vel * dt
            userV = flick
            curVel = vel
        }

        wrap()
        paint()

        const wasLeaning = lean !== 0
        stepLean(dt, userV)
        drawTilt(wasLeaning && lean === 0)

        if (canGlide()) {
            buildPlan(ts)
            stopLoop()
        }
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
            wheelRemain = 0
            pending = 0
            catchIt()
            lastPX = this.pointerX
        },
        onDragStart() {
            dragging = true
            suppressClick = true
            viewport.dataset.dragging = "true"
            takeOver()
            samples.length = 0
            pushSample()
        },
        onDrag() {
            const px = this.pointerX
            pending += px - lastPX
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
        hoverTarget = cfg.hoverFactor
        if (!pressed && !dragging && !wheelActive) aimHover()
    }
    const onLeave = (e) => {
        if (e.pointerType !== "mouse") return
        hoverTarget = 1
        if (!pressed && !dragging && !wheelActive) aimHover()
    }

    const onWheel = (e) => {
        if (e.ctrlKey || dragging) return
        const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
        if (!horizontal && !cfg.wheelVertical) return
        let d = horizontal ? e.deltaX : e.deltaY
        if (!d) return
        e.preventDefault()
        toJS()
        if (e.deltaMode === 1) d *= 33
        else if (e.deltaMode === 2) d *= vpW
        const notched =
            e.deltaMode !== 0 || (e.deltaX === 0 && !!e.wheelDeltaY && e.wheelDeltaY % 120 === 0)
        if (!wheelActive) { wheelActive = true; takeOver(); samples.length = 0; pushSample() }
        lastWheelT = performance.now()
        const move = -d * (cfg.wheelGain ?? 1)
        if (notched) wheelRemain = clamp(wheelRemain + move, -vpW * 2, vpW * 2)
        else pending += move
    }

    // ---- keyboard / assistive tech ---------------------------------------------------------
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

    const onMotionPref = () => {
        toJS()
        baseSpeed = motionQuery.matches ? 0 : cfg.baseSpeed
        tiltOn = !!tiltCfg?.enabled && !motionQuery.matches
        if (!tiltOn) {
            lean = 0
            leanVel = 0
            leanTarget = 0
            drawTilt(true)
        }
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
        toJS()
        measure()
    })
    ro.observe(viewport)
    ro.observe(track)

    const io = new IntersectionObserver(([entry]) => {
        const was = visible
        visible = entry.isIntersecting
        if (visible === was) return
        if (!visible) {
            // Offscreen: stop the infinite compositor animation and freeze at the current position
            if (plan) {
                takeFromPlan()
                paintedX = NaN
                paint()
            }
        } else {
            lastT = 0
            startLoop()
        }
    })
    io.observe(viewport)

    track.style.willChange = "transform"
    measure()
    paint()
    startLoop()

    const snapshot = { x: 0, vel: 0, gliding: false, visible: true, vpW: 0, loopW: 0, lefts: [], widths: [] }

    return {
        consumeDrag: () => suppressClick,
        // Read-only snapshot for effects layered on top of the ticker. No DOM reads: the position
        // comes from the engine's own state, or from evaluating the compositor plan at the current time.
        getState() {
            let px = x
            let v = curVel
            let gliding = false
            if (plan) {
                const st = evalPlan(plan, nowMs())
                px = st.x
                v = -plan.base * st.c
                gliding = true
                if (loopW) {
                    px %= loopW
                    if (px > 0) px -= loopW
                }
            }
            snapshot.x = px
            snapshot.vel = v
            snapshot.gliding = gliding
            snapshot.visible = visible
            snapshot.vpW = vpW
            snapshot.loopW = loopW
            snapshot.lefts = lefts
            snapshot.widths = widths
            return snapshot
        },
        start() {
            if (started) return
            started = true
            aimHover()
        },
        setPaused(p) {
            userPaused = !!p
            aimHover()
        },
        destroy() {
            stopLoop()
            plan?.anims.forEach((a) => a.cancel())
            plan = null
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
            if (tiltPrimed) gsap.set(slides, { clearProps: "rotationX,rotationY,transformPerspective" })
        },
    }
}