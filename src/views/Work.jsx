// src/pages/Work.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import gsap from "gsap"

import FlipbookCarousel from "../components/FlipbookCarousel"
import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"
import { WORK_PROJECTS } from "../lib/projects"

// Card images sit directly in the project's /public folder, which is served from "/".
// If you move them into a subfolder (e.g. public/work/), change this to "/work/".
const IMAGE_BASE = "/"

// Order updated to match the design (Yimaj first). `match` finds the project in WORK_PROJECTS (for its image).
// `alt` is the accessible description of the image: tweak the wording to match the artwork.
const CARDS = [
  { name: "Yimaj", match: "yimaj", image: IMAGE_BASE + "yimaj-color-card.jpg", alt: "Yimaj brand colour card, shown as a 3D visual", to: "/work/yimaj", tags: ["Brand Identity", "3D Visuals"] },
  { name: "Zhongshan", match: "zhongshan", image: IMAGE_BASE + "zhongshan-cargo.jpg", alt: "Zhongshan brand identity on cargo packaging, shown as a 3D visual", to: "/work/zhongshan", tags: ["Brand Identity", "3D Visuals"] },
  { name: "Origen", match: "origen", image: IMAGE_BASE + "origen-totebag.jpg", alt: "Origen brand identity printed on a tote bag", to: "/work/origen", tags: ["Brand Identity"] },
  { name: "Weyra", match: "weyra", image: IMAGE_BASE + "weyra-badge.jpg", alt: "Weyra brand identity on a badge", to: "/work/weyra", tags: ["Brand Identity"] },
]

// Same cards in the shape the mobile flipbook expects (same order, so card indexes match CARDS)
const FLIP_PROJECTS = CARDS.map((c) => ({ id: c.match, name: c.name, image: c.image }))

// Triple the cards for the infinite scrolling treadmill effect (carousel only)
const LOOPED_CARDS = [...CARDS, ...CARDS, ...CARDS]
const N = CARDS.length

// Phone only: height the availability footnote needs below the flipbook (2 text lines + bottom padding).
// The flipbook shrinks just enough that this always fits on screen.
const PHONE_FOOTER_H = 64

const SERVICES = ["Brand Identity", "Digital Design", "Communication", "3D Visual"]

// Clicking a service slides the carousel to the first matching card (clicking it again steps to the
// next match). Services without an entry here stay plain text until cards use their tag.
//   tag:  the card tag to look for
//   only: true = match only cards whose tags are JUST this one (no other tags)
// Add e.g. "Digital Design": { tag: "Digital Design" } once a card has that tag.
const SERVICE_TAGS = {
  "Brand Identity": { tag: "Brand Identity", only: true }, // Origen, Weyra
  "3D Visual": { tag: "3D Visuals" }, // Yimaj, Zhongshan
}

// Availability badge (bottom left). Change these to update the status text and the clock.
const AVAILABILITY_TEXT = "Available for opportunities" // keep this in sync with your real availability
const TIME_ZONE = "Africa/Addis_Ababa"
const TIME_ABBR = "EAT"
const TIME_PLACE = "Addis Ababa"

/* ---------- images ---------- */
const IMAGE_W = 800 // intrinsic ratio hint (4:5) so the browser reserves space before load
const IMAGE_H = 1000
// Upper bound of the card width (portrait tablets use up to 46vw). Cards can be smaller when the window is
// short, which only means the browser may fetch a slightly larger file than needed, never a blurry one.
const IMAGE_SIZES = "(min-width: 768px) 46vw, 100vw"
// Flip to true once you have exported responsive copies next to each original, named
//   <name>-640.webp  <name>-960.webp  <name>-1280.webp  <name>-1600.webp  <name>-1920.webp   (and the same with .avif)
// e.g. zhongshan-cargo-640.avif. The original JPG stays as the fallback <img>.
// Leave false until the files exist: a <source> that 404s does NOT fall back to the <img>.
const USE_RESPONSIVE_IMAGES = false
// 1600 and 1920 cover 2x displays on big monitors (a card can reach ~800 CSS px wide there).
const IMAGE_WIDTHS = [640, 960, 1280, 1600, 1920]
const srcSetFor = (src, ext) =>
  IMAGE_WIDTHS.map((w) => `${src.replace(/\.[^.]+$/, "")}-${w}.${ext} ${w}w`).join(", ")
const IMAGE_WAIT_MAX = 1500 // ms: never hold the intro longer than this waiting for images to decode

// Motion feel: Apple-style. Dragging is 1:1 (the row is glued to your finger, no lag). Letting go keeps
// your exact finger velocity, projects where a flick would coast to (UIScrollView's deceleration maths),
// snaps to the nearest card, and gets there on a critically damped spring that starts at that velocity.
const DECELERATION_RATE = 0.996 // between UIScrollView "normal" (0.998) and "fast" (0.99): flicks project a little shorter, so they settle sooner
const SNAP_RESPONSE = 0.38 // s: SwiftUI-style spring response for settling on a card after a release (smaller = snappier)
const REDUCED_SNAP_RESPONSE = 0.25 // prefers-reduced-motion
const CATCH_SMOOTH = 0.04 // s: how fast a gliding row is caught when you touch it
const SLACK_RATE = 18 // 1/s: the first few px of a drag (the click threshold) ease in at this rate instead of jumping
const VELOCITY_WINDOW = 60 // ms of finger history used to measure release velocity
const GLIDE_SMOOTH = 0.3 // programmatic moves (arrow keys, service click, intro slide): long soft glide, in seconds
const REDUCED_GLIDE_SMOOTH = 0.14
const MAX_THROW = 2 // max cards a single flick can travel
const STACK_SCALE = 0.15 // how much a card shrinks while it stacks (0 for reduced motion)
const SHADE_MAX = 0.4 // max strength of the stacking gradient (0 = none, 1 = solid black at the dark edge)
const WHEEL_SNAP_DELAY = 90 // ms after the last wheel/trackpad event before settling on a card
// Intro animation (carousel). Times in ms.
const INTRO_DELAY = 250 // wait before the first card starts (raise this if a page-transition overlay is still covering the page)
const INTRO_DURATION = 1100 // how long each card takes to glide in
const INTRO_STAGGER = 130 // gap between one card starting and the next
const INTRO_EASE = "cubic-bezier(0.16, 1, 0.3, 1)" // strong ease-out: fast start, long soft landing
// One-card hint: right after the cards land, the row glides exactly one card to the left, once, and stays there.
// Speed is governed by GLIDE_SMOOTH above (raise it for a slower, softer slide).
const USE_INTRO_SLIDE = true
const SNAP = true // settle exactly on a card after release (set false for free-floating)
const DRAG_THRESHOLD = 5 // px of movement before a press counts as a drag, not a click
// Auto-scroll (carousel): a slow constant-speed drift to the left that stops while the mouse is over the row.
// It rides the same critically damped spring as everything else, so it eases in from rest and eases out to a stop.
// Off by default: the row only moves when the visitor moves it (plus the one-card intro slide above).
const USE_AUTO_SCROLL = false
const AUTO_SPEED = 0.1 // cards per second (0.1 is about 45px/s at the design size)
const AUTO_SMOOTH = 0.6 // s: spring softness while drifting (bigger = longer, gentler ease-in)
const HOVER_RESUME_DELAY = 800 // ms the row rests after the mouse leaves before it eases back into motion
const AUTO_RESUME_DELAY = 3000 // ms of calm after a touch, wheel or key interaction before drifting again

// Layout measurements taken from the design. Tweak these to fine-tune.
// The two --type-* lines bump the small text on this page (Label / Caption) to 14px
// using the site's own tokens, so the classes in index.css keep doing the styling.
const TITLE_GAP = 80 // px between the bottom of the card labels and the top of the WORK title
const LABELS_H = 44 // px reserved under the images for the name/tag labels (8px margin + 2 lines)
const TITLE_RATIO = 0.293 // WORK font-size as a fraction of the card width (same as 9.2vw / 31.4vw)

// ONE source of truth for the card shape. Keep in sync with the aspect-[4/5] class on the image box below.
const CARD_ASPECT = 1.25 // card height / card width (4:5)

// The card width shrinks on short windows so the title always fits below the cards with the full gap.
// (dvh, not vh, so mobile browser chrome doesn't throw the size off)
const FIT = CARD_ASPECT + 0.8 * TITLE_RATIO // 1.484

// Smallest card the height rule may produce. Below the window height where this floor is reached the
// page stops squeezing and scrolls instead of clipping the WORK title (see --min-page-h).
const MIN_CARD_W = 200

// Left column and cards origin follow the card width (same ratios as the 31.4vw / 30vw / 34.2vw design),
// so when a short window shrinks the cards the whole composition shrinks with them.
const LEFT_COL_RATIO = 30 / 31.4
const CARDS_LEFT_RATIO = 34.2 / 31.4

// Portrait tablets: let the card grow (the height rule still caps it).
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
  // Window height at which MIN_CARD_W is reached: never make the page shorter than this on tablet/desktop
  "--min-page-h": `calc(var(--work-top) + ${MIN_CARD_W * FIT}px + ${LABELS_H + TITLE_GAP}px + var(--page-pad))`,
})

// Giant WORK title: sits exactly TITLE_GAP below the labels, sized relative to the cards
const TITLE_STYLE = {
  top: `var(--title-top)`,
  fontSize: `calc(var(--card-w) * ${TITLE_RATIO})`,
  lineHeight: 0.8,
}

// Left column small text (services) is 20px. Set as a token so .Caption keeps styling it.
const LEFT_TEXT_VARS = { "--type-caption-size": "20px" }

// Corner radius of the project images. Change this one value to match the rest of the site.
// Scales with the card (12px at the smallest, about 14px at the 452px design size, 24px max).
const CARD_RADIUS = "clamp(12px, calc(var(--card-w) * 0.03), 24px)"

const NOOP = () => {} // stable identity, so effects never re-fire because of a fallback function

const CAROUSEL_QUERY = "(min-width: 768px)" // 768px triggers the fluid tablet/desktop carousel
const PHONE_QUERY = "(max-width: 767px)" // the flipbook is strictly for phones

// Subscribes to a media query without re-running anything on every resize event
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

// Critically damped spring (the "SmoothDamp" used in game engines).
// Velocity is continuous, so you get a real ease-in when you start dragging
// and a real ease-out when you let go.
const smoothDamp = (current, goal, vel, smoothTime, dt) => {
  const omega = 2 / smoothTime
  const k = omega * dt
  const decay = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k)
  const change = current - goal
  const temp = (vel + omega * change) * dt
  return [goal + (change + temp) * decay, (vel - omega * temp) * decay]
}

// Quiet footnote: muted dot + availability line, then the live local time (24h, updates every 10s)
const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

// Touch devices get a 44px tap target via an invisible ::before that extends past the text, so the
// rows keep the same tight spacing as on desktop (padding would push them apart).
// One row in the services list. GSAP drives the hover so it stays smooth and interruptible.
// The <li> never moves (it is the hover target); only the <button> inside slides, so the hover
// area can't flicker at the edge. Mid-hover reversals simply retarget the tween from where it is.
const SERVICE_SHIFT = 8 // px the label slides right on hover
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

  // Read the resting colour once (inherited from the list), and wire up hover on the stable <li>
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

  // When this row becomes (or stops being) the selected service, update its colour unless hovered
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

export default function Work() {
  const outletCtx = useOutletContext()
  const navigate = useNavigate()

  const isCarousel = useMediaQuery(CAROUSEL_QUERY)
  const isPhone = useMediaQuery(PHONE_QUERY)
  const isPortraitTablet = useMediaQuery("(min-width: 768px) and (orientation: portrait)")
  const layoutVars = useMemo(() => buildLayoutVars(isPortraitTablet), [isPortraitTablet])

  const pageReady = usePageReady()

  // Bring in the triggerTransition function from the PageTransitionOverlay context
  const transitionCtx = usePageTransition()
  const triggerTransition = transitionCtx?.triggerTransition

  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const draggedRef = useRef(false)

  // Holds every card element for the carousel
  const cardRefs = useRef([])

  // The carousel effect fills this with a function that glides the row to card k (carousel only)
  const slideRef = useRef(null)
  // Mobile flipbook handle: flipRef.current.goTo(k) flips to card k
  const flipRef = useRef(null)
  // Remembers the last service clicked so a repeat click can step to the next matching card
  const lastServiceRef = useRef({ tag: null, idx: -1 })
  // The service last clicked in the left list: it stays black and shifted right until another is clicked
  const [activeService, setActiveService] = useState(null)

  // Always point at the latest outlet context, so the mount effect below can run exactly once
  const ctxRef = useRef(outletCtx)
  useEffect(() => {
    ctxRef.current = outletCtx
  })

  // Light page: header text goes dark. Start at the top. Runs once on mount.
  useEffect(() => {
    const ctx = ctxRef.current
    const setHeaderLight = ctx?.setHeaderLight || NOOP
    setHeaderLight(false)
    window.scrollTo(0, 0)
    ctx?.lenisRef?.current?.scrollTo(0, { immediate: true })
    if (ctx?.heroFade) ctx.heroFade.set(1)
  }, [])

  /* ---------- horizontal movement: infinite loop + stacking, critically-damped easing ---------- */
  // Carousel only. Re-runs when the breakpoint flips, so mobile never carries carousel state.
  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!isCarousel || !viewport || !track) return
    if (!pageReady) return // DO NOT START THE INTRO UNTIL THE PRELOADER IS DONE

    const cards = cardRefs.current.slice(0, LOOPED_CARDS.length)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const glideSmooth = reduceMotion ? REDUCED_GLIDE_SMOOTH : GLIDE_SMOOTH
    // SwiftUI "response" -> SmoothDamp smoothTime (omega = 2*pi/response = 2/smoothTime)
    const snapSmooth = (reduceMotion ? REDUCED_SNAP_RESPONSE : SNAP_RESPONSE) / Math.PI
    const stackScale = reduceMotion ? 0 : STACK_SCALE

    let x = 0 // rendered offset
    let v = 0 // rendered velocity (px/s), carried across drag -> release so nothing ever jumps
    let target = 0 // where x is easing toward
    let raf = 0
    let lastFrame = 0
    let dragging = false
    let activePointer = null
    let startX = 0
    let startTarget = 0
    let step = 0 // card width + gap, measured only when the layout changes
    let cancelled = false
    let wheelTimer = 0
    const settleWaiters = []

    let settleSmooth = glideSmooth // spring softness used while not tracking a finger
    let wheelActive = false // trackpad swipe in progress: also tracked 1:1
    let autoDrift = false // true while the row is auto-scrolling (the loop pushes target left every frame)
    let slack = 0 // px the row is "behind" the finger right after the drag threshold; eases to 0
    let travel = 0 // unwrapped position (the loop wrap would otherwise look like a huge velocity)
    const samples = [] // finger history, one per frame while tracking

    // Cache each card's parts once so the per-frame paint does no DOM queries
    const parts = cards.map((card) =>
      card
        ? {
            card,
            inner: card.querySelector(".card-inner"),
            meta: card.querySelector(".card-meta"),
            shade: card.querySelector(".card-shade"),
            last: -1, // last state written (skips redundant style writes)
          }
        : null
    )

    // Measured once per layout change instead of every frame. Uses the LAST card: it's always
    // far right, so it never has a stacking transform applied. getBoundingClientRect gives
    // the exact fractional width, whereas offsetWidth rounds and makes cards drift off their slot.
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

    const paint = () => {
      if (!step) return
      const setWidth = step * N

      // --- INFINITE LOOP: silently jump one full set when we leave the middle set ---
      if (x <= -setWidth * 1.5) {
        x += setWidth
        target += setWidth
        startTarget += setWidth
      } else if (x >= -setWidth * 0.5) {
        x -= setWidth
        target -= setWidth
        startTarget -= setWidth
      }

      track.style.transform = `translate3d(${x}px, 0, 0)`

      // --- STACKING DECK ---
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        if (!p) continue
        const left = i * step + x // card's position relative to the viewport's left edge

        // Normal state. The 0.5px dead-zone stops a card from sitting at 99.9% scale.
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

        // Fully buried behind later cards: don't paint it at all
        if (left <= -2 * step) {
          if (p.last !== 2) {
            p.card.style.visibility = "hidden"
            p.last = 2
          }
          continue
        }

        // Pin to the left edge (counter-translate), shrink from the left, dim via overlay
        p.card.style.visibility = ""
        p.card.style.transform = `translate3d(${-left}px, 0, 0) scale(${1 - stackScale * progress})`
        if (p.shade) p.shade.style.opacity = String(SHADE_MAX * progress)
        if (p.meta) p.meta.style.opacity = String(Math.max(0, 1 - progress * 2))
        p.last = 1
      }
    }

    const loop = (t) => {
      // Clamp both ways: rAF's timestamp is the frame start and can be slightly older than
      // the performance.now() stored by kick(), which would otherwise give a negative dt.
      const dt = Math.max(0, Math.min(0.05, (t - lastFrame) / 1000 || 1 / 60))
      lastFrame = t
      const prevX = x
      const tracking = (dragging && draggedRef.current) || wheelActive

      if (tracking) {
        // Direct manipulation: the row IS where your finger put it (1:1, one write per frame).
        // Only the few px of click threshold are eased out so there is no jump when the drag begins.
        slack *= Math.exp(-dt * SLACK_RATE)
        if (Math.abs(slack) < 0.05) slack = 0
        x = target + slack
        v = 0
      } else {
        // Finger down but not dragging yet = catch the glide quickly; otherwise settle softly.
        // v is carried over from the release, so nothing ever jumps.
        // Auto-scroll: move the goal at a constant speed; the spring turns that into an ease-in and ease-out.
        if (autoDrift) target -= step * AUTO_SPEED * dt
        const smoothTime = dragging ? CATCH_SMOOTH : settleSmooth
        ;[x, v] = smoothDamp(x, target, v, smoothTime, dt)
      }
      travel += x - prevX
      paint()

      if (tracking) {
        pushSample()
        if (slack === 0) { raf = 0; return } // finger is still: sleep until the next move
      } else if (Math.abs(target - x) < 0.05 && Math.abs(v) < 0.5) {
        x = target
        v = 0
        paint()
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

    // Resolves once the glide has come to rest (no setTimeout guessing)
    const whenSettled = () =>
      new Promise((resolve) => {
        if (!raf && Math.abs(target - x) < 0.05) resolve()
        else settleWaiters.push(resolve)
      })

    /* ---------- auto-scroll: slow constant-speed drift, stopped by hover (off unless USE_AUTO_SCROLL) ---------- */
    let autoEnabled = false // switched on once the intro has finished (and only if USE_AUTO_SCROLL)
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
      !viewport.querySelector(":focus-visible") // keyboard focus only: a mouse click must not block it forever

    const startDrift = () => {
      if (autoDrift) return
      autoDrift = true
      settleSmooth = AUTO_SMOOTH
      kick() // starts from rest, so the spring gives a natural ease-in
    }

    // snap = true: glide to the nearest card and stop (the velocity is kept, so it decelerates smoothly).
    // snap = false: the caller is about to set its own target (drag, wheel, keys).
    const stopDrift = (snap) => {
      if (!autoDrift) return
      autoDrift = false
      if (snap && step) {
        target = Math.round(x / step) * step
        settleSmooth = snapSmooth
        kick()
      }
    }

    // If something is still blocking (off-screen, keyboard focus...), check again shortly
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

    /* ---------- intro helpers (declared first: input handlers call interrupt()) ---------- */
    const timers = []
    const anims = []
    let touched = false // any real interaction cancels the hint
    // The card(s) stacked at the far left (the previous loop set) are hidden during the intro,
    // otherwise they show through while the first cards are still sliding in.
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

    /* ---------- release physics ---------- */
    const pushSample = () => {
      const t = performance.now()
      samples.push({ p: travel, t })
      while (samples.length > 2 && t - samples[0].t > VELOCITY_WINDOW * 2) samples.shift()
    }
    // Finger velocity (px/s) over the last VELOCITY_WINDOW ms. Held still before letting go = 0, like iOS.
    const sampledVelocity = () => {
      pushSample() // end the measurement exactly at release
      const now = performance.now()
      const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW)
      if (recent.length < 2) return 0
      const a = recent[0]
      const b = recent[recent.length - 1]
      const dt = (b.t - a.t) / 1000
      return dt < 0.016 ? 0 : (b.p - a.p) / dt
    }
    // Hand the row back to the spring: keep the finger's exact velocity, project where a flick would
    // coast to, snap to the nearest card, and spring there starting at that velocity.
    const releaseWith = (vel) => {
      const throwDist = clamp(
        (vel * DECELERATION_RATE) / (1 - DECELERATION_RATE) / 1000,
        -MAX_THROW * step,
        MAX_THROW * step
      )
      const projected = x + throwDist
      target = SNAP && step ? Math.round(projected / step) * step : projected
      v = vel
      slack = 0
      settleSmooth = snapSmooth
      kick()
    }

    /* ---------- input: drag (pointer capture), wheel, keyboard, focus ---------- */
    const onPointerMove = (e) => {
      if (!dragging || e.pointerId !== activePointer) return
      const dx = e.clientX - startX

      if (!draggedRef.current) {
        if (Math.abs(dx) <= DRAG_THRESHOLD) return
        draggedRef.current = true
        // Capture only once it's really a drag, so plain clicks keep their normal target
        try {
          viewport.setPointerCapture(e.pointerId)
        } catch {
          /* pointer already gone */
        }
        target = startTarget + dx
        slack = x - target // no jump: the threshold px ease out instead
        samples.length = 0
        pushSample()
      }

      target = startTarget + dx // applied 1:1 by the loop on the next frame
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
      const vel = wasDrag ? sampledVelocity() : 0 // measure while still in drag mode
      dragging = false
      scheduleResume(AUTO_RESUME_DELAY)
      endDrag()
      viewport.removeAttribute("data-dragging")
      try {
        viewport.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }

      if (wasDrag) {
        releaseWith(vel)
      } else if (SNAP && step) {
        // A tap, or you caught a moving row: settle on the nearest card instead of resting half-stacked
        target = Math.round(x / step) * step
        settleSmooth = snapSmooth
        kick()
      }

      // The click event fires right after pointerup; clear the flag once it has passed
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
      target = x // catch the glide where it is right now (v is kept, so it brakes smoothly)
      startTarget = target
      slack = 0
      viewport.setAttribute("data-dragging", "true")
      viewport.addEventListener("pointermove", onPointerMove)
      viewport.addEventListener("pointerup", onPointerUp)
      viewport.addEventListener("pointercancel", onPointerUp)
      kick()
    }

    // After a drag, swallow the click so the card underneath doesn't navigate
    const onClickCapture = (e) => {
      if (!draggedRef.current) return
      e.preventDefault()
      e.stopPropagation()
    }

    // Trackpad / horizontal wheel: 1:1 while the gesture (and the OS's own momentum) lasts,
    // then it settles on a card exactly like a finger release.
    const onWheel = (e) => {
      if (dragging) return
      const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX
      if (Math.abs(dx) <= Math.abs(e.deltaY)) return // vertical scroll: leave it alone
      e.preventDefault() // also stops the browser's swipe-back gesture
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

    // Arrow keys move one card at a time
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

    // Keyboard focus on a clipped card would make the browser scroll the overflow:hidden
    // viewport sideways. Undo that, and glide the focused card into the first slot instead.
    const onFocusIn = (e) => {
      viewport.scrollLeft = 0
      if (!step || !e.target.matches?.(":focus-visible")) return // mouse focus: leave it alone
      const idx = cards.indexOf(e.target.closest("a"))
      if (idx < 0) return
      interrupt()
      target = -idx * step
      settleSmooth = glideSmooth
      kick()
    }

    // Glide to card k (0..N-1) using the copy of it that needs the shortest trip
    slideRef.current = (k) => {
      if (!step) return
      interrupt()
      const setWidth = step * N
      const base = -(N + k) * step // card k in the middle set
      target = base + Math.round((target - base) / setWidth) * setWidth
      settleSmooth = glideSmooth
      kick()
    }

    /* ---------- layout: measure once, then only when sizes actually change ---------- */
    measure()
    paint()
    const ro = new ResizeObserver(() => {
      const prev = step
      measure()
      if (prev && step && prev !== step) {
        // keep the row aligned to its cards when the card width changes
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

    /* ---------- intro: cards glide in from the right (staggered), then the row slides one card left as a "drag me" hint ---------- */
    // Everything chains on real signals (decode, animation.finished, settle), not guessed timeouts.
    const decodeImages = (imgs) =>
      Promise.race([
        Promise.all(imgs.map((img) => (img?.decode ? img.decode().catch(() => {}) : Promise.resolve()))),
        wait(IMAGE_WAIT_MAX),
      ])

    const runIntro = async () => {
      // Cards in the middle set are the ones on screen (paint() already moved us there)
      const visible = cards.slice(N, N * 2)
      hideBehind()
      // Keep the cards invisible until their images are decoded, so nothing pops in late
      visible.forEach((c) => {
        const inner = c?.querySelector(".card-inner")
        if (inner) inner.style.opacity = "0"
      })

      await decodeImages(visible.map((c) => c?.querySelector("img")))
      if (cancelled) return

      const dist = step // each card starts one card-width to the right of its slot
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
            fill: "both", // hold the hidden start frame during the delay and the landed frame at the end
          }
        )
        anims.push(anim)
        return anim.finished
          .then(() => {
            inner.style.opacity = ""
            anim.cancel()
          })
          .catch(() => {}) // cancelled on cleanup
      })

      await Promise.all(landed)
      if (cancelled) return
      if (touched || dragging) return showBehind()

      // One-card hint: glide exactly one card width to the left, once, and stay there
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
      // Cards 0-3 keep their DOM nodes when we drop to mobile, so clear every inline style
      resetStyles()
    }
  }, [isCarousel, pageReady])

  // Left list click: slide to the first card with that service's tag; clicking the same one again
  // steps to the next match (wraps around). Carousel slides the row, mobile flips the flipbook.
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

  // Tapping the front flipbook card opens its project
  const handleFlipSelect = (name) => {
    const card = CARDS.find((c) => c.name === name)
    if (card) {
      if (triggerTransition) triggerTransition(card.to)
      else navigate(card.to)
    }
  }

  // Carousel renders the tripled row for the loop.
  // (Phones render the flipbook instead.)
  const renderedCards = isCarousel ? LOOPED_CARDS : CARDS

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col bg-white pt-28 md:block md:h-[100dvh] md:min-h-[var(--min-page-h)] md:overflow-x-clip md:pt-0"
      style={layoutVars}
    >
      {/* Left column: heading level with the top of the images, services level with the image bottoms */}
      <div
        className="flex flex-col gap-6 px-[var(--page-pad)] pb-0 pt-4 md:absolute md:left-0 md:top-[var(--work-top)] md:h-[var(--card-h)] md:w-[var(--left-col-w)] md:justify-between md:gap-0 md:pb-0 md:pt-0"
        style={LEFT_TEXT_VARS}
      >
        {/* H4: 32px display, tight two-line stack */}
        <h2 className="H4 uppercase md:text-[40px]" style={{ lineHeight: 0.95 }}>
          HOW I<br />
          CAN HELP
        </h2>
        {/* Services list styled with ultra-compact line height */}
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

      {/* Mobile: flipbook. The component applies var(--page-pad) itself, so the tucked side cards stop at the page margin on both sides. */}
      {isPhone && (
        <div className="pt-6">
          <FlipbookCarousel ref={flipRef} projects={FLIP_PROJECTS} onSelect={handleFlipSelect} bottomReserve={PHONE_FOOTER_H} />
        </div>
      )}

      {/* Cards: sliding carousel (Tablet & Desktop) */}
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
            const project = WORK_PROJECTS.find((p) => p.slug === card.match || p.id === card.match)
            const imgSrc = card.image || project?.image

            // On carousel only the middle set is the "real" one: it's what you see, tab to and hear.
            // The first and last sets exist purely for the endless loop.
            const canonical = !isCarousel || (index >= N && index < N * 2)

            // Load what's on screen right away; copies reuse the same files, mobile lazy-loads below the fold
            const eager = isCarousel ? canonical : index === 0
            const high = isCarousel ? canonical && index < N + 2 : index === 0

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
                key={`${card.name}-${index}`}
                to={card.to}
                onClick={(e) => {
                  if (draggedRef.current) return // Prevent triggering if the user is dragging the carousel
                  e.preventDefault()
                  if (triggerTransition) triggerTransition(card.to)
                  else navigate(card.to)
                }}
                ref={(el) => {
                  cardRefs.current[index] = el
                }}
                aria-hidden={canonical ? undefined : true}
                tabIndex={canonical ? undefined : -1}
                className="block shrink-0 md:will-change-transform md:[contain:layout] md:w-[var(--card-w)]"
                style={{ transformOrigin: "left center" }}
                draggable={false}
              >
                <div className="card-inner" style={!pageReady ? { opacity: 0 } : {}}>
                  <div
                    className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--bg-surface-light)]"
                    style={{ borderRadius: CARD_RADIUS }}
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
                    {/* depth shading: light-to-dark gradient (left clear, right dark). Invisible at rest (opacity 0);
                        paint() fades it in only while the card stacks behind the next one. */}
                    <div className="card-shade pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-black opacity-0" />
                  </div>
                  <div className="card-meta mt-2 flex items-start justify-between gap-4 text-black">
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
          })}
        </div>
      </div>
      )}

      {/* Availability badge, bottom left, aligned with the WORK title */}
      <div
        className="mt-auto flex flex-col gap-4 px-[var(--page-pad)] pb-[max(var(--page-pad),env(safe-area-inset-bottom))] pt-0 md:mt-0 md:absolute md:left-0 md:top-[var(--title-top)] md:h-[var(--title-h)] md:w-[var(--left-col-w)] md:justify-end md:pb-0 md:pt-0"
      >
        <Availability />
      </div>

      {/* Huge title, lined up with the first card (H1: Borscha display, tight tracking from the token).
          Visually hidden on mobile but still the page's h1 for screen readers and SEO. */}
      <h1
        className="H1 pointer-events-none absolute sr-only select-none md:not-sr-only md:!absolute md:left-[var(--cards-left)]"
        style={TITLE_STYLE}
      >
        WORK
      </h1>
    </div>
  )
}