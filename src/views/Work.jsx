// src/pages/Work.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, memo } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import gsap from "gsap"

import FlipbookCarousel from "../components/FlipbookCarousel"
import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"
import { WORK_PROJECTS } from "../lib/projects"

const IMAGE_BASE = "/"

const CARDS = [
  { name: "Yimaj", match: "yimaj", image: IMAGE_BASE + "yimaj-color-card.jpg", alt: "Yimaj brand colour card, shown as a 3D visual", to: "/work/yimaj", tags: ["Brand Identity", "3D Visuals"] },
  { name: "Zhongshan", match: "zhongshan", image: IMAGE_BASE + "zhongshan-cargo.jpg", alt: "Zhongshan brand identity on cargo packaging, shown as a 3D visual", to: "/work/zhongshan", tags: ["Brand Identity", "3D Visuals"] },
  { name: "Origen", match: "origen", image: IMAGE_BASE + "origen-totebag.jpg", alt: "Origen brand identity printed on a tote bag", to: "/work/origen", tags: ["Brand Identity"] },
  { name: "Weyra", match: "weyra", image: IMAGE_BASE + "weyra-badge.jpg", alt: "Weyra brand identity on a badge", to: "/work/weyra", tags: ["Brand Identity"] },
]

const FLIP_PROJECTS = CARDS.map((c) => ({ id: c.match, name: c.name, image: c.image }))
const LOOPED_CARDS = [...CARDS, ...CARDS, ...CARDS]
const N = CARDS.length

const PHONE_FOOTER_H = 64
const SERVICES = ["Brand Identity", "Digital Design", "Communication", "3D Visual"]

const SERVICE_TAGS = {
  "Brand Identity": { tag: "Brand Identity", only: true },
  "3D Visual": { tag: "3D Visuals" },
}

const AVAILABILITY_TEXT = "Available for opportunities" 
const TIME_ZONE = "Africa/Addis_Ababa"
const TIME_ABBR = "EAT"
const TIME_PLACE = "Addis Ababa"

const IMAGE_W = 800 
const IMAGE_H = 1000
const IMAGE_SIZES = "(min-width: 768px) 46vw, 100vw"
const USE_RESPONSIVE_IMAGES = false
const IMAGE_WIDTHS = [640, 960, 1280, 1600, 1920]
const srcSetFor = (src, ext) =>
  IMAGE_WIDTHS.map((w) => `${src.replace(/\.[^.]+$/, "")}-${w}.${ext} ${w}w`).join(", ")
const IMAGE_WAIT_MAX = 1500 

const DECELERATION_RATE = 0.994 
const SNAP_RESPONSE = 0.38 
const REDUCED_SNAP_RESPONSE = 0.25 
const CATCH_SMOOTH = 0.04 
const SLACK_RATE = 18 
const VELOCITY_WINDOW = 60 
const FLICK_MIN = 250 
const GLIDE_SMOOTH = 0.3 
const REDUCED_GLIDE_SMOOTH = 0.14
const MAX_THROW = 5 
const FLICK_GAIN = 0.7 
const FLICK_FAST = 3000 
const MAX_FLICK_SMOOTH = 0.7 
const STACK_SCALE = 0.15 
const SHADE_MAX = 0.4 
const WHEEL_SNAP_DELAY = 90 
const INTRO_DELAY = 250 
const INTRO_DURATION = 1100 
const INTRO_STAGGER = 130 
const INTRO_EASE = "cubic-bezier(0.16, 1, 0.3, 1)" 
const USE_INTRO_SLIDE = true
const SNAP = true 
const DRAG_THRESHOLD = 5 
const USE_AUTO_SCROLL = false
const AUTO_SPEED = 0.1 
const AUTO_SMOOTH = 0.6 
const HOVER_RESUME_DELAY = 800 
const AUTO_RESUME_DELAY = 3000 

const TITLE_GAP = 80 
const LABELS_H = 48 
const TITLE_RATIO = 0.293 
const CARD_ASPECT = 1.25 
const FIT = CARD_ASPECT + 0.8 * TITLE_RATIO 
const MIN_CARD_W = 200
const LEFT_COL_RATIO = 30 / 31.4
const CARDS_LEFT_RATIO = 34.2 / 31.4

const buildLayoutVars = (portrait) => ({
  "--work-top": "clamp(96px, 9.2vw, 140px)",
  "--card-w": `min(${portrait ? "max(260px, 46vw)" : "max(260px, 31.4vw)"}, max(${MIN_CARD_W}px, calc((100dvh - var(--work-top) - ${LABELS_H + TITLE_GAP}px - var(--page-pad)) / ${FIT})))`,
  "--card-h": `calc(var(--card-w) * ${CARD_ASPECT})`,
  "--left-col-w": portrait ? "max(220px, 30vw)" : `max(220px, calc(var(--card-w) * ${LEFT_COL_RATIO}))`,
  "--cards-left": portrait ? "max(240px, 34.2vw)" : `max(240px, calc(var(--card-w) * ${CARDS_LEFT_RATIO}))`,
  "--type-label-size": "14px",
  "--type-caption-size": "14px",
  "--title-top": `calc(var(--work-top) + var(--card-h) + ${LABELS_H + TITLE_GAP}px)`,
  "--title-h": `calc(var(--card-w) * ${TITLE_RATIO} * 0.8)`,
  "--min-page-h": `calc(var(--work-top) + ${MIN_CARD_W * FIT}px + ${LABELS_H + TITLE_GAP}px + var(--page-pad))`,
})

const TITLE_STYLE = {
  top: `var(--title-top)`,
  fontSize: `calc(var(--card-w) * ${TITLE_RATIO})`,
  lineHeight: 0.8,
}

const LEFT_TEXT_VARS = { "--type-caption-size": "20px" }
const CARD_RADIUS = "clamp(12px, calc(var(--card-w) * 0.03), 24px)"

const NOOP = () => {} 
const CAROUSEL_QUERY = "(min-width: 768px)" 
const PHONE_QUERY = "(max-width: 767px)" 

function useMediaQuery(query) {
  const subscribe = useCallback(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

const smoothDamp = (current, goal, vel, smoothTime, dt) => {
  const omega = 2 / smoothTime
  const k = omega * dt
  const decay = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k)
  const change = current - goal
  const temp = (vel + omega * change) * dt
  return [goal + (change + temp) * decay, (vel - omega * temp) * decay]
}

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const SERVICE_SHIFT = 8 
const SERVICE_ACTIVE_COLOR = "#000000"

function ServiceItem({ label, active, onSelect }) {
  const liRef = useRef(null)
  const btnRef = useRef(null)
  const baseColor = useRef("")
  const hovering = useRef(false)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const li = liRef.current
    const btn = btnRef.current
    if (!li || !btn) return

    baseColor.current = getComputedStyle(btn).color
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const enter = () => {
      hovering.current = true
      gsap.to(btn, {
        x: SERVICE_SHIFT,
        color: SERVICE_ACTIVE_COLOR,
        duration: reduce ? 0 : 0.5,
        ease: "power3.out",
        overwrite: true,
      })
    }
    const leave = () => {
      hovering.current = false
      gsap.to(btn, {
        x: 0,
        color: activeRef.current ? SERVICE_ACTIVE_COLOR : baseColor.current,
        duration: reduce ? 0 : 0.6,
        ease: "power3.out",
        overwrite: true,
      })
    }

    li.addEventListener("pointerenter", enter)
    li.addEventListener("pointerleave", leave)
    return () => {
      li.removeEventListener("pointerenter", enter)
      li.removeEventListener("pointerleave", leave)
      gsap.killTweensOf(btn)
    }
  }, [])

  useEffect(() => {
    const btn = btnRef.current
    if (!btn || hovering.current) return
    gsap.to(btn, {
      color: active ? SERVICE_ACTIVE_COLOR : baseColor.current || "",
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto",
    })
  }, [active])

  return (
    <li ref={liRef} className="cursor-default">
      <button
        ref={btnRef}
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="relative block cursor-pointer text-left will-change-transform [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:inset-x-0 [@media(pointer:coarse)]:before:-inset-y-2.5"
      >
        {label}
      </button>
    </li>
  )
}

function Availability() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_6px_1px_rgba(34,197,94,0.6)]"
          aria-hidden="true"
        />
        <span className="Caption !text-[14px] !font-medium leading-[1.2] text-black">{AVAILABILITY_TEXT}</span>
      </div>
      <span className="Caption !text-[14px] !font-medium leading-[1.2] tabular-nums text-gray-400">
        {TIME_FORMAT.format(now)} {TIME_ABBR} · {TIME_PLACE}
      </span>
    </div>
  )
}

// MEMOIZED CARD COMPONENT to prevent heavy re-renders during interactions
const MemoizedCarouselCard = memo(React.forwardRef(({ card, index, canonical, eager, high, pageReady, triggerTransition, navigate, draggedRef }, ref) => {
  const project = WORK_PROJECTS.find((p) => p.slug === card.match || p.id === card.match)
  const imgSrc = card.image || project?.image

  const img = (
    <img
      src={imgSrc}
      alt={canonical ? card.alt || card.name : ""}
      width={IMAGE_W}
      height={IMAGE_H}
      sizes={IMAGE_SIZES}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={high ? "high" : "auto"}
      className="h-full w-full object-cover"
      draggable={false}
    />
  )

  return (
    <Link
      to={card.to}
      onClick={(e) => {
        if (draggedRef.current) return 
        e.preventDefault()
        if (triggerTransition) triggerTransition(card.to)
        else navigate(card.to)
      }}
      ref={ref}
      aria-hidden={canonical ? undefined : true}
      tabIndex={canonical ? undefined : -1}
      className={`block shrink-0 md:[contain:layout] md:w-[var(--card-w)] ${canonical ? "md:will-change-transform" : ""}`}
      style={{ transformOrigin: "left center" }}
      draggable={false}
    >
      <div className="card-inner" style={!pageReady ? { opacity: 0 } : {}}>
        <div
          className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--bg-surface-light)]"
          style={{ borderRadius: CARD_RADIUS, isolation: "isolate", transform: "translateZ(0)" }}
        >
          {imgSrc &&
            (USE_RESPONSIVE_IMAGES ? (
              <picture>
                <source type="image/avif" srcSet={srcSetFor(imgSrc, "avif")} sizes={IMAGE_SIZES} />
                <source type="image/webp" srcSet={srcSetFor(imgSrc, "webp")} sizes={IMAGE_SIZES} />
                {img}
              </picture>
            ) : (
              img
            ))}
          <div className="card-shade pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-black opacity-0" />
        </div>
        <div className="card-meta mt-3 flex items-start justify-between gap-4 text-black">
          <h3 className="Caption !text-[14px] uppercase !font-medium leading-[1.2]">{card.name}</h3>
          <ul className="Caption !text-[14px] uppercase !font-medium leading-[1.2] text-right [&>li+li]:mt-[2px]">
            {card.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </Link>
  )
}))

export default function Work() {
  const outletCtx = useOutletContext()
  const navigate = useNavigate()

  const isCarousel = useMediaQuery(CAROUSEL_QUERY)
  const isPhone = useMediaQuery(PHONE_QUERY)
  const isPortraitTablet = useMediaQuery("(min-width: 768px) and (orientation: portrait)")
  const layoutVars = useMemo(() => buildLayoutVars(isPortraitTablet), [isPortraitTablet])

  const pageReady = usePageReady()
  const transitionCtx = usePageTransition()
  const triggerTransition = transitionCtx?.triggerTransition

  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const draggedRef = useRef(false)
  const cardRefs = useRef([])
  const slideRef = useRef(null)
  const flipRef = useRef(null)
  const lastServiceRef = useRef({ tag: null, idx: -1 })
  const [activeService, setActiveService] = useState(null)
  const ctxRef = useRef(outletCtx)
  
  useEffect(() => {
    ctxRef.current = outletCtx
  })

  useEffect(() => {
    const ctx = ctxRef.current
    const setHeaderLight = ctx?.setHeaderLight || NOOP
    setHeaderLight(false)
    window.scrollTo(0, 0)
    if (ctx?.heroFade) ctx.heroFade.set(1)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!isCarousel || !viewport || !track) return
    if (!pageReady) return 

    const cards = cardRefs.current.slice(0, LOOPED_CARDS.length)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const glideSmooth = reduceMotion ? REDUCED_GLIDE_SMOOTH : GLIDE_SMOOTH
    const snapSmooth = (reduceMotion ? REDUCED_SNAP_RESPONSE : SNAP_RESPONSE) / Math.PI
    const stackScale = reduceMotion ? 0 : STACK_SCALE
    const dpr = window.devicePixelRatio || 1

    let x = 0 
    let v = 0 
    let target = 0 
    let raf = 0
    let lastFrame = 0
    let dragging = false
    let activePointer = null
    let startX = 0
    let startTarget = 0
    let step = 0 
    let cancelled = false
    let wheelTimer = 0
    const settleWaiters = []

    let settleSmooth = glideSmooth 
    let wheelActive = false 
    let autoDrift = false 
    let slack = 0 
    let travel = 0 
    const samples = [] 

    const parts = cards.map((card) =>
      card
        ? {
            card,
            inner: card.querySelector(".card-inner"),
            meta: card.querySelector(".card-meta"),
            shade: card.querySelector(".card-shade"),
            last: -1, 
          }
        : null
    )

    const measure = () => {
      const last = cards[cards.length - 1]
      if (!last) {
        step = 0
        return
      }
      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 16
      step = last.getBoundingClientRect().width + gap
    }

    const resetStyles = () => {
      track.style.transform = ""
      viewport.removeAttribute("data-dragging")
      parts.forEach((p) => {
        if (!p) return
        p.card.style.transform = ""
        p.card.style.visibility = ""
        p.card.style.opacity = ""
        p.card.style.transition = ""
        if (p.inner) p.inner.style.opacity = ""
        if (p.shade) p.shade.style.opacity = ""
        if (p.meta) p.meta.style.opacity = ""
        p.last = -1
      })
    }

    const paint = (snapPx = false) => {
      if (!step) return
      const setWidth = step * N

      if (x <= -setWidth * 1.5) {
        x += setWidth
        target += setWidth
        startTarget += setWidth
      } else if (x >= -setWidth * 0.5) {
        x -= setWidth
        target -= setWidth
        startTarget -= setWidth
      }

      const tx = snapPx ? Math.round(x * dpr) / dpr : x
      track.style.transform = `translate3d(${tx}px, 0, 0)`

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        if (!p) continue
        const left = i * step + x 

        if (left > -0.5) {
          if (p.last !== 0) {
            p.card.style.transform = ""
            p.card.style.visibility = ""
            if (p.shade) p.shade.style.opacity = "0"
            if (p.meta) p.meta.style.opacity = ""
            p.last = 0
          }
          continue
        }

        const progress = Math.min(1, -left / step)

        if (left <= -2 * step) {
          if (p.last !== 2) {
            p.card.style.visibility = "hidden"
            p.last = 2
          }
          continue
        }

        p.card.style.visibility = ""
        p.card.style.transform = `translate3d(${-left}px, 0, 0) scale(${1 - stackScale * progress})`
        if (p.shade) p.shade.style.opacity = String(SHADE_MAX * progress)
        if (p.meta) p.meta.style.opacity = String(Math.max(0, 1 - progress * 2))
        p.last = 1
      }
    }

    const loop = (t) => {
      const dt = Math.max(0, Math.min(0.05, (t - lastFrame) / 1000 || 1 / 60))
      lastFrame = t
      const prevX = x
      const tracking = (dragging && draggedRef.current) || wheelActive

      if (tracking) {
        slack *= Math.exp(-dt * SLACK_RATE)
        if (Math.abs(slack) < 0.05) slack = 0
        x = target + slack
        v = 0
      } else {
        if (autoDrift) target -= step * AUTO_SPEED * dt
        const smoothTime = dragging ? CATCH_SMOOTH : settleSmooth
        ;[x, v] = smoothDamp(x, target, v, smoothTime, dt)
      }
      travel += x - prevX
      paint()

      if (tracking) {
        if (wheelActive) pushSample()
        if (slack === 0) { raf = 0; return } 
      } else if (Math.abs(target - x) < 0.05 && Math.abs(v) < 0.5) {
        x = target
        v = 0
        paint(true) 
        raf = 0
        settleWaiters.splice(0).forEach((resolve) => resolve())
        return
      }
      raf = requestAnimationFrame(loop)
    }

    const kick = () => {
      if (raf) return
      lastFrame = performance.now()
      raf = requestAnimationFrame(loop)
    }

    const whenSettled = () =>
      new Promise((resolve) => {
        if (!raf && Math.abs(target - x) < 0.05) resolve()
        else settleWaiters.push(resolve)
      })

    let autoEnabled = false 
    let hovering = false
    let inView = true
    let resumeTimer = 0

    const canDrift = () =>
      autoEnabled &&
      !cancelled &&
      !reduceMotion &&
      step > 0 &&
      !dragging &&
      !wheelActive &&
      !hovering &&
      inView &&
      !document.hidden &&
      !viewport.querySelector(":focus-visible") 

    const startDrift = () => {
      if (autoDrift) return
      autoDrift = true
      settleSmooth = AUTO_SMOOTH
      kick() 
    }

    const stopDrift = (snap) => {
      if (!autoDrift) return
      autoDrift = false
      if (snap && step) {
        target = Math.round(x / step) * step
        settleSmooth = snapSmooth
        kick()
      }
    }

    const tryResume = () => {
      if (canDrift()) startDrift()
      else resumeTimer = setTimeout(tryResume, 500)
    }
    const scheduleResume = (delay) => {
      clearTimeout(resumeTimer)
      if (!autoEnabled || cancelled || reduceMotion) return
      resumeTimer = setTimeout(tryResume, delay)
    }

    const onEnter = (e) => {
      if (e.pointerType !== "mouse") return
      hovering = true
      clearTimeout(resumeTimer)
      stopDrift(true)
    }
    const onLeave = (e) => {
      if (e.pointerType !== "mouse") return
      hovering = false
      scheduleResume(HOVER_RESUME_DELAY)
    }
    viewport.addEventListener("pointerenter", onEnter)
    viewport.addEventListener("pointerleave", onLeave)

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        if (!inView) stopDrift(false)
        else scheduleResume(500)
      },
      { threshold: 0.5 }
    )
    io.observe(viewport)

    const timers = []
    const anims = []
    let touched = false 
    const behind = cards.slice(0, N)
    const hideBehind = () => behind.forEach((c) => c && (c.style.opacity = "0"))
    const showBehind = () =>
      behind.forEach((c) => {
        if (!c) return
        c.style.transition = "opacity 300ms ease"
        c.style.opacity = ""
      })
    const interrupt = () => {
      stopDrift(false)
      scheduleResume(AUTO_RESUME_DELAY)
      if (touched) return
      touched = true
      showBehind()
    }
    const wait = (ms) => new Promise((resolve) => timers.push(setTimeout(resolve, ms)))

    const pushSample = (p = travel, t = performance.now()) => {
      samples.push({ p, t })
      while (samples.length > 2 && t - samples[0].t > VELOCITY_WINDOW * 2) samples.shift()
    }
    
    const sampledVelocity = (endP = travel) => {
      pushSample(endP) 
      const now = performance.now()
      const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW)
      if (recent.length < 2) return 0
      const a = recent[0]
      const b = recent[recent.length - 1]
      const dt = (b.t - a.t) / 1000
      return dt < 0.016 ? 0 : (b.p - a.p) / dt
    }
    
    const releaseWith = (vel) => {
      const speed = clamp((Math.abs(vel) - FLICK_MIN) / (FLICK_FAST - FLICK_MIN), 0, 1)
      const throwDist = clamp(
        ((vel * DECELERATION_RATE) / (1 - DECELERATION_RATE) / 1000) * (1 + FLICK_GAIN * speed),
        -MAX_THROW * step,
        MAX_THROW * step
      )
      let goal = SNAP && step ? Math.round((x + throwDist) / step) * step : x + throwDist

      if (SNAP && step && Math.abs(vel) > FLICK_MIN) {
        const pos = x / step
        goal =
          vel > 0
            ? Math.max(goal, Math.ceil(pos - 0.02) * step)
            : Math.min(goal, Math.floor(pos + 0.02) * step)
      }
      target = goal

      const dist = Math.abs(goal - x)
      let smooth = snapSmooth
      v = vel
      if (dist > 1 && Math.sign(goal - x) === Math.sign(vel) && Math.abs(vel) > 1) {
        const softest = snapSmooth + (MAX_FLICK_SMOOTH - snapSmooth) * speed
        smooth = clamp((2 * dist) / Math.abs(vel), 0.06, Math.max(snapSmooth, softest))
        const maxV = (2 / smooth) * dist
        v = Math.sign(vel) * Math.min(Math.abs(vel), maxV)
      }
      slack = 0
      settleSmooth = smooth
      kick()
    }

    const onPointerMove = (e) => {
      if (!dragging || e.pointerId !== activePointer) return

      if (!draggedRef.current) {
        if (Math.abs(e.clientX - startX) <= DRAG_THRESHOLD) return
        draggedRef.current = true
        try {
          viewport.setPointerCapture(e.pointerId)
        } catch { }
        startX = e.clientX
        startTarget = x
        target = x
        slack = 0
        samples.length = 0
      }

      const evs = e.getCoalescedEvents?.() ?? [e]
      for (const ce of evs) pushSample(ce.clientX, ce.timeStamp)

      target = startTarget + (e.clientX - startX) 
      kick()
    }

    const endDrag = () => {
      viewport.removeEventListener("pointermove", onPointerMove)
      viewport.removeEventListener("pointerup", onPointerUp)
      viewport.removeEventListener("pointercancel", onPointerUp)
    }

    function onPointerUp(e) {
      if (!dragging || e.pointerId !== activePointer) return
      const wasDrag = draggedRef.current
      const vel = wasDrag ? sampledVelocity(e.clientX) : 0 
      dragging = false
      scheduleResume(AUTO_RESUME_DELAY)
      endDrag()
      viewport.removeAttribute("data-dragging")
      try {
        viewport.releasePointerCapture(e.pointerId)
      } catch { }

      if (wasDrag) {
        releaseWith(vel)
      } else if (SNAP && step) {
        target = Math.round(x / step) * step
        settleSmooth = snapSmooth
        kick()
      }

      setTimeout(() => {
        draggedRef.current = false
      }, 0)
    }

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      interrupt()
      dragging = true
      draggedRef.current = false
      wheelActive = false
      clearTimeout(wheelTimer)
      activePointer = e.pointerId
      startX = e.clientX
      target = x 
      startTarget = target
      slack = 0
      viewport.setAttribute("data-dragging", "true")
      viewport.addEventListener("pointermove", onPointerMove)
      viewport.addEventListener("pointerup", onPointerUp)
      viewport.addEventListener("pointercancel", onPointerUp)
      kick()
    }

    const onClickCapture = (e) => {
      if (!draggedRef.current) return
      e.preventDefault()
      e.stopPropagation()
    }

    const onWheel = (e) => {
      if (dragging) return
      const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX
      if (Math.abs(dx) <= Math.abs(e.deltaY)) return 
      e.preventDefault() 
      interrupt()
      if (!wheelActive) {
        wheelActive = true
        target = x
        slack = 0
        v = 0
        samples.length = 0
        pushSample()
      }
      target -= dx
      kick()
      clearTimeout(wheelTimer)
      wheelTimer = setTimeout(() => {
        const vel = sampledVelocity()
        wheelActive = false
        releaseWith(vel)
      }, WHEEL_SNAP_DELAY)
    }

    const onKeyDown = (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
      if (!step || dragging) return
      e.preventDefault()
      interrupt()
      const dir = e.key === "ArrowRight" ? -1 : 1
      target = Math.round(target / step) * step + dir * step
      settleSmooth = glideSmooth
      kick()
    }

    const onFocusIn = (e) => {
      viewport.scrollLeft = 0
      if (!step || !e.target.matches?.(":focus-visible")) return 
      const idx = cards.indexOf(e.target.closest("a"))
      if (idx < 0) return
      interrupt()
      target = -idx * step
      settleSmooth = glideSmooth
      kick()
    }

    slideRef.current = (k) => {
      if (!step) return
      interrupt()
      const setWidth = step * N
      const base = -(N + k) * step 
      target = base + Math.round((target - base) / setWidth) * setWidth
      settleSmooth = glideSmooth
      kick()
    }

    measure()
    paint()
    const ro = new ResizeObserver(() => {
      const prev = step
      measure()
      if (prev && step && prev !== step) {
        const k = step / prev
        x *= k
        target *= k
        startTarget *= k
        slack *= k
        v *= k
      }
      parts.forEach((p) => p && (p.last = -1))
      paint()
    })
    ro.observe(track)
    ro.observe(cards[cards.length - 1])

    viewport.addEventListener("pointerdown", onPointerDown)
    viewport.addEventListener("click", onClickCapture, true)
    viewport.addEventListener("wheel", onWheel, { passive: false })
    viewport.addEventListener("keydown", onKeyDown)
    viewport.addEventListener("focusin", onFocusIn)

    const decodeImages = (imgs) =>
      Promise.race([
        Promise.all(imgs.map((img) => (img?.decode ? img.decode().catch(() => {}) : Promise.resolve()))),
        wait(IMAGE_WAIT_MAX),
      ])

    const runIntro = async () => {
      const visible = cards.slice(N, N * 2)
      hideBehind()
      visible.forEach((c) => {
        const inner = c?.querySelector(".card-inner")
        if (inner) inner.style.opacity = "0"
      })

      await decodeImages(visible.map((c) => c?.querySelector("img")))
      if (cancelled) return

      const dist = step 
      const landed = visible.map((card, i) => {
        const inner = card?.querySelector(".card-inner")
        if (!inner) return Promise.resolve()
        if (!inner.animate) {
          inner.style.opacity = ""
          return Promise.resolve()
        }
        const anim = inner.animate(
          [
            { transform: `translate3d(${dist}px, 0, 0)`, opacity: 0 },
            { transform: "translate3d(0, 0, 0)", opacity: 1 },
          ],
          {
            duration: INTRO_DURATION,
            delay: INTRO_DELAY + i * INTRO_STAGGER,
            easing: INTRO_EASE,
            fill: "both", 
          }
        )
        anims.push(anim)
        return anim.finished
          .then(() => {
            inner.style.opacity = ""
            anim.cancel()
          })
          .catch(() => {}) 
      })

      await Promise.all(landed)
      if (cancelled) return
      if (touched || dragging) return showBehind()

      if (USE_INTRO_SLIDE && step) {
        target = Math.round(target / step) * step - step
        settleSmooth = glideSmooth
        kick()
        await whenSettled()
      }
      if (!cancelled) showBehind()
    }

    if (!reduceMotion) {
      runIntro().finally(() => {
        autoEnabled = USE_AUTO_SCROLL
        if (USE_AUTO_SCROLL) scheduleResume(HOVER_RESUME_DELAY)
      })
    }

    return () => {
      cancelled = true
      autoDrift = false
      clearTimeout(resumeTimer)
      io.disconnect()
      viewport.removeEventListener("pointerenter", onEnter)
      viewport.removeEventListener("pointerleave", onLeave)
      timers.forEach(clearTimeout)
      clearTimeout(wheelTimer)
      cancelAnimationFrame(raf)
      anims.forEach((a) => a.cancel())
      ro.disconnect()
      endDrag()
      viewport.removeEventListener("pointerdown", onPointerDown)
      viewport.removeEventListener("click", onClickCapture, true)
      viewport.removeEventListener("wheel", onWheel)
      viewport.removeEventListener("keydown", onKeyDown)
      viewport.removeEventListener("focusin", onFocusIn)
      slideRef.current = null
      resetStyles()
    }
  }, [isCarousel, pageReady])

  const handleServiceClick = (service) => {
    setActiveService(service)
    const rule = SERVICE_TAGS[service]
    if (!rule) return
    const matches = CARDS.map((c, i) =>
      c.tags.includes(rule.tag) && (!rule.only || c.tags.length === 1) ? i : -1
    ).filter((i) => i >= 0)
    if (!matches.length) return
    const last = lastServiceRef.current
    const k = last.tag === service ? matches[(matches.indexOf(last.idx) + 1) % matches.length] : matches[0]
    lastServiceRef.current = { tag: service, idx: k }
    if (slideRef.current) slideRef.current(k)
    else if (flipRef.current) flipRef.current.goTo(k)
  }

  const handleFlipSelect = (name) => {
    const card = CARDS.find((c) => c.name === name)
    if (card) {
      if (triggerTransition) triggerTransition(card.to)
      else navigate(card.to)
    }
  }

  const renderedCards = isCarousel ? LOOPED_CARDS : CARDS

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col bg-white pt-28 md:block md:h-[100dvh] md:min-h-[var(--min-page-h)] md:overflow-x-clip md:pt-0"
      style={layoutVars}
    >
      <div
        className="flex flex-col gap-6 px-[var(--page-pad)] pb-0 pt-4 md:absolute md:left-0 md:top-[var(--work-top)] md:h-[var(--card-h)] md:w-[var(--left-col-w)] md:justify-between md:gap-0 md:pb-0 md:pt-0"
        style={LEFT_TEXT_VARS}
      >
        <h2 className="H4 uppercase md:text-[40px]" style={{ lineHeight: 0.95 }}>
          HOW I<br />
          CAN HELP
        </h2>
        <ul className="Body !font-normal !leading-[1.2] !text-gray-400 md:text-[20px]">
          {SERVICES.map((s) => (
            <ServiceItem
              key={s}
              label={s}
              active={activeService === s}
              onSelect={() => handleServiceClick(s)}
            />
          ))}
        </ul>
      </div>

      {isPhone && (
        <div className="pt-6">
          <FlipbookCarousel ref={flipRef} projects={FLIP_PROJECTS} onSelect={handleFlipSelect} bottomReserve={PHONE_FOOTER_H} />
        </div>
      )}

      {!isPhone && (
      <div
        ref={viewportRef}
        role="region"
        aria-roledescription={isCarousel ? "carousel" : undefined}
        aria-label="Selected work"
        className="px-[var(--page-pad)] pt-12 md:ml-[var(--cards-left)] md:cursor-grab md:touch-pan-y md:select-none md:overflow-hidden md:px-0 md:pt-[var(--work-top)] md:data-[dragging=true]:cursor-grabbing"
      >
        <div
          ref={trackRef}
          className="flex flex-col gap-[var(--cs-gap)] md:will-change-transform md:flex-row md:pr-[var(--page-pad)]"
        >
          {renderedCards.map((card, index) => {
            const canonical = !isCarousel || (index >= N && index < N * 2)
            const eager = isCarousel ? canonical : index === 0
            const high = isCarousel ? canonical && index < N + 2 : index === 0

            return (
              <MemoizedCarouselCard
                key={`${card.name}-${index}`}
                card={card}
                index={index}
                canonical={canonical}
                eager={eager}
                high={high}
                pageReady={pageReady}
                triggerTransition={triggerTransition}
                navigate={navigate}
                draggedRef={draggedRef}
                ref={(el) => { cardRefs.current[index] = el }}
              />
            )
          })}
        </div>
      </div>
      )}

      <div
        className="mt-auto flex flex-col gap-4 px-[var(--page-pad)] pb-[max(var(--page-pad),env(safe-area-inset-bottom))] pt-0 md:mt-0 md:absolute md:left-0 md:top-[var(--title-top)] md:h-[var(--title-h)] md:w-[var(--left-col-w)] md:justify-end md:pb-0 md:pt-0"
      >
        <Availability />
      </div>

      <h1
        className="H1 pointer-events-none absolute sr-only select-none md:not-sr-only md:!absolute md:left-[var(--cards-left)]"
        style={TITLE_STYLE}
      >
        WORK
      </h1>
    </div>
  )
}