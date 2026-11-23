// src/views/Home.jsx

import React, {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    useContext,
    memo,
  } from "react"
  import {
    motion,
    AnimatePresence,
    useScroll,
    useSpring,
    useMotionValue,
    useInView,
  } from "framer-motion"
  import { useNavigate, useOutletContext } from "react-router-dom"
  import gsap from "gsap"
  
  import { ViewportContext } from "../lib/viewport"
  import {
    customEase,
    taylorEase,
    TICKER_HEIGHT,
    TICKER_REVEAL,
    SERVICES_VIEWPORT,
    TICKER_MOTION,
    TICKER_MOTION_MOBILE,
    createTicker,
  } from "../lib/motion"
  
  import { WORK_PROJECTS, LOOPING_IMAGES } from "../lib/projects"
  import { FETCH_PRIORITY_KEY, whenIdle } from "../lib/loadingHints"
  import { prefetchHero, heroSlugFor, warmAllHeroes } from "../lib/heroPrefetch.js"
  
  import MaskRevealText from "../components/MaskRevealText"
  import ServiceImageStage from "../components/ServiceImageStage"
  import ScrollFillGroup from "../components/ScrollFillGroup"
  import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"
  
  const SMOOTH_SLIDE_EASE = [0.22, 1, 0.36, 1]
  
  // Staggered slide-up list reveal (osmo.supply style): each row rises into place one after
  // another, its divider draws in, and the row's text follows a beat behind.
  const LIST_REVEAL_EASE = [0.16, 1, 0.3, 1]
  
  const listContainerVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.22,
            delayChildren: 0.2,
        },
    },
  }
  
  const listRowVariants = {
    hidden: { opacity: 0, y: 90 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 1.8,
            ease: LIST_REVEAL_EASE,
            staggerChildren: 0.14,
            delayChildren: 0.2,
        },
    },
  }
  
  const listDividerVariants = {
    hidden: { scaleX: 0, opacity: 0.4 },
    show: {
        scaleX: 1,
        opacity: 1,
        transition: {
            duration: 1.8,
            ease: LIST_REVEAL_EASE,
        },
    },
  }
  
  const listTextContainerVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.14,
            delayChildren: 0.1,
        },
    },
  }
  
  const listTextItemVariants = {
    hidden: { opacity: 0, y: 48 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 1.5,
            ease: LIST_REVEAL_EASE,
        },
    },
  }
  
  // Services shares the same motion language.
  const servicesListContainerVariants = listContainerVariants
  const servicesRowVariants = listRowVariants
  const servicesDividerVariants = listDividerVariants
  
  const glueLastWords = (str) => {
    const i = str.lastIndexOf(" ")
    if (i === -1) return str
    return str.slice(0, i) + "\u00A0" + str.slice(i + 1)
  }
  
  const flat = (str) => str.replace(/\n/g, " ")
  
  const TICKER_PRIORITY_COUNT = 4
  const TICKER_START_DELAY = 1200
  const TICKER_CARD_RADIUS = "0px"
  const HOVER_INTENT_MS = 110
  
  function smoothDamp(current, target, st, smoothTime, dt) {
    const omega = 2 / Math.max(0.0001, smoothTime)
    const x = omega * dt
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    const change = current - target
    const temp = (st.v + omega * change) * dt
    st.v = (st.v - omega * temp) * decay
    return target + (change + temp) * decay
  }
  
  // Layout measurements must ignore transient transforms (reveal animations, row hover nudges).
  // getBoundingClientRect() includes them, so a measurement taken mid-animation puts the result in
  // the wrong place and the layout visibly "settles" later. These helpers strip translateY.
  function translateYOf(el, stop) {
    let y = 0
    for (let n = el; n && n !== stop && n.nodeType === 1; n = n.parentElement) {
      const t = getComputedStyle(n).transform
      if (t && t !== "none") {
        try {
          y += new DOMMatrix(t).m42 || 0
        } catch (e) {}
      }
    }
    return y
  }
  const stableTop = (el, stop) => el.getBoundingClientRect().top - translateYOf(el, stop)
  
  const APPLE_EASE_CSS = "cubic-bezier(0.32, 0.72, 0, 1)"
  
  const TICKER_ZOOM = {
    minScale: 0.95,
    fullSpeed: 2000,
    driftMargin: 1.25,
    velSmoothing: 8,
    spread: 0.04,
    tiltMax: 0,
    perspective: 1400,
    settle: 0.7,
    parallax: 0.04,
  }
  
  const TICKER_ZOOM_TOUCH = {
    minScale: 0.97,
    fullSpeed: 3000,
    spread: 0.024,
    tiltMax: 0,
    parallax: 0.06,
  }
  
  const TICKER_MOBILE = {
    restDip: 0.04,
    flickDip: 0.02,
  }
  
  const TICKER_IMG_SIZES = "(max-width: 767px) 72vw, (max-width: 1023px) 42vw, 352px"
  
  const SERVICES_DATA = [
    {
        id: "01",
        title: "Brand Identity",
        keywords: "Strategy, positioning, identity\nsystems and guidelines",
        image: "/brand-identity.webp",
        captionTitle: "Make your\nDifference Visible",
        captionText:
            "Every business has an edge. I sharpen yours into a brand people recognize",
    },
    {
        id: "02",
        title: "Digital Design",
        keywords: "Websites, landing pages and\ndigital experiences",
        image: "/digital-design.webp",
        captionTitle: "Make your website\nwork harder",
        captionText:
            "Create digital experiences people enjoy, turning curious visitors into customers",
    },
    {
        id: "03",
        title: "Communication",
        keywords: "Pitch decks, presentations\nand campaign design",
        image: "/communication.webp",
        captionTitle: "Turn information\ninto influence",
        captionText:
            "From pitch decks to campaigns, turn complex ideas into clear visuals that get people to act",
    },
    {
        id: "04",
        title: "3D Visuals",
        keywords: "Product visualization,\narch visualization and motion",
        image: "/3d-visuals.webp",
        captionTitle: "Make products feel\npremium before launch",
        captionText:
            "High-fidelity renders that build desire and make the future instantly tangible",
    },
  ]
  
  const SERVICE_IMAGES = SERVICES_DATA.map((s) => s.image)
  
  // Which part of each picture stays visible inside the image box beside the Services title.
  // "x% y%": lower y shows lower parts of the image, higher x shows more of its right side.
  const SERVICE_IMAGE_POSITIONS = ["50% 50%", "50% 50%", "50% 50%", "50% 50%"]
  
  const EXPERTISE_DATA = [
    {
        title: "Brand Identity",
        description: "Complete positioning, visual systems,\nand brand guideline",
        tools: ["Adobe Illustrator", "Adobe Photoshop", "Adobe InDesign"],
        image: "/expertise-brand.webp",
        tilt: -14,
        scale: 1,
        mobileBoost: 1.4,
        mobileOffset: { x: 12, y: 16 },
    },
    {
        title: "Web & UI Design",
        description: "High-converting landing pages and responsive Framer sites",
        tools: ["Figma", "Framer", "Webflow"],
        image: "/expertise-web.webp",
        tilt: 6,
        scale: 1.25,
    },
    {
        title: "Pitch & Presentation",
        description: "Decks that win clients,\nfunding, and board approval",
        tools: ["Canva", "PowerPoint", "Keynote"],
        image: "/expertise-pitch.webp",
        tilt: -10,
        scale: 1,
        desktopOffset: { x: 0, y: 40 },
        mobileOffset: { x: 0, y: 16 },
    },
    {
        title: "3D & Motion",
        description: "High-impact 3D visuals,\nproduct renders, and video motion",
        tools: ["Blender", "After Effects", "DaVinci"],
        image: "/expertise-3d.webp",
        tilt: 12,
        scale: 1,
    },
  ]
  
  const EXPERTISE_SIZE = {
    desktop: { area: 38000, maxSide: 290 },
    tablet: { area: 20000, maxSide: 210 },
    mobile: { area: 14000, maxSide: 160 },
  }
  
  const fitByArea = (ratio, { area, maxSide }) => {
    let w = Math.sqrt(area * ratio)
    let h = w / ratio
    const longest = Math.max(w, h)
    if (longest > maxSide) {
        const k = maxSide / longest
        w *= k
        h *= k
    }
    return { w: Math.round(w), h: Math.round(h) }
  }
  
  const EXPERTISE_IMAGE_CACHE = new Map()
  
  const readRatio = (img) =>
    img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null
  
  function useExpertiseRatios() {
    const [ratios, setRatios] = useState(() => {
        const initial = {}
        EXPERTISE_IMAGE_CACHE.forEach((img, src) => {
            const r = readRatio(img)
            if (r) initial[src] = r
        })
        return initial
    })
  
    useEffect(() => {
        let cancelled = false
  
        const settle = (src, img) => {
            const r = readRatio(img)
            if (cancelled || !r) return
            setRatios((prev) => (prev[src] === r ? prev : { ...prev, [src]: r }))
        }
  
        const cancelIdle = whenIdle(() => {
            EXPERTISE_DATA.forEach(({ image: src }) => {
                let img = EXPERTISE_IMAGE_CACHE.get(src)
                if (!img) {
                    img = new Image()
                    img.decoding = "async"
                    EXPERTISE_IMAGE_CACHE.set(src, img)
                    img.src = src
                    img.decode?.().catch(() => {})
                }
                if (img.complete) settle(src, img)
                else img.addEventListener("load", () => settle(src, img), { once: true })
            })
        }, 1500)
  
        return () => {
            cancelled = true
            cancelIdle()
        }
    }, [])
  
    return ratios
  }
  
  const EXPERTISE_CURSOR = {
    width: 240,
    height: 240,
    offsetX: 0,
    offsetY: 0,
    stiffness: 150,
    damping: 28,
    mass: 0.2,
  }
  const EXPERTISE_SHIFT = 14
  const SITE_GREY = "#cccccc"
  const SITE_SECONDARY_GREY = "#71717b"
  const SERVICE_INACTIVE_GREY = "#999999"
  
  const ExpertiseCursorImage = ({ x, y, hoveredIndex, ratios }) => {
    const c = EXPERTISE_CURSOR
    const sx = useSpring(x, { stiffness: c.stiffness, damping: c.damping, mass: c.mass })
    const sy = useSpring(y, { stiffness: c.stiffness, damping: c.damping, mass: c.mass })
  
    const wrapRef = useRef(null)
  
    useEffect(() => {
        wrapRef.current?.querySelectorAll("img").forEach((img) => {
            img.decode?.().catch(() => {})
        })
    }, [])
  
    const visible = hoveredIndex !== null
    useLayoutEffect(() => {
        if (!visible) return
        if (typeof sx.jump === "function") {
            sx.jump(x.get())
            sy.jump(y.get())
        }
    }, [visible, sx, sy, x, y])
  
    return (
        <motion.div
            ref={wrapRef}
            aria-hidden="true"
            style={{
                x: sx,
                y: sy,
                translateX: c.offsetX,
                translateY: c.offsetY,
                width: c.width,
                height: c.height,
                marginLeft: -c.width / 2,
                marginTop: -c.height / 2,
            }}
            className="fixed top-0 left-0 z-40 hidden pointer-events-none lg:block"
        >
            {EXPERTISE_DATA.map((item, i) => {
                const active = hoveredIndex === i
                const { w, h } = fitByArea(ratios[item.image] || 1, EXPERTISE_SIZE.desktop)
                return (
                    <motion.img
                        key={item.title}
                        src={item.image}
                        alt=""
                        draggable={false}
                        initial={false}
                        style={{
                            left: "50%",
                            top: "50%",
                            width: w,
                            height: h,
                            marginLeft: -w / 2 + (item.desktopOffset?.x || 0),
                            marginTop: -h / 2 - (item.desktopOffset?.y || 0),
                        }}
                        animate={{
                            opacity: active ? 1 : 0,
                            scale: active ? item.scale : item.scale * 0.8,
                            rotate: active ? item.tilt : item.tilt - 8,
                        }}
                        transition={{ duration: active ? 0.7 : 0.35, ease: customEase }}
                        className="absolute object-contain select-none will-change-[transform,opacity]"
                    />
                )
            })}
        </motion.div>
    )
  }
  
  const RollingText = ({ text, active }) => (
    <span aria-label={text} className="relative inline-flex overflow-hidden align-top whitespace-pre">
        {Array.from(text).map((ch, i) => {
            const glyph = ch === " " ? "\u00A0" : ch
            return (
                <span
                    key={i}
                    aria-hidden="true"
                    className="relative inline-block"
                    style={{
                        transform: active ? "translateY(-100%)" : "translateY(0)",
                        transition: "transform 550ms cubic-bezier(0.25, 0.8, 0.25, 1)",
                        transitionDelay: `${i * 18}ms`,
                    }}
                >
                    <span className="block">{glyph}</span>
                    <span className="absolute left-0 top-full block">{glyph}</span>
                </span>
            )
        })}
    </span>
  )
  
  const TickerSlideBase = ({ src, project, ready, onClick, fetchPriority, isClone }) => {
    const slideRef = useRef(null)
    const cardRef = useRef(null)
    const captionRef = useRef(null)
    const [reveal, setReveal] = useState(null)
    const [hovered, setHovered] = useState(false)
    const hoverTimer = useRef(0)
  
    useEffect(() => () => clearTimeout(hoverTimer.current), [])
  
    useEffect(() => {
        if (!ready || reveal) return
        const frame = requestAnimationFrame(() => {
            const el = slideRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const vw = window.innerWidth || 1280
            const onScreen = rect.right > 0 && rect.left < vw
            if (!onScreen) {
                setReveal({ delay: 0, instant: true })
                return
            }
            const column = Math.max(0, Math.round(rect.left / (rect.width || 1)))
            setReveal({
                delay: TICKER_REVEAL.delay + column * TICKER_REVEAL.stagger,
                instant: false,
            })
        })
        return () => cancelAnimationFrame(frame)
    }, [ready, reveal])
  
    useLayoutEffect(() => {
        const card = cardRef.current
        const caption = captionRef.current
        if (!reveal || reveal.instant || !card || typeof card.animate !== "function") return
        const delay = reveal.delay * 1000
        const dur = TICKER_REVEAL.duration * 1000
  
        const from = String(TICKER_REVEAL.from)
        const cardFrom = `translateY(${from})`
        const captionFrom = from.trim().endsWith("%")
            ? `translateY(${(card.offsetHeight * parseFloat(from)) / 100}px)`
            : cardFrom
  
        const targets = [{ el: card, from: cardFrom }]
        if (caption) targets.push({ el: caption, from: captionFrom })
  
        const anims = []
        targets.forEach(({ el, from: f }) => {
            el.style.willChange = "transform, opacity"
            anims.push(
                el.animate([{ transform: f }, { transform: "translateY(0%)" }], {
                    duration: dur,
                    delay,
                    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                    fill: "both",
                }),
                el.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration: dur * 0.5,
                    delay,
                    easing: "ease-out",
                    fill: "both",
                })
            )
        })
        const cleanup = () => {
            anims.forEach((a) => a.cancel())
            targets.forEach(({ el }) => {
                el.style.willChange = ""
            })
        }
        Promise.all(anims.map((a) => a.finished)).then(cleanup, () => {})
        return cleanup
    }, [reveal])
  
    const getSubtitle = (name) => {
        if (!name) return ""
        const lower = name.toLowerCase()
        if (lower.includes("yimaj")) return "Branding / 3D"
        if (lower.includes("weyra")) return "Branding"
        if (lower.includes("origen")) return "Branding"
        return project.category || "Branding"
    }
  
    const interactive = !!project && !isClone
    const a11y = interactive
        ? {
              role: "link",
              tabIndex: 0,
              "aria-label": `${project.name}, ${getSubtitle(project.name)}`,
              onKeyDown: (e) => {
                  if (e.key === "Enter") {
                      e.preventDefault()
                      onClick?.(e)
                  }
              },
          }
        : { "aria-hidden": true }
  
    return (
        <div
            ref={slideRef}
            onClick={onClick}
            onPointerEnter={(e) => {
                if (project) prefetchHero(heroSlugFor(project.name))
                if (e.pointerType !== "mouse") return
                const slide = e.currentTarget
                const dragging = () => !!slide.closest('[data-dragging="true"]')
                if (dragging()) return
                clearTimeout(hoverTimer.current)
                hoverTimer.current = setTimeout(() => {
                    if (!dragging()) setHovered(true)
                }, HOVER_INTENT_MS)
            }}
            onPointerDown={() => {
                clearTimeout(hoverTimer.current)
                setHovered(false)
                if (project) prefetchHero(heroSlugFor(project.name))
            }}
            onPointerLeave={() => {
                clearTimeout(hoverTimer.current)
                setHovered(false)
            }}
            className="relative flex-[0_0_72vw] md:flex-[0_0_42vw] lg:flex-[0_0_352px] min-w-0 pt-[clamp(16px,6svh,95px)] pr-[12px] cursor-pointer group outline-none [--ticker-card-w:calc(72vw-12px)] md:[--ticker-card-w:calc(42vw-12px)] lg:[--ticker-card-w:340px]"
            {...a11y}
        >
            <div className="w-full">
                <div
                    style={{
                        transform: hovered ? "translateY(-6px)" : "translateY(0)",
                        transition: `transform 600ms ${APPLE_EASE_CSS}`,
                    }}
                >
                    <div data-zoom-group className="relative ticker-zoom-group">
                        {project && (
                            <div
                                ref={captionRef}
                                style={reveal ? undefined : { opacity: 0 }}
                                className="flex items-end justify-between gap-[16px] pb-[14px] pointer-events-none"
                            >
                                <span className="ticker-caption Caption !text-[12px] uppercase !font-medium !text-[var(--text-dark-muted)] leading-[1.2]">
                                    <RollingText text={project.name} active={hovered} />
                                </span>
                            </div>
                        )}
                        <div
                            ref={cardRef}
                            data-zoom-card
                            style={{
                                height: TICKER_HEIGHT,
                                borderRadius: TICKER_CARD_RADIUS,
                                ...(reveal ? null : { opacity: 0, transform: `translateY(${TICKER_REVEAL.from})` }),
                            }}
                            className="relative isolate w-full overflow-hidden bg-[var(--bg-surface-dark)]"
                        >
                            <div data-parallax className="absolute inset-0 w-full h-full">
                                <img
                                    src={src}
                                    alt={project ? project.name : "Portfolio Work"}
                                    draggable={false}
                                    decoding="async"
                                    loading={isClone ? "lazy" : "eager"}
                                    sizes={TICKER_IMG_SIZES}
                                    {...(project?.srcSet ? { srcSet: project.srcSet } : null)}
                                    {...(fetchPriority ? { [FETCH_PRIORITY_KEY]: fetchPriority } : null)}
                                    className="object-cover w-full h-full scale-[1.12] pointer-events-none select-none"
                                />
                            </div>
                            <div className="ticker-dim absolute inset-0 bg-black/20 pointer-events-none" />
                            <div className="absolute inset-0 rounded-[inherit] pointer-events-none ring-2 ring-inset ring-white opacity-0 group-focus-visible:opacity-100" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
  }
  
  const TickerSlide = memo(
    TickerSlideBase,
    (a, b) =>
        a.src === b.src &&
        a.project === b.project &&
        a.ready === b.ready &&
        a.fetchPriority === b.fetchPriority &&
        a.isClone === b.isClone
  )
  
  const ACCORDION_OPEN = { duration: 0.6, fadeIn: 0.45, fadeInDelay: 0.12 }
  const ACCORDION_CLOSE = { duration: 0.5, fadeOut: 0.18 }
  
  const AccordionPanel = ({ active, children }) => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const dur = reduce ? 0 : active ? ACCORDION_OPEN.duration : ACCORDION_CLOSE.duration
    return (
        <div
            aria-hidden={!active}
            style={{
                display: "grid",
                gridTemplateRows: active ? "1fr" : "0fr",
                visibility: active ? "visible" : "hidden",
                transition: `grid-template-rows ${dur}s ${APPLE_EASE_CSS}, visibility 0s linear ${active ? 0 : dur}s`,
            }}
        >
            <div style={{ overflow: "hidden", minHeight: 0 }}>{children}</div>
        </div>
    )
  }
  
  const ServiceAccordionImage = ({ src, alt, active, depth = 1 }) => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    return (
        <div
            className="svc-par-box relative w-full aspect-[4/3] max-h-[clamp(180px,30svh,320px)] bg-[var(--bg-surface-dark)] isolate overflow-hidden border border-[var(--border-dark-subtle)]"
            style={{ "--svc-n": depth, isolation: "isolate", transform: "translateZ(0)" }}
        >
            <div className="svc-par">
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    decoding="async"
                    className="object-cover w-full h-full select-none pointer-events-none"
                    style={{
                        opacity: active ? 1 : 0,
                        transform: active ? "scale(1)" : "scale(1.04)",
                        transition: reduce
                            ? "none"
                            : active
                              ? `opacity ${ACCORDION_OPEN.fadeIn}s ${APPLE_EASE_CSS} 0.05s, transform ${ACCORDION_OPEN.duration + 0.2}s ${APPLE_EASE_CSS} 0.05s`
                              : `opacity ${ACCORDION_CLOSE.fadeOut}s ease-out, transform ${ACCORDION_CLOSE.duration}s ${APPLE_EASE_CSS}`,
                    }}
                />
            </div>
        </div>
    )
  }
  
  const RES = 0.5
  // Tunables for the mobile stutter fix. Raise SMOOTH_S for a softer glide (more trailing),
  // lower it for tighter tracking. Raise TOUCH_MAX_DPR if grain/banding is visible on phones.
  const GRADIENT_SMOOTH_S = 0.06
  const TOUCH_MAX_DPR = 1
  const BASE_SHIFT = -1.0
  const SPEED = 2.6
  const BEND = 0.1
  const TOP_BEND = 0.12
  const STOPS = [
    [0.0, 5, 5, 5], [0.22, 5, 5, 5], [0.3, 20, 8, 3], [0.43, 52, 18, 5],
    [0.54, 92, 29, 8], [0.64, 140, 42, 12], [0.75, 205, 82, 34],
    [0.88, 228, 96, 42], [1.0, 240, 130, 48], [1.1, 243, 152, 60],
    [1.2, 245, 176, 74], [1.33, 249, 217, 160], [1.44, 253, 241, 224],
    [1.52, 255, 255, 255], [1.6, 255, 255, 255],
  ]
  const V_MAX = 1.6
  const LUT_SIZE = 2048
  const HEADER_TONE_THRESHOLD = 0.55
  
  // The gradient is pre-rendered once into a tall layer covering pattern coordinates
  // SR_TOP..SR_TOP+SR_SPAN (in viewport heights) and then only *moved* with a transform.
  // Outside that range the pattern is flat, so plain dark / white blocks continue it.
  const SR_TOP = -0.2
  const SR_SPAN = 2
  const SR_BOTTOM = SR_TOP + SR_SPAN
  const BEND_REDRAW_MS = 32
  // Drive the layer with a CSS scroll timeline (compositor-thread, Safari 26+/Chromium).
  // Older browsers fall back to a JS-updated transform. Set false to force the fallback.
  const USE_SCROLL_TIMELINE = true
  
  const supportsScrollTimeline = () =>
    typeof window !== "undefined" &&
    USE_SCROLL_TIMELINE &&
    !!window.CSS?.supports?.("animation-timeline: scroll()")
  
  const SUNRISE_CSS = `
  .sunrise-group {
    position: absolute; left: 0; top: 0; width: 100%;
    height: ${SR_SPAN * 100}lvh;
    will-change: transform;
    transform: translate3d(0, var(--sr-from, 0px), 0);
  }
  .sunrise-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .sunrise-dark, .sunrise-light { position: absolute; left: 0; width: 100%; height: 100lvh; }
  /* The blocks overlap the canvas by 2px so there is no shared edge: when the layer sits on a
     fractional pixel, two touching edges each blend with the dark stage and leave a hairline. */
  .sunrise-dark { bottom: calc(100% - 2px); background: rgb(5, 5, 5); }
  .sunrise-light { top: calc(100% - 2px); background: #fff; }
  @keyframes sunrise-shift {
    from { transform: translate3d(0, var(--sr-from), 0); }
    to { transform: translate3d(0, var(--sr-to), 0); }
  }
  @supports (animation-timeline: scroll()) {
    .sunrise-group[data-native="true"] {
        animation: sunrise-shift linear both;
        animation-timeline: scroll(root block);
        animation-range: var(--sr-s0) var(--sr-s1);
    }
  }
  `
  
  const VERT_SHADER = `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
  `
  
  const FRAG_SHADER = `
  precision highp float;
  uniform sampler2D uLut;
  uniform vec2 uRes;
  uniform float uTopDepth;
  uniform float uBottomDepth;
  uniform float uTop;
  uniform float uSpan;
  
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  
  void main() {
    float nx = gl_FragCoord.x / max(1.0, uRes.x);
    float t = 1.0 - (gl_FragCoord.y / max(1.0, uRes.y));
  
    float dx = nx - 0.5;
    float arc = 1.0 - 4.0 * dx * dx;
    float vb = uTop + t * uSpan;
  
    float w = clamp((1.0 - vb) / 0.6, 0.0, 1.0);
    float mixFactor = w * w * (3.0 - 2.0 * w);
    float depth = mix(uBottomDepth, uTopDepth, mixFactor);
  
    float vv = clamp((vb - depth * arc) / 1.6, 0.0, 1.0);
    float u = (vv * 2047.0 + 0.5) / 2048.0;
    vec3 col = texture2D(uLut, vec2(u, 0.5)).rgb;
  
    float r1 = hash12(gl_FragCoord.xy);
    float r2 = hash12(gl_FragCoord.xy + vec2(17.3, 41.9));
    // No dither on the flat dark/white ends: the plain blocks above and below the canvas
    // have no grain, so grain at the seam shows up as a hairline.
    float edge = smoothstep(0.02, 0.06, vv) * (1.0 - smoothstep(0.93, 0.975, vv));
    float dither = (r1 + r2 - 1.0) * (3.2 / 255.0) * edge;
  
    gl_FragColor = vec4(clamp(col + dither, 0.0, 1.0), 1.0);
  }
  `
  
  function buildLut() {
    const raw = new Float32Array(LUT_SIZE * 3)
    for (let i = 0; i < LUT_SIZE; i++) {
        const v = (i / (LUT_SIZE - 1)) * V_MAX
        let s = 0
        while (s < STOPS.length - 2 && v > STOPS[s + 1][0]) s++
        const a = STOPS[s]
        const b = STOPS[s + 1]
        const u = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0])))
        raw[i * 3] = a[1] + (b[1] - a[1]) * u
        raw[i * 3 + 1] = a[2] + (b[2] - a[2]) * u
        raw[i * 3 + 2] = a[3] + (b[3] - a[3]) * u
    }
    let src = raw
    const R = 40
    for (let pass = 0; pass < 3; pass++) {
        const dst = new Float32Array(LUT_SIZE * 3)
        for (let i = 0; i < LUT_SIZE; i++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0
                for (let k = -R; k <= R; k++) {
                    const j = Math.min(LUT_SIZE - 1, Math.max(0, i + k))
                    sum += src[j * 3 + c]
                }
                dst[i * 3 + c] = sum / (2 * R + 1)
            }
        }
        src = dst
    }
    const out = new Uint8ClampedArray(LUT_SIZE * 3)
    for (let i = 0; i < out.length; i++) out[i] = src[i]
    return out
  }
  
  // Eases the drawn value toward the scroll-derived target with critically damped smoothing,
  // so irregular scroll sampling (older browsers without scroll timelines) becomes an even glide.
  function createFollower(draw, initial) {
    let cur = initial
    let target = initial
    let raf = 0
    let last = 0
    const st = { v: 0 }
  
    const step = (now) => {
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
        last = now
        cur = smoothDamp(cur, target, st, GRADIENT_SMOOTH_S, dt)
        const done = Math.abs(cur - target) < 0.00005 && Math.abs(st.v) < 0.0005
        if (done) {
            cur = target
            st.v = 0
        }
        draw(cur)
        raf = done ? 0 : requestAnimationFrame(step)
    }
  
    return {
        set(v) {
            target = v
            if (!raf) {
                last = performance.now()
                raf = requestAnimationFrame(step)
            }
        },
        jump(v) {
            cur = target = v
            st.v = 0
            draw(v)
        },
        stop() {
            if (raf) cancelAnimationFrame(raf)
            raf = 0
        },
    }
  }
  
  function SunriseTransition({ children, anchorRef, onHeaderTone }) {
    const stageRef = useRef(null)
    const groupRef = useRef(null)
    const canvasRef = useRef(null)
    const toneRef = useRef(onHeaderTone)
    toneRef.current = onHeaderTone
    const [epoch, setEpoch] = useState(0)
    const { scrollY } = useScroll()
    const travel = useMotionValue(0)
  
    // Scroll progress + native scroll-timeline geometry. All layout reads live in measure(),
    // which only runs on resize / document size change, never per scroll tick.
    useEffect(() => {
        const native = supportsScrollTimeline()
        let anchorTop = 0
        let vh = 0
  
        const measure = () => {
            const el = anchorRef?.current
            // 100lvh stage height is constant while mobile browser chrome collapses
            vh = stageRef.current?.clientHeight || window.innerHeight || 800
            if (el) anchorTop = el.getBoundingClientRect().top + window.scrollY
  
            const g = groupRef.current
            if (!g || !native) return
            const s0 = anchorTop - vh
            if (s0 > 0) {
                g.style.setProperty("--sr-from", `${(SR_TOP - BASE_SHIFT) * vh}px`)
                g.style.setProperty("--sr-to", `${(SR_TOP - (BASE_SHIFT + SPEED)) * vh}px`)
                g.style.setProperty("--sr-s0", `${s0}px`)
                g.style.setProperty("--sr-s1", `${s0 + vh * 1.5}px`)
                g.setAttribute("data-native", "true")
            } else {
                g.removeAttribute("data-native")
            }
        }
  
        const update = (y) => {
            if (!vh) return
            const progress = (vh - (anchorTop - y)) / (vh * 1.5)
            travel.set(Math.max(0, Math.min(1, progress)))
        }
  
        const remeasure = () => {
            measure()
            update(window.scrollY)
        }
  
        remeasure()
        const unsubscribe = scrollY.on("change", update)
        const ro = new ResizeObserver(remeasure)
        ro.observe(document.documentElement)
        window.addEventListener("resize", remeasure)
        window.addEventListener("load", remeasure)
        return () => {
            unsubscribe()
            ro.disconnect()
            window.removeEventListener("resize", remeasure)
            window.removeEventListener("load", remeasure)
        }
    }, [anchorRef, scrollY, travel])
  
    useEffect(() => {
        const stage = stageRef.current
        const group = groupRef.current
        const canvas = canvasRef.current
        if (!stage || !group || !canvas) return
  
        const lut = buildLut()
        const lutScale = (LUT_SIZE - 1) / V_MAX
        const clamp01 = (n) => Math.min(1, Math.max(0, n))
        const touch = !!window.matchMedia?.("(pointer: coarse)").matches
        let disposed = false
        let lastLight = null
        let viewH = 0
  
        const measureView = () => {
            viewH = stage.clientHeight || window.innerHeight || 800
        }
        measureView()
  
        const syncHeaderTone = (shift) => {
            const notify = toneRef.current
            if (typeof notify !== "function") return
            const headerCenter = window.innerWidth < 768 ? 36 : 47
            const headerV = headerCenter / viewH
            const vv = headerV + shift
            const k = vv <= 0 ? 0 : vv >= V_MAX ? LUT_SIZE - 1 : (vv * lutScale) | 0
            const lum = (0.2126 * lut[k * 3] + 0.7152 * lut[k * 3 + 1] + 0.0722 * lut[k * 3 + 2]) / 255
            const light = lum > HEADER_TONE_THRESHOLD
            if (light !== lastLight) {
                lastLight = light
                notify(light)
            }
        }
  
        const computeParams = (sv) => {
            const shift = BASE_SHIFT + SPEED * sv
            const bottomDepth = BEND * Math.sin(Math.PI * clamp01(sv / 0.75))
            const topDepth = TOP_BEND * Math.sin(Math.PI * clamp01((sv + 0.35) / 1.1))
            return { shift, bottomDepth, topDepth }
        }
  
        // ------------------------------------------------------------ WebGL layer
        const createGlLayer = () => {
            let gl = null
            try {
                gl = canvas.getContext("webgl", {
                    alpha: false,
                    antialias: false,
                    depth: false,
                    stencil: false,
                    preserveDrawingBuffer: false,
                })
            } catch {
                gl = null
            }
            if (!gl) return null
  
            const compile = (type, src) => {
                const sh = gl.createShader(type)
                gl.shaderSource(sh, src)
                gl.compileShader(sh)
                if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                    gl.deleteShader(sh)
                    return null
                }
                return sh
            }
  
            const vs = compile(gl.VERTEX_SHADER, VERT_SHADER)
            const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER)
            const prog = vs && fs ? gl.createProgram() : null
            if (!prog) return null
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.linkProgram(prog)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  
            gl.useProgram(prog)
            const buf = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
                gl.STATIC_DRAW
            )
            const aPos = gl.getAttribLocation(prog, "aPos")
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
  
            const lutTex = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, lutTex)
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, LUT_SIZE, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, lut)
  
            const uRes = gl.getUniformLocation(prog, "uRes")
            const uTopDepth = gl.getUniformLocation(prog, "uTopDepth")
            const uBottomDepth = gl.getUniformLocation(prog, "uBottomDepth")
            gl.uniform1i(gl.getUniformLocation(prog, "uLut"), 0)
            gl.uniform1f(gl.getUniformLocation(prog, "uTop"), SR_TOP)
            gl.uniform1f(gl.getUniformLocation(prog, "uSpan"), SR_SPAN)
  
            const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
            const limit = Math.min(dims[0], dims[1], 4096)
            let W = 0
            let lastW = 0
            let lastH = 0
  
            const resize = (force) => {
                const vw = window.innerWidth || 1280
                if (!force && W > 0 && Math.abs(vw - lastW) < 2 && Math.abs(viewH - lastH) < 2) return false
                lastW = vw
                lastH = viewH
                const dpr = Math.min(window.devicePixelRatio || 1, touch ? TOUCH_MAX_DPR : 2)
                const w = vw * dpr
                const h = viewH * SR_SPAN * dpr
                const k = Math.min(1, limit / Math.max(w, h))
                W = Math.max(2, Math.round(w * k))
                const H = Math.max(2, Math.round(h * k))
                canvas.width = W
                canvas.height = H
                gl.viewport(0, 0, W, H)
                gl.uniform2f(uRes, W, H)
                return true
            }
  
            const onLost = (e) => e.preventDefault()
            const onRestored = () => {
                if (!disposed) setEpoch((n) => n + 1)
            }
            canvas.addEventListener("webglcontextlost", onLost)
            canvas.addEventListener("webglcontextrestored", onRestored)
  
            return {
                resize,
                paint(topDepth, bottomDepth) {
                    gl.uniform1f(uTopDepth, topDepth)
                    gl.uniform1f(uBottomDepth, bottomDepth)
                    gl.drawArrays(gl.TRIANGLES, 0, 6)
                },
                destroy() {
                    canvas.removeEventListener("webglcontextlost", onLost)
                    canvas.removeEventListener("webglcontextrestored", onRestored)
                    gl.deleteTexture(lutTex)
                    gl.deleteBuffer(buf)
                    gl.deleteProgram(prog)
                    gl.deleteShader(vs)
                    gl.deleteShader(fs)
                },
            }
        }
  
        // ------------------------------------------------------------ 2D fallback layer
        const create2dLayer = () => {
            let ctx = null
            try {
                ctx = canvas.getContext("2d", { alpha: false })
            } catch {
                ctx = null
            }
            if (!ctx) return null
  
            const noise = new Float32Array(4096)
            for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * 2.4
  
            let img = null
            let arc = null
            let W = 0
            let H = 0
            let lastW = 0
            let lastH = 0
  
            const resize = (force) => {
                const vw = window.innerWidth || 1280
                if (!force && W > 0 && Math.abs(vw - lastW) < 2 && Math.abs(viewH - lastH) < 2) return false
                lastW = vw
                lastH = viewH
                const res = vw > 1200 ? 0.25 : RES
                W = Math.max(2, Math.round(vw * res))
                H = Math.max(2, Math.round(viewH * SR_SPAN * res))
                canvas.width = W
                canvas.height = H
                try {
                    img = ctx.createImageData(W, H)
                    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255
                } catch {
                    img = null
                }
                arc = new Float32Array(W)
                for (let x = 0; x < W; x++) {
                    const dx = x / (W - 1) - 0.5
                    arc[x] = 1 - 4 * dx * dx
                }
                return true
            }
  
            return {
                resize,
                paint(topDepth, bottomDepth) {
                    if (!img || !arc) return
                    const data = img.data
                    let i = 0
                    for (let y = 0; y < H; y++) {
                        const vb = SR_TOP + (y / H) * SR_SPAN
                        const w = clamp01((1.0 - vb) / 0.6)
                        const mix = w * w * (3 - 2 * w)
                        const depth = topDepth * mix + bottomDepth * (1 - mix)
                        for (let x = 0; x < W; x++) {
                            const vv = vb - depth * arc[x]
                            const k = vv <= 0 ? 0 : vv >= V_MAX ? LUT_SIZE - 1 : (vv * lutScale) | 0
                            const j = k * 3
                            const nv = vv / V_MAX
                            const ef =
                                nv <= 0.02 || nv >= 0.975
                                    ? 0
                                    : nv < 0.06
                                      ? (nv - 0.02) / 0.04
                                      : nv > 0.93
                                        ? (0.975 - nv) / 0.045
                                        : 1
                            const n = noise[i & 4095] * ef
                            const o = i * 4
                            data[o] = lut[j] + n
                            data[o + 1] = lut[j + 1] + n
                            data[o + 2] = lut[j + 2] + n
                            i++
                        }
                    }
                    ctx.putImageData(img, 0, 0)
                },
                destroy() {},
            }
        }
  
        const layer = createGlLayer() || create2dLayer()
        if (!layer) return
  
        // ------------------------------------------------------------ painting (slow part)
        // Only the subtle horizon "bend" depends on scroll in a way a transform can't express.
        // It changes slowly, so repainting it at ~30Hz is invisible and keeps GPU commits sparse.
        let drawnTop = NaN
        let drawnBottom = NaN
        let lastPaint = 0
        let pending = null
        let timer = 0
  
        const paintNow = (topDepth, bottomDepth) => {
            pending = null
            drawnTop = topDepth
            drawnBottom = bottomDepth
            lastPaint = performance.now()
            layer.paint(topDepth, bottomDepth)
        }
        const flush = () => {
            timer = 0
            if (pending) paintNow(pending[0], pending[1])
        }
        const requestPaint = (topDepth, bottomDepth) => {
            if (Math.abs(topDepth - drawnTop) < 0.0008 && Math.abs(bottomDepth - drawnBottom) < 0.0008) {
                pending = null
                return
            }
            const wait = BEND_REDRAW_MS - (performance.now() - lastPaint)
            if (wait <= 0) {
                paintNow(topDepth, bottomDepth)
                return
            }
            pending = [topDepth, bottomDepth]
            if (!timer) timer = setTimeout(flush, wait)
        }
  
        // ------------------------------------------------------------ per-frame (cheap part)
        const isNative = () => group.getAttribute("data-native") === "true"
  
        const render = (sv) => {
            const { shift, bottomDepth, topDepth } = computeParams(sv)
            if (!isNative()) {
                group.style.transform = `translate3d(0, ${((SR_TOP - shift) * viewH).toFixed(2)}px, 0)`
            }
            requestPaint(topDepth, bottomDepth)
            syncHeaderTone(shift)
        }
  
        const follower = createFollower(render, travel.get())
  
        layer.resize(true)
        render(travel.get())
  
        const unsubscribe = travel.on("change", (v) => {
            if (isNative()) render(v)
            else follower.set(v)
        })
  
        const onResize = () => {
            measureView()
            if (layer.resize(false)) {
                drawnTop = NaN
                lastPaint = 0
            }
            follower.jump(travel.get())
        }
        window.addEventListener("resize", onResize)
  
        return () => {
            disposed = true
            unsubscribe()
            follower.stop()
            clearTimeout(timer)
            window.removeEventListener("resize", onResize)
            layer.destroy()
        }
    }, [travel, epoch])
  
    return (
        <div className="relative w-full">
            <style>{SUNRISE_CSS}</style>
            <div
                ref={stageRef}
                className="sticky top-0 z-0 w-full h-[100lvh] overflow-hidden pointer-events-none bg-[var(--bg-dark)]"
            >
                <div ref={groupRef} className="sunrise-group" aria-hidden="true">
                    <div className="sunrise-dark" />
                    <canvas ref={canvasRef} className="sunrise-canvas" />
                    <div className="sunrise-light" />
                </div>
            </div>
            <div className="relative z-10 -mt-[100lvh]">{children}</div>
        </div>
    )
  }
  
  export default function Home() {
    const vp = useContext(ViewportContext)
    const navigate = useNavigate()
    const pageTransition = usePageTransition()
    const pageReady = usePageReady()
  
    const outletCtx = useOutletContext()
    const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  
    const transitionRef = useRef(null)
  
    useEffect(() => {
        if (window.location.hash) return
        window.scrollTo(0, 0)
    }, [])
  
    useEffect(() => {
        return whenIdle(() => {
            SERVICE_IMAGES.forEach((src) => {
                const img = new Image()
                img.decoding = "async"
                img.src = src
                img.decode?.().catch(() => {})
            })
        }, 1200)
    }, [])
  
    const [fontsReady, setFontsReady] = useState(
        () => typeof document === "undefined" || document.fonts?.status === "loaded"
    )
  
    useEffect(() => {
        if (fontsReady) return
        let active = true
        const done = () => active && setFontsReady(true)
        if (document.fonts?.ready) {
            document.fonts.ready.then(done)
        } else {
            done()
        }
        return () => {
            active = false
        }
    }, [fontsReady])
  
    const servicesHeadRef = useRef(null)
    const servicesImgBoxRef = useRef(null)
    const servicesCapRef = useRef(null)
    const servicesListRef = useRef(null)
    const servicesHeadInView = useInView(servicesHeadRef, SERVICES_VIEWPORT)
    const servicesListInView = useInView(servicesListRef, { ...SERVICES_VIEWPORT, amount: 0.4 })
    const [servicesHold, setServicesHold] = useState(false)
    const servicesRevealedRef = useRef(false)
    const servicesHeadActive = pageReady && servicesHeadInView && !servicesHold
    const servicesListActive = pageReady && servicesListInView && !servicesHold
    if (servicesHeadActive || servicesListActive) servicesRevealedRef.current = true
  
    useEffect(() => {
        let settleTimer = 0
        let hardStop = 0
        let listening = false
        const release = () => {
            window.removeEventListener("scroll", onScroll)
            listening = false
            clearTimeout(settleTimer)
            clearTimeout(hardStop)
            setServicesHold(false)
        }
        function onScroll() {
            clearTimeout(settleTimer)
            settleTimer = setTimeout(release, 160)
        }
        const onAnchor = (e) => {
            if (e.detail !== "#services") return
            if (servicesRevealedRef.current) return
            setServicesHold(true)
            if (!listening) {
                window.addEventListener("scroll", onScroll, { passive: true })
                listening = true
            }
            clearTimeout(settleTimer)
            clearTimeout(hardStop)
            settleTimer = setTimeout(release, 700)
            hardStop = setTimeout(release, 3000)
        }
        window.addEventListener("header-anchor", onAnchor)
        return () => {
            window.removeEventListener("header-anchor", onAnchor)
            window.removeEventListener("scroll", onScroll)
            clearTimeout(settleTimer)
            clearTimeout(hardStop)
        }
    }, [])
  
    const [activeIndex, setActiveIndex] = useState(0)
    const [hoveredRow, setHoveredRow] = useState(null)
  
    useLayoutEffect(() => {
        const list = servicesListRef.current
        if (!list) return
        if (vp.isDesktop) {
            list.style.removeProperty("--svc-row-h")
            list.removeAttribute("data-leaving")
            list.removeAttribute("data-cut")
            return
        }
        const supportsCut = !!window.CSS?.supports?.("animation-timeline: scroll()")
  
        let geo = null
        let lastRowH = ""
        let lastStuck = -2
        let lastPinned = null
        let lastLeaving = null
        let raf = 0
        let idleTimer = 0
  
        const measure = () => {
            const hs = Array.from(list.querySelectorAll(".svc-sticky-head"))
            const ps = Array.from(list.querySelectorAll(".svc-panel"))
            if (!hs.length || hs.length !== ps.length || hs[0].offsetHeight <= 0) return
  
            const rowH = hs[0].getBoundingClientRect().height
            const top0 = parseFloat(getComputedStyle(hs[0]).top) || 0
            const sy = window.scrollY
            const rects = ps.map((el) => el.getBoundingClientRect())
            const rowHStr = `${rowH}px`
            if (rowHStr !== lastRowH) {
                lastRowH = rowHStr
                list.style.setProperty("--svc-row-h", rowHStr)
            }
            geo = {
                heads: hs,
                rowH,
                top0,
                panelTops: rects.map((r) => r.top + sy),
                lastPanelBottom: rects[rects.length - 1].bottom + sy,
            }
            lastStuck = -2
            lastPinned = null
            lastLeaving = null
  
            if (supportsCut) {
                // Panel i is cut off at the bottom edge of the i + 1 headers stacked above it. Its clip
                // runs from the scroll offset where its top meets that edge until its bottom does.
                Array.from(list.querySelectorAll(".svc-cut")).forEach((el, i) => {
                    const r = el.getBoundingClientRect()
                    const edge = top0 + (i + 1) * rowH
                    el.style.setProperty("--cut-s0", `${Math.max(0, r.top + sy - edge)}px`)
                    el.style.setProperty("--cut-len", `${Math.max(1, r.height)}px`)
                })
                list.setAttribute("data-cut", "ready")
            }
        }
  
        const frame = () => {
            raf = 0
            if (!geo) return
            const { heads, rowH, top0, panelTops, lastPanelBottom } = geo
            const sy = window.scrollY
            let stuck = 0
            for (let i = 0; i < heads.length; i++) {
                if (panelTops[i] - rowH - sy <= top0 + i * rowH + 1) stuck = i
            }
  
            const pinned = panelTops[0] - sy <= top0 + 72
            if (pinned !== lastPinned) {
                lastPinned = pinned
                heads[0].setAttribute("data-pinned", pinned ? "true" : "false")
            }
  
            const leaving = lastPanelBottom - sy <= top0 + heads.length * rowH + 40
            if (leaving !== lastLeaving) {
                lastLeaving = leaving
                list.setAttribute("data-leaving", leaving ? "true" : "false")
            }
  
            if (stuck === lastStuck) return
            lastStuck = stuck
            for (let i = 0; i < heads.length; i++) heads[i].setAttribute("data-stuck", i === stuck ? "true" : "false")
        }
  
        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(frame)
        }
        const remeasure = () => {
            measure()
            schedule()
        }
        const onScroll = () => {
            schedule()
            clearTimeout(idleTimer)
            idleTimer = setTimeout(remeasure, 200)
        }
  
        measure()
        frame()
        const ro = new ResizeObserver(remeasure)
        ro.observe(list)
        document.fonts?.ready?.then(remeasure)
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", remeasure)
        window.addEventListener("load", remeasure)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            clearTimeout(idleTimer)
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", remeasure)
            window.removeEventListener("load", remeasure)
            ro.disconnect()
            list.removeAttribute("data-cut")
        }
    }, [vp.isDesktop, pageReady])
  
    useLayoutEffect(() => {
        const list = servicesListRef.current
        if (!list || !vp.isDesktop) return
  
        let raf = 0
        const cells = () => Array.from(list.querySelectorAll(".svc-keywords-cell"))
  
        const align = () => {
            const intro = document.querySelector("#services .svc-intro")
            const cs = cells()
            if (!intro || !cs.length) return
            const target = intro.getBoundingClientRect().left
            if (!target) return
            const pads = cs.map((c) => Math.max(0, Math.round(target - c.getBoundingClientRect().left)))
            cs.forEach((c, i) => {
                c.style.paddingLeft = `${pads[i]}px`
            })
  
            const listLeft = list.getBoundingClientRect().left
            let textRight = 0
            list.querySelectorAll(".svc-keywords-cell .svc-keywords").forEach((p) => {
                const range = document.createRange()
                range.selectNodeContents(p)
                Array.from(range.getClientRects()).forEach((r) => {
                    if (r.width) textRight = Math.max(textRight, r.right)
                })
            })
            if (textRight > listLeft) list.style.setProperty("--svc-line-w", `${Math.ceil(textRight - listLeft)}px`)
        }
        const schedule = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(align)
        }
  
        align()
  
        const settleTimers = [350, 900, 1800, 3000].map((ms) => setTimeout(align, ms))
        const ro = new ResizeObserver(schedule)
        ro.observe(list)
  
        const introEl = document.querySelector("#services .svc-intro")
  
        if (introEl) ro.observe(introEl)
        ro.observe(document.documentElement)
        window.addEventListener("resize", schedule)
        document.fonts?.ready?.then(schedule)
  
        return () => {
            cancelAnimationFrame(raf)
            settleTimers.forEach(clearTimeout)
  
            ro.disconnect()
            window.removeEventListener("resize", schedule)
            cells().forEach((c) => c.style.removeProperty("padding-left"))
            list.style.removeProperty("--svc-line-w")
        }
    }, [vp.isDesktop, pageReady])
  
    useLayoutEffect(() => {
        if (!vp.isDesktop) return
        let raf = 0
        const intro = () => document.querySelector("#services .svc-intro")
  
        const align = () => {
            const work = document.querySelector("header nav a")
            const head = servicesHeadRef.current
            const p = intro()
            if (!work || !head || !p) return
            const target = work.getBoundingClientRect().left
            if (!target) return
            const aboutLink = document.querySelector("header nav a:nth-child(3)")
            const aboutLeft = aboutLink ? aboutLink.getBoundingClientRect().left : 0
            const imgBox = servicesImgBoxRef.current
            const capCol = servicesCapRef.current?.parentElement
            if (aboutLeft && imgBox) {
                // image box and caption column both start at the "About me" nav link and end at the page margin
                const edge = head.getBoundingClientRect().right
                const colW = Math.round(edge - aboutLeft)
                if (colW > 200) {
                    imgBox.style.width = `${colW}px`
                    if (capCol) capCol.style.width = `${colW}px`
                }
            }
            const w = p.offsetWidth
            const box = servicesImgBoxRef.current
            const boxW = box ? box.offsetWidth : 0
            const gap = parseFloat(getComputedStyle(head).columnGap) || 0
            const headRect = head.getBoundingClientRect()
            const headTop = stableTop(head, head.parentElement)
            const right = Math.max(0, Math.round(headRect.right - target - w - boxW - (box ? gap : 0)))
            p.style.marginRight = `${right}px`
  
            // Caption block: top lines up with the Digital Design description ("Websites, landing pages…").
            const cap = servicesCapRef.current
            const row2 = servicesListRef.current?.children?.[1]
            const stop = head.parentElement
            if (cap && row2 && cap.parentElement) {
                const kw = row2.querySelector(".svc-keywords")
                // transform-free tops: the row reveal, hover nudge and description fade must not move the target
                const targetTop = stableTop(kw || row2, stop)
                const dy = targetTop - stableTop(cap.parentElement, stop)
                if (dy >= 0) cap.style.marginTop = `${Math.round(dy)}px`
            }
  
            const title = head.querySelector("h2")
            if (box && title) {
                // Match the title's real glyphs: cap-top to baseline of "SERVICES".
                let top = null
                let height = null
                try {
                    const cs = getComputedStyle(title)
                    const ctx = document.createElement("canvas").getContext("2d")
                    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
                    const m = ctx.measureText("H")
                    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT)
                    let rect = null
                    let rectShift = 0
                    while (walker.nextNode()) {
                        if (!walker.currentNode.textContent.trim()) continue
                        const r = document.createRange()
                        r.selectNodeContents(walker.currentNode)
                        const rr = Array.from(r.getClientRects()).find((x) => x.width > 0 && x.height > 0)
                        if (rr) {
                            rect = rr
                            // words slide in through a mask; measure where they rest, not where they are now
                            rectShift = translateYOf(walker.currentNode.parentElement, head.parentElement)
                            break
                        }
                    }
                    if (rect && m.actualBoundingBoxAscent > 0) {
                        const baseline = rect.top - rectShift + m.fontBoundingBoxAscent
                        height = m.actualBoundingBoxAscent
                        top = baseline - height - headTop
                    }
                } catch (e) {}
                if (top === null) {
                    const tr = title.getBoundingClientRect()
                    height = tr.height
                    top = stableTop(title, head.parentElement) - headTop
                }
                // Top edge = cap-top of "SERVICES"; bottom edge = the top divider line of the services list.
                const list = servicesListRef.current
                const absTop = headTop + Math.max(0, top)
                let h = height
                if (list) {
                    const reach = stableTop(list, head.parentElement) - absTop
                    if (reach > 0) h = reach
                }
                // trim the image a little shorter than the full cap-top to divider span
                if (h > 0) h *= 0.88
                if (h > 0) {
                    box.style.height = `${Math.round(h)}px`
                    // negative bottom margin keeps the tall image from stretching the heading row
                    box.style.marginBottom = `${-Math.round(h)}px`
                }
                box.style.marginTop = `${Math.max(0, Math.round(top))}px`
            }
        }
        const schedule = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(align)
        }
  
        align()
        const settleTimers = [350, 900, 1800, 3000].map((ms) => setTimeout(align, ms))
        const ro = new ResizeObserver(schedule)
        ro.observe(document.documentElement)
        const p0 = intro()
        if (p0) ro.observe(p0)
        const t0 = servicesHeadRef.current?.querySelector("h2")
        if (t0) ro.observe(t0)
        if (servicesListRef.current) ro.observe(servicesListRef.current)
        window.addEventListener("resize", schedule)
        document.fonts?.ready?.then(schedule)
  
        return () => {
            cancelAnimationFrame(raf)
            settleTimers.forEach(clearTimeout)
            ro.disconnect()
            window.removeEventListener("resize", schedule)
            intro()?.style.removeProperty("margin-right")
            servicesImgBoxRef.current?.style.removeProperty("height")
            servicesImgBoxRef.current?.style.removeProperty("margin-top")
            servicesImgBoxRef.current?.style.removeProperty("margin-bottom")
            servicesCapRef.current?.style.removeProperty("margin-top")
            servicesImgBoxRef.current?.style.removeProperty("width")
            servicesCapRef.current?.parentElement?.style.removeProperty("width")
        }
    }, [vp.isDesktop, pageReady, fontsReady, servicesHeadActive, servicesListActive])
  
    useLayoutEffect(() => {
        const section = workSectionRef.current
        if (!section || !vp.isDesktop) return
        let raf = 0
  
        const align = () => {
            const about = document.querySelector("header nav a:nth-child(3)")
            const main = section.querySelector("main")
            if (!about || !main) return
            const target = about.getBoundingClientRect().left
            if (!target) return
            const width = Math.round(main.getBoundingClientRect().right - target)
            if (width > 200) section.style.setProperty("--hero-copy-w", `${width}px`)
        }
        const schedule = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(align)
        }
  
        align()
        const ro = new ResizeObserver(schedule)
        ro.observe(document.documentElement)
        window.addEventListener("resize", schedule)
        document.fonts?.ready?.then(schedule)
  
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("resize", schedule)
            section.style.removeProperty("--hero-copy-w")
        }
    }, [vp.isDesktop, pageReady])
  
    useLayoutEffect(() => {
        if (!vp.isDesktop) return
        let raf = 0
        const blocks = () => Array.from(document.querySelectorAll("[data-exp-copy]"))
  
        const align = () => {
            const about = document.querySelector("header nav a:nth-child(3)")
            const bs = blocks()
            if (!about || !bs.length) return
            const target = about.getBoundingClientRect().left
            if (!target) return
            const colW = window.matchMedia("(min-width: 1280px)").matches ? 380 : 300
            const pads = bs.map((b) => {
                const row = b.closest("li")
                if (!row) return 0
                return Math.max(0, Math.round(target - (row.getBoundingClientRect().right - colW)))
            })
            bs.forEach((b, i) => {
                b.style.paddingLeft = `${pads[i]}px`
            })
        }
        const schedule = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(align)
        }
  
        align()
        const ro = new ResizeObserver(schedule)
        ro.observe(document.documentElement)
        window.addEventListener("resize", schedule)
        document.fonts?.ready?.then(schedule)
  
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("resize", schedule)
            blocks().forEach((b) => b.style.removeProperty("padding-left"))
        }
    }, [vp.isDesktop, pageReady])
  
    const [activeExpertise, setActiveExpertise] = useState(null)
    const expertiseRatios = useExpertiseRatios()
    const [hoveredExpertise, setHoveredExpertise] = useState(null)
    const cursorX = useMotionValue(0)
    const cursorY = useMotionValue(0)
  
    const expertiseRefs = useRef([])
    const scrollIndexRef = useRef(null)
    const lastPointerRef = useRef({ x: -1, y: -1 })
    const pointerRef = useRef(null)
    const hoverRef = useRef(null)
    const isDesktopRef = useRef(vp.isDesktop)
    isDesktopRef.current = vp.isDesktop
  
    const tickerViewportRef = useRef(null)
    const tickerRef = useRef(null)
    const tickerWrapRef = useRef(null)
    const workSectionRef = useRef(null)
    const tickerEngine = useRef(null)
    const [tickerReady, setTickerReady] = useState(false)
    const pageReadyRef = useRef(pageReady)
    pageReadyRef.current = pageReady
  
    useEffect(() => {
        if (!tickerViewportRef.current || !tickerRef.current) return
  
        tickerEngine.current = createTicker(tickerViewportRef.current, tickerRef.current, {
            ...TICKER_MOTION,
            ...(vp.isMobile ? TICKER_MOTION_MOBILE : null),
            startPaused: true,
        })
        if (pageReadyRef.current) tickerEngine.current.start()
        setTickerReady(true)
        return () => {
            tickerEngine.current?.destroy()
            tickerEngine.current = null
        }
    }, [vp.isMobile])
  
    useEffect(() => {
        if (!pageReady) return
        const id = setTimeout(() => tickerEngine.current?.start(), TICKER_START_DELAY)
        return () => clearTimeout(id)
    }, [pageReady])
  
    useEffect(() => {
        const wrap = tickerWrapRef.current
        if (wrap) wrap.style.transform = ""
    }, [vp.isMobile])
  
    useEffect(() => {
        if (!tickerReady) return
        const engine = tickerEngine.current
        const track = tickerRef.current
        const viewport = tickerViewportRef.current
        if (!engine || !track || !viewport) return
  
        const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const touch = vp.isMobile || !!window.matchMedia?.("(pointer: coarse)").matches
        const emphasis = vp.isMobile
        const fx = !reduce
  
        const wrap = tickerWrapRef.current
        if (!fx && !emphasis) return
  
        const Z = touch ? { ...TICKER_ZOOM, ...TICKER_ZOOM_TOUCH } : TICKER_ZOOM
        const baseSpeed = vp.isMobile ? TICKER_MOTION_MOBILE.baseSpeed : TICKER_MOTION.baseSpeed
        const driftDeadband = baseSpeed * Z.driftMargin
        const clamp = gsap.utils.clamp(-1, 1)
        const clamp01 = gsap.utils.clamp(0, 1)
  
        let cards = []
        const measure = () => {
            const slides = Array.from(track.children)
            const padR = slides[0] ? parseFloat(getComputedStyle(slides[0]).paddingRight) || 0 : 0
            cards = slides.map((slide) => {
                const el = slide.querySelector("[data-zoom-group]")
                const card = el?.querySelector("[data-zoom-card]")
                const img = el?.querySelector("[data-parallax]")
                if (el && card) {
                    el.style.setProperty("--oy", `${card.offsetTop + card.offsetHeight / 2}px`)
                }
                return {
                    slide,
                    el,
                    card,
                    img,
                    padR,
                    setImg: img ? gsap.quickSetter(img, "x", "px") : null,
                    imgX: 0,
                    dx: NaN,
                    zs: NaN,
                    near: null,
                    act: -1,
                }
            })
        }
        measure()
  
        const mo = new MutationObserver(measure)
        mo.observe(track, { childList: true })
        const ro = new ResizeObserver(() => {
            measure()
        })
        ro.observe(viewport)
        ro.observe(track)
        if (wrap) ro.observe(wrap)
        document.fonts?.ready?.then(measure)
  
        const s = { amt: 0, rot: 0 }
        const dAmt = { v: 0 }
        const dRot = { v: 0 }
        let vel = 0
        let zooming = false
        let lastTilt = ""
        let lastAmt = -1
  
        track.style.setProperty("--zoom-persp", `${Z.perspective}px`)
        if (emphasis) track.setAttribute("data-emphasis", "true")
  
        const onTick = (_time, deltaMs) => {
            const st = engine.getState()
            const n = cards.length
            if (!st.visible || !st.vpW || !n || st.lefts.length !== n) return
            const dt = Math.min(Math.max(deltaMs, 1) / 1000, 0.064)
  
            vel += (st.vel - vel) * (1 - Math.exp(-Z.velSmoothing * dt))
            const mag = Math.max(0, Math.abs(vel) - driftDeadband)
            const speedNorm = fx ? Math.min(1, mag / Z.fullSpeed) : 0
  
            const rotTarget = (vel < 0 ? -1 : 1) * speedNorm * Z.tiltMax
            const upTime = Z.settle * 0.3
            const downTime = Z.settle * 0.55
            s.amt = smoothDamp(s.amt, speedNorm, dAmt, speedNorm > s.amt ? upTime : downTime, dt)
            s.rot = smoothDamp(s.rot, rotTarget, dRot, downTime * 1.15, dt)
            if (speedNorm === 0 && Math.abs(s.amt) < 0.0005 && Math.abs(dAmt.v) < 0.0005) {
                s.amt = 0
                dAmt.v = 0
            }
            if (rotTarget === 0 && Math.abs(s.rot) < 0.005 && Math.abs(dRot.v) < 0.005) {
                s.rot = 0
                dRot.v = 0
            }
  
            const amt = clamp01(s.amt)
            const rot = s.rot
  
            if (emphasis) {
                const a = Math.round(amt * 100) / 100
                if (a !== lastAmt) {
                    lastAmt = a
                    track.style.setProperty("--amt", a.toFixed(2))
                }
            }
            const active = fx && (speedNorm > 0 || amt > 0.0005 || Math.abs(rot) > 0.01)
  
            if (active) {
                if (!zooming) {
                    zooming = true
                    track.setAttribute("data-zooming", "true")
                }
                const t = `${rot.toFixed(3)}deg`
                if (t !== lastTilt) {
                    lastTilt = t
                    track.style.setProperty("--tilt", t)
                }
            } else if (zooming) {
                zooming = false
                lastTilt = ""
                track.removeAttribute("data-zooming")
                track.style.removeProperty("--tilt")
                for (let i = 0; i < n; i++) {
                    const c = cards[i]
                    if (c.el) {
                        c.el.style.removeProperty("--dx")
                        c.el.style.removeProperty("--zs")
                    }
                    c.dx = NaN
                    c.zs = NaN
                }
            }
  
            const vCenter = st.vpW * 0.5
            const pitch = n > 1 ? st.lefts[1] - st.lefts[0] : st.widths[0] || 1
  
            for (let i = 0; i < n; i++) {
                const c = cards[i]
                const w = st.widths[i] - c.padR
                const left = st.lefts[i] + st.x
  
                const near = left + w > -pitch && left < st.vpW + pitch
                if (near !== c.near) {
                    c.near = near
                    c.slide.setAttribute("data-near", near ? "true" : "false")
                    if (!near && c.el) {
                        c.el.style.removeProperty("--dx")
                        c.el.style.removeProperty("--zs")
                        c.dx = NaN
                        c.zs = NaN
                    }
                }
                if (!near) continue
  
                const off = left + w * 0.5 - vCenter
  
                if (active && c.el) {
                    const tx = off * Z.spread * amt
                    if (Number.isNaN(c.dx) || Math.abs(tx - c.dx) > 0.05) {
                        c.dx = tx
                        c.el.style.setProperty("--dx", `${tx.toFixed(2)}px`)
                    }
  
                    const zs = 1 - amt * (1 - Z.minScale)
                    if (Number.isNaN(c.zs) || Math.abs(zs - c.zs) > 0.0004) {
                        c.zs = zs
                        c.el.style.setProperty("--zs", zs.toFixed(4))
                    }
                }
  
                if (fx && c.setImg && Z.parallax) {
                    const u = clamp(off / (st.vpW * 0.5))
                    const lim = w * 0.06
                    const px = Math.max(-lim, Math.min(lim, -u * Z.parallax * w))
                    if (Math.abs(px - c.imgX) > 0.2) {
                        c.imgX = px
                        c.setImg(px)
                    }
                }
  
                if (emphasis) {
                    const a = clamp01(1 - Math.abs(off) / (pitch * 1.2))
                    const e = a * a * a * (a * (a * 6 - 15) + 10)
                    if (Math.abs(e - c.act) > 0.002) {
                        c.act = e
                        c.slide.style.setProperty("--act", e.toFixed(3))
                    }
                }
            }
        }
  
        gsap.ticker.add(onTick)
  
        return () => {
            gsap.ticker.remove(onTick)
            mo.disconnect()
            ro.disconnect()
            track.removeAttribute("data-zooming")
            track.removeAttribute("data-emphasis")
            ;["--tilt", "--zoom-persp", "--amt"].forEach((v) => track.style.removeProperty(v))
            cards.forEach(({ slide, el, img }) => {
                slide.removeAttribute("data-near")
                slide.style.removeProperty("--act")
                if (el) {
                    el.style.removeProperty("--dx")
                    el.style.removeProperty("--zs")
                    el.style.removeProperty("--oy")
                }
                if (img) gsap.set(img, { clearProps: "transform" })
            })
        }
    }, [vp.isMobile, tickerReady])
  
    useEffect(() => {
        const unique = Array.from(new Set(LOOPING_IMAGES))
        const warm = (src, priority) => {
            const img = new Image()
            img.decoding = "async"
            if ("fetchPriority" in img) img.fetchPriority = priority
            img.src = src
            img.decode?.().catch(() => {})
        }
        unique.slice(0, TICKER_PRIORITY_COUNT).forEach((src) => warm(src, "high"))
        const rest = unique.slice(TICKER_PRIORITY_COUNT)
        if (!rest.length) return
        return whenIdle(() => rest.forEach((src) => warm(src, "low")), 2000)
    }, [])
  
    useEffect(() => {
        if (!vp.isMobile) {
            const cancel = whenIdle(() => warmAllHeroes(), 2500)
            return () => cancel()
        }
    }, [vp.isMobile])
  
    useEffect(() => {
        let frame = null
        let rowOffsets = []
  
        const measure = () => {
            rowOffsets = expertiseRefs.current.map((node) =>
                node ? node.getBoundingClientRect().top + window.scrollY : 0
            )
        }
  
        const update = () => {
            frame = null
            if (!isDesktopRef.current) return
            const rows = expertiseRefs.current
            if (!rows.some(Boolean)) return
  
            const mid = window.scrollY + (window.innerHeight || 800) * 0.5
            let idx = null
  
            rowOffsets.forEach((top, i) => {
                if (top <= mid) idx = i
            })
  
            scrollIndexRef.current = idx
  
            let under = null
            const p = pointerRef.current
            if (isDesktopRef.current && p) {
                rows.forEach((node, i) => {
                    if (!node) return
                    const r = node.getBoundingClientRect()
                    if (p.y >= r.top && p.y < r.bottom && p.x >= r.left && p.x <= r.right) under = i
                })
            }
            if (under !== hoverRef.current) {
                hoverRef.current = under
                setHoveredExpertise(under)
            }
            setActiveExpertise(under !== null ? under : idx)
        }
        const onScroll = () => {
            if (frame === null) frame = requestAnimationFrame(update)
        }
  
        measure()
        update()
        const ro = new ResizeObserver(() => {
            measure()
            if (frame === null) frame = requestAnimationFrame(update)
        })
        ro.observe(document.documentElement)
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", measure)
        window.addEventListener("resize", onScroll)
        return () => {
            if (frame !== null) cancelAnimationFrame(frame)
            ro.disconnect()
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", measure)
            window.removeEventListener("resize", onScroll)
        }
    }, [])
  
    useEffect(() => {
        if (vp.isDesktop) return
  
        hoverRef.current = null
        setHoveredExpertise(null)
        setActiveExpertise(null)
  
        const rows = expertiseRefs.current
        const imgs = EXPERTISE_DATA.map((_, i) => rows[i]?.querySelector("[data-exp-img]") || null)
        const texts = EXPERTISE_DATA.map((_, i) =>
            Array.from(rows[i]?.querySelectorAll("[data-exp-text]") || [])
        )
        const toolsLists = EXPERTISE_DATA.map((_, i) => rows[i]?.querySelector("[data-exp-tools]") || null)
  
        const allTexts = texts.flat()
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const origin = vp.isMobile ? "100% 100%" : "50% 50%"
  
        imgs.forEach((img, i) => {
            if (!img) return
            const d = EXPERTISE_DATA[i]
            gsap.set(img, {
                opacity: 0,
                scale: d.scale * 0.8,
                rotation: d.tilt - 8,
                y: 12,
                transformOrigin: origin,
                force3D: true,
            })
        })
        if (allTexts.length) gsap.set(allTexts, { opacity: 0.42, force3D: true })
        toolsLists.forEach((tools) => {
            if (tools) gsap.set(tools, { opacity: 0.42, force3D: true })
        })
  
        let rowTops = []
        const measureTops = () => {
            rowTops = rows.map((node) =>
                node ? node.getBoundingClientRect().top + window.scrollY : Infinity
            )
        }
  
        let current
        let raf = 0
  
        const apply = (idx) => {
            if (idx === current) return
            current = idx
            EXPERTISE_DATA.forEach((d, i) => {
                const active = i === idx
                const img = imgs[i]
                if (img) {
                    gsap.to(
                        img,
                        active
                            ? {
                                  opacity: 1,
                                  scale: d.scale,
                                  rotation: d.tilt,
                                  y: 0,
                                  duration: reduce ? 0 : 0.8,
                                  ease: "expo.out",
                                  overwrite: "auto",
                              }
                            : {
                                  opacity: 0,
                                  scale: d.scale * 0.8,
                                  rotation: d.tilt - 8,
                                  y: 12,
                                  duration: reduce ? 0 : 0.4,
                                  ease: "power2.out",
                                  overwrite: "auto",
                              }
                    )
                }
                if (texts[i].length) {
                    gsap.to(texts[i], {
                        opacity: active ? 1 : 0.42,
                        duration: reduce ? 0 : 0.35,
                        ease: "power3.out",
                        overwrite: "auto",
                    })
                }
                if (toolsLists[i]) {
                    gsap.to(toolsLists[i], {
                        opacity: active ? 0.9 : 0.38,
                        duration: reduce ? 0 : 0.35,
                        ease: "power3.out",
                        overwrite: "auto",
                    })
                }
            })
        }
  
        const evaluate = () => {
            raf = 0
            const triggerLine = window.scrollY + (window.innerHeight || 800) * 0.65
            let idx = null
            for (let i = 0; i < rowTops.length; i++) {
                if (rowTops[i] <= triggerLine) idx = i
            }
            apply(idx)
        }
  
        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(evaluate)
        }
  
        measureTops()
        evaluate()
  
        const ro = new ResizeObserver(() => {
            measureTops()
            schedule()
        })
        ro.observe(document.documentElement)
  
        window.addEventListener("scroll", schedule, { passive: true })
        window.addEventListener("resize", measureTops)
        window.addEventListener("resize", schedule)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("scroll", schedule)
            window.removeEventListener("resize", measureTops)
            window.removeEventListener("resize", schedule)
            gsap.killTweensOf([...imgs.filter(Boolean), ...allTexts, ...toolsLists.filter(Boolean)])
            gsap.set(imgs.filter(Boolean), { clearProps: "transform,transformOrigin" })
            gsap.set([...allTexts, ...toolsLists.filter(Boolean)], { clearProps: "opacity,transform" })
        }
    }, [vp.isDesktop, vp.isMobile])
  
    const handleRowPress = (index) => {
        if (vp.isDesktop) selectService(index)
    }
  
    const selectService = (index) => {
        if (index === activeIndex) return
        setActiveIndex(index)
    }
  
    const handleProjectClickRef = useRef(null)
    const handleProjectClick = (projectName) => {
        const lower = projectName.toLowerCase()
        const dest = lower.includes("weyra")
            ? "/work/weyra"
            : lower.includes("origen")
              ? "/work/origen"
              : lower.includes("yimaj")
                ? "/work/yimaj"
                : lower.includes("zhongshan")
                  ? "/work/zhongshan"
                  : null
        if (!dest) return
  
        prefetchHero(heroSlugFor(projectName))
  
        if (pageTransition?.triggerTransition) {
            pageTransition.triggerTransition(dest)
        } else {
            navigate(dest)
        }
    }
    handleProjectClickRef.current = handleProjectClick
  
    return (
        <div data-page-transition="" className="relative w-full">
            <section
                id="work"
                ref={workSectionRef}
                className={`relative flex flex-col w-full pt-[144px] bg-[var(--bg-dark)] ${
                    vp.isMobile ? "" : "justify-between min-h-[max(100svh,640px)]"
                }`}
            >
                <div className="flex flex-col flex-1 w-full px-[var(--page-pad)] max-md:pt-0 pt-[32px] lg:pt-[40px] pb-[24px] md:pb-[16px] m-0">
                    <div className="flex flex-col w-full mt-auto max-md:gap-[96px] gap-[48px] md:gap-[64px] m-0">
                        <main className="flex flex-col items-start gap-[72px] w-full m-0 md:-translate-y-[64px] lg:flex-row lg:items-end lg:justify-between lg:gap-0">
                            <MaskRevealText
                                as="h1"
                                mode="lines"
                                linesFrom="md"
                                active={pageReady}
                                delay={0.1}
                                stagger={0.08}
                                className="H2 hero-title rwd-balance max-md:![text-wrap:pretty] max-md:!text-[40px] max-md:!leading-[1.1] sm:max-md:portrait:text-left sm:max-md:portrait:!text-[56px] lg:!text-[64px] !text-white m-0 p-0 uppercase"
                            >
                                {"What if your brand\nmatched what you\nhave built?"}
                            </MaskRevealText>
  
                            <MaskRevealText
                                as="div"
                                mode="lines"
                                linesFrom="md"
                                active={pageReady}
                                delay={0.3}
                                stagger={0.06}
                                className="svc-size Body rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-[var(--text-dark-muted)] max-w-[440px] sm:max-md:portrait:max-w-[560px] sm:max-md:portrait:self-start lg:max-w-none lg:w-[var(--hero-copy-w,300px)] lg:shrink-0 m-0 p-0 text-left self-end"
                            >
                                {"I close the gap between how good your\nbusiness is and how it looks. Through\nthoughtful branding, design, and visual\nstorytelling, I help businesses reflect\ntheir true value, build trust, and make\na lasting impression."}
                            </MaskRevealText>
                        </main>
  
                        <div className="flex flex-col items-start gap-1 w-full m-0 -translate-y-[12px] md:-translate-y-[16px] md:flex-row md:justify-between md:items-center md:gap-0">
                            <MaskRevealText
                                mode="words"
                                active={pageReady}
                                delay={0.4}
                                className="Nav sm:max-md:portrait:!text-[22px] uppercase !text-[var(--text-dark-muted)]"
                            >
                                Selected Work
                            </MaskRevealText>
  
                            <div className="hidden md:block lg:w-[var(--hero-copy-w,300px)] lg:shrink-0">
                                <MaskRevealText
                                    mode="words"
                                    active={pageReady}
                                    delay={0.45}
                                    className="Nav sm:max-md:portrait:!text-[22px] uppercase !text-[var(--text-dark-muted)] text-right lg:text-left"
                                >
                                    Based in Addis Ababa, Ethiopia
                                </MaskRevealText>
                            </div>
                        </div>
                    </div>
                </div>
  
                {(
                    <div
                        ref={tickerWrapRef}
                        className="relative z-20 flex-shrink-0 w-full pb-[20px] max-md:pb-[var(--page-pad-y)] m-0 overflow-x-clip overflow-y-visible will-change-transform"
                    >
                        <div
                            ref={tickerViewportRef}
                            role="region"
                            aria-roledescription="carousel"
                            aria-label="Selected work"
                            onClickCapture={(e) => {
                                if (tickerEngine.current?.consumeDrag()) {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }
                            }}
                            style={{ touchAction: "pan-y" }}
                            className="w-full overflow-x-clip overflow-y-visible select-none overscroll-x-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:[&>div]:pointer-events-none"
                        >
                            <div ref={tickerRef} className="flex w-full">
                                {Array.from({ length: TICKER_MOTION.copies }, () => LOOPING_IMAGES).flat().map((src, idx) => {
                                    const proj = WORK_PROJECTS.find((p) => p.image === src)
                                    return (
                                        <TickerSlide
                                            key={idx}
                                            src={src}
                                            project={proj}
                                            ready={tickerReady && pageReady && fontsReady}
                                            isClone={idx >= LOOPING_IMAGES.length}
                                            fetchPriority={idx < TICKER_PRIORITY_COUNT ? "high" : undefined}
                                            onClick={() => proj && handleProjectClickRef.current?.(proj.name)}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </section>
  
            <style>{`
                .svc-sticky-head .svc-num, .svc-sticky-head .svc-title-text { transition: color 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
                .svc-sticky-head[data-stuck="true"] .svc-num, .svc-sticky-head[data-stuck="true"] .svc-title-text { color: #fff !important; }
                .svc-sticky-head[data-pinned]::before {
                    content: ""; position: absolute; left: 0; right: 0; bottom: 100%; pointer-events: none; opacity: 0;
                    height: calc(var(--svc-stick-top, 76px) + 200px);
                    background: var(--svc-head-bg, var(--bg-dark, #050505));
                }
                .svc-sticky-head[data-pinned="true"]::before { opacity: 1; }
                .svc-sticky-head { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
                .svc-sticky-head[data-pinned]::before { transition: none; }
                .svc-panel { transition: opacity 0.15s ease 0.12s; }
                [data-leaving="true"] .svc-panel { opacity: 0; transition: opacity 0.15s ease; }
                [data-leaving="true"] .svc-sticky-head {
                    background-color: transparent !important; box-shadow: none !important;
                    transition: background-color 0.22s ease 0.14s, box-shadow 0.22s ease 0.14s;
                }
                [data-leaving="true"] .svc-sticky-head[data-pinned]::before {
                    opacity: 0 !important; transition: opacity 0.22s ease 0.14s;
                }
                .ticker-zoom-group { transform-origin: 50% var(--oy, 50%); }
                [data-near="true"] .ticker-zoom-group { transform: translateZ(0); will-change: transform; }
                [data-zooming="true"] [data-near="true"] .ticker-zoom-group {
                    transform: perspective(var(--zoom-persp, 1400px)) translate3d(var(--dx, 0px), 0, 0) rotateY(var(--tilt, 0deg)) scale(var(--zs, 1));
                    will-change: transform;
                }
                [data-emphasis="true"] [data-near="true"] .ticker-zoom-group {
                    transform: scale(calc(1 - (${TICKER_MOBILE.restDip} + ${TICKER_MOBILE.flickDip} * var(--amt, 0)) * (1 - var(--act, 1))));
                    will-change: transform;
                }
                [data-emphasis="true"][data-zooming="true"] [data-near="true"] .ticker-zoom-group {
                    transform: perspective(var(--zoom-persp, 1400px)) translate3d(var(--dx, 0px), 0, 0) rotateY(var(--tilt, 0deg)) scale(calc(var(--zs, 1) * (1 - (${TICKER_MOBILE.restDip} + ${TICKER_MOBILE.flickDip} * var(--amt, 0)) * (1 - var(--act, 1)))));
                }
                @media (prefers-reduced-motion: reduce) {
                    [data-emphasis="true"] [data-near="true"] .ticker-zoom-group { transform: none; will-change: auto; }
                }
                [data-emphasis="true"] .ticker-caption { opacity: calc(0.3 + 0.7 * var(--act, 1)); }
                .svc-par { position: absolute; left: 0; right: 0; top: -36px; bottom: -36px; will-change: transform; }
                @supports (animation-timeline: view()) {
                    .svc-par-box {
                        view-timeline-name: --svc-img;
                        view-timeline-axis: block;
                        view-timeline-inset: calc(var(--svc-stick-top, 76px) + var(--svc-n, 1) * var(--svc-row-h, 84px)) 0px;
                    }
                    .svc-par {
                        animation: svc-settle linear both;
                        animation-timeline: --svc-img;
                        animation-range: entry 0% exit 0%;
                    }
                    @media (prefers-reduced-motion: reduce) { .svc-par { animation: none; } }
                }
                /* Sticky headers are transparent so the sunrise gradient shows behind them, and each panel is
                   cut off sharply at the bottom edge of the header stack as it scrolls under. The cut is a
                   scroll-driven clip-path; its scroll range (--cut-s0 / --cut-len) is measured per panel in JS
                   on resize, never per frame. Until that is measured, or without scroll-driven animations,
                   the solid headers above stay in place. */
                @supports (animation-timeline: scroll()) {
                    .svc-list[data-cut="ready"] .svc-sticky-head { background: transparent !important; box-shadow: none !important; }
                    .svc-list[data-cut="ready"] .svc-sticky-head[data-pinned]::before { display: none; }
                    .svc-list[data-cut="ready"] .svc-cut {
                        animation: svc-cut linear both;
                        animation-timeline: scroll(root block);
                        animation-range: var(--cut-s0, 0px) calc(var(--cut-s0, 0px) + var(--cut-len, 1px));
                    }
                }
                @keyframes svc-cut {
                    from { clip-path: inset(0 -50vw -50vw -50vw); }
                    to { clip-path: inset(100% -50vw -50vw -50vw); }
                }
                @keyframes svc-settle {
                    from { transform: translate3d(0, 36px, 0); }
                    to { transform: translate3d(0, 0, 0); }
                }
                @media (hover: hover) {
                    .svc-sticky-head:hover .svc-num, .svc-sticky-head:hover .svc-title-text { color: #fff !important; }
                }
            `}</style>
            <SunriseTransition anchorRef={transitionRef} onHeaderTone={setHeaderLight}>
                <section
                    id="services"
                    style={{ overflowAnchor: "none" }}
                    className="relative flex flex-col justify-between w-full min-h-[100svh] pt-[144px] pb-[48px] md:pb-[64px] lg:pb-[var(--page-pad)] m-0 bg-transparent"
                >
                    <div className="w-full h-full px-[var(--page-pad)] flex flex-col flex-1 m-0">
                        <div ref={servicesHeadRef} className="flex flex-col items-start gap-[72px] w-full mb-[clamp(48px,8svh,80px)] md:flex-row md:justify-between md:items-start md:gap-[32px] m-0">
                            <MaskRevealText as="h2" mode="words" active={servicesHeadActive} className="cap-align H1 md:shrink-0 md:max-lg:!text-[clamp(56px,8vw,96px)] lg:!text-[64px] text-white m-0 uppercase">
                                Services
                            </MaskRevealText>
  
                            <MaskRevealText
                                as="p"
                                mode="words"
                                active={servicesHeadActive}
                                stagger={0.02}
                                delay={0.1}
                                className="cap-align svc-intro svc-keywords rwd-pretty !leading-[1.5] !tracking-[-0.005em] !text-[16px] w-full max-w-[500px] md:w-auto md:flex-none md:ml-auto md:self-end md:min-w-0 lg:w-[332px] lg:shrink-0 lg:max-w-none lg:pr-0 lg:ml-auto !text-[var(--text-dark-muted)] m-0"
                            >
                                Good brands don't happen because everything looks nice. They happen when the strategy, identity and experience all point in the same direction. I work across four disciplines to make that happen.
                            </MaskRevealText>
  
                            <div
                                ref={servicesImgBoxRef}
                                className="hidden lg:block relative w-[332px] shrink-0 self-start isolate overflow-hidden m-0"
                            >
                                <ServiceImageStage
                                    images={SERVICE_IMAGES}
                                    index={activeIndex}
                                    label={SERVICES_DATA[activeIndex].title}
                                    objectPosition={SERVICE_IMAGE_POSITIONS}
                                />
                            </div>
                        </div>
  
                        <div className="flex flex-col gap-[32px] w-full items-stretch lg:flex-row lg:items-stretch lg:mt-auto m-0">
                            <div className="svc-list flex-1 min-w-0 flex flex-col w-full lg:pr-[32px] m-0">
                                <motion.ul
                                    ref={servicesListRef}
                                    variants={servicesListContainerVariants}
                                    initial="hidden"
                                    animate={servicesListActive ? "show" : "hidden"}
                                    className="flex flex-col m-0 p-0 list-none w-full"
                                >
                                    {SERVICES_DATA.map((service, index) => {
                                        const isActive = vp.isDesktop ? activeIndex === index : true
                                        const isHighlighted = vp.isDesktop ? isActive : hoveredRow === index
                                        const HeadWrap = vp.isDesktop ? "div" : motion.div
                                        const headWrapProps = vp.isDesktop
                                            ? { className: "contents" }
                                            : {
                                                  variants: servicesRowVariants,
                                                  className: "svc-sticky-head sticky z-10",
                                                  "data-stuck": index === 0 ? "true" : "false",
                                                  "data-pinned": index === 0 ? "false" : undefined,
                                                  style: {
                                                      top: `calc(var(--svc-stick-top, 76px) + ${index} * var(--svc-row-h, 84px))`,
                                                      marginBottom: `calc(${SERVICES_DATA.length - 1 - index} * var(--svc-row-h, 84px))`,
                                                      background: "var(--svc-head-bg, var(--bg-dark, #050505))",
                                                      boxShadow: "0 -1px 0 0 var(--svc-head-bg, var(--bg-dark, #050505))",
                                                  },
                                              }
  
                                        return (
                                            <motion.li
                                                key={service.id}
                                                variants={servicesRowVariants}
                                                className={vp.isDesktop ? "flex flex-col w-full m-0 relative" : "contents"}
                                            >
                                                <HeadWrap {...headWrapProps}>
                                                    <motion.div
                                                        variants={servicesDividerVariants}
                                                        className="w-full lg:w-[var(--svc-line-w,100%)] h-[1px] bg-[var(--border-dark)] origin-left"
                                                    />
  
                                                    <motion.div
                                                        role={vp.isDesktop ? "button" : undefined}
                                                        tabIndex={vp.isDesktop ? 0 : -1}
                                                        aria-expanded={vp.isDesktop ? isActive : undefined}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault()
                                                                handleRowPress(index)
                                                            }
                                                        }}
                                                        onMouseEnter={vp.isDesktop ? () => selectService(index) : undefined}
                                                        onPointerEnter={
                                                            vp.isDesktop
                                                                ? undefined
                                                                : (e) => {
                                                                      if (e.pointerType !== "touch") setHoveredRow(index)
                                                                  }
                                                        }
                                                        onPointerLeave={vp.isDesktop ? undefined : () => setHoveredRow(null)}
                                                        onClick={() => handleRowPress(index)}
                                                        whileHover={{ y: -3 }}
                                                        transition={{ duration: 0.25, ease: taylorEase }}
                                                        className="svc-row cursor-pointer group w-full m-0 select-none"
                                                    >
                                                        <motion.span
                                                            animate={vp.isDesktop ? { color: isHighlighted ? "#ffffff" : SERVICE_INACTIVE_GREY, y: 0 } : undefined}
                                                            style={vp.isDesktop ? undefined : { color: SERVICE_INACTIVE_GREY }}
                                                            transition={{ duration: 0.25, ease: taylorEase }}
                                                            className="svc-num Caption font-semibold transition-colors select-none"
                                                        >
                                                            ({service.id})
                                                        </motion.span>
  
                                                        <div className="svc-title relative overflow-hidden">
                                                            <motion.span
                                                                animate={vp.isDesktop ? { color: isHighlighted ? "#ffffff" : SERVICE_INACTIVE_GREY, y: 0 } : undefined}
                                                                style={vp.isDesktop ? undefined : { color: SERVICE_INACTIVE_GREY }}
                                                                transition={{ duration: 0.25, ease: taylorEase }}
                                                                className="svc-title-text H2 block tracking-[-0.02em] group-hover:text-white uppercase"
                                                            >
                                                                {service.title}
                                                            </motion.span>
                                                        </div>
  
                                                        <div className="svc-keywords-cell min-w-0 overflow-hidden lg:overflow-visible lg:pl-[48px] xl:pl-[72px]">
                                                            {vp.isDesktop && (
                                                                <motion.div
                                                                    animate={{
                                                                        color: isHighlighted ? "#ffffff" : SERVICE_INACTIVE_GREY,
                                                                        opacity: isHighlighted ? 1 : 0.45,
                                                                        y: isHighlighted ? 0 : 4,
                                                                    }}
                                                                    transition={{ duration: 0.25, ease: taylorEase }}
                                                                    className="svc-keywords rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] whitespace-pre"
                                                                >
                                                                    {service.keywords}
                                                                </motion.div>
                                                            )}
                                                        </div>
  
                                                        <span
                                                            aria-hidden="true"
                                                            className={`svc-icon relative block w-[14px] h-[14px] shrink-0 transition-opacity duration-300 ${
                                                                !vp.isDesktop ? "opacity-0" : isHighlighted ? "opacity-100" : "opacity-50"
                                                            }`}
                                                        >
                                                            <span className="absolute left-0 top-[6.25px] w-full h-[1.5px] bg-white" />
                                                            <motion.span
                                                                animate={{ scaleY: isActive ? 0 : 1 }}
                                                                transition={{ duration: 0.35, ease: taylorEase }}
                                                                className="absolute top-0 left-[6.25px] h-full w-[1.5px] bg-white"
                                                            />
                                                        </span>
                                                    </motion.div>
                                                </HeadWrap>
  
                                                {!vp.isDesktop && (
                                                    <div className="svc-cut" style={{ marginTop: `calc(${-(SERVICES_DATA.length - 1 - index)} * var(--svc-row-h, 84px))` }}>
                                                        <AccordionPanel active={isActive}>
                                                            <div className="svc-panel pb-[28px]">
                                                                <ServiceAccordionImage
                                                                    src={service.image}
                                                                    alt={service.title}
                                                                    active={isActive}
                                                                    depth={index + 1}
                                                                />
                                                                <div
                                                                    style={{
                                                                        opacity: isActive ? 1 : 0,
                                                                        transform: isActive ? "translate3d(0,0,0)" : "translate3d(0,8px,0)",
                                                                        transition: isActive
                                                                            ? `opacity ${ACCORDION_OPEN.fadeIn}s ${APPLE_EASE_CSS} ${ACCORDION_OPEN.fadeInDelay}s, transform ${ACCORDION_OPEN.fadeIn + 0.1}s ${APPLE_EASE_CSS} ${ACCORDION_OPEN.fadeInDelay}s`
                                                                            : `opacity ${ACCORDION_CLOSE.fadeOut}s ease-out, transform ${ACCORDION_CLOSE.duration}s ${APPLE_EASE_CSS}`,
                                                                    }}
                                                                    className="svc-panel-text !pl-[48px]"
                                                                >
                                                                    <p className="svc-keywords rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-[var(--text-dark-muted)] whitespace-pre-line m-0 mb-[16px]">
                                                                        {service.keywords}
                                                                    </p>
                                                                    <h4 className="Body rwd-balance !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-white m-0 font-semibold">
                                                                        {flat(service.captionTitle)}
                                                                    </h4>
                                                                    <p className="Body !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-[var(--text-dark-muted)] rwd-pretty m-0 mt-[4px]">
                                                                        {service.captionText}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </AccordionPanel>
                                                    </div>
                                                )}
                                            </motion.li>
                                        )
                                    })}
  
                                    <motion.li
                                        aria-hidden="true"
                                        variants={servicesDividerVariants}
                                        className="w-full lg:w-[var(--svc-line-w,100%)] h-[1px] bg-[var(--border-dark)] origin-left list-none"
                                    />
                                </motion.ul>
                            </div>
  
                            <div
                                className="hidden lg:flex w-[332px] flex-shrink-0 flex-col justify-start m-0"
                                style={{ opacity: fontsReady && pageReady ? 1 : 0, transition: `opacity 0.5s ${APPLE_EASE_CSS}` }}
                            >
  
                                <div ref={servicesCapRef} className="relative min-h-[120px] mt-[74px] m-0 overflow-hidden flex flex-col justify-start">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeIndex}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="flex flex-col w-full m-0"
                                        >
                                            <h4 className="Body rwd-balance !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-white mb-6 whitespace-pre-line !font-semibold">
                                                {SERVICES_DATA[activeIndex].captionTitle}
                                            </h4>
                                            <p className="svc-keywords rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-[var(--text-dark-muted)] m-0">
                                                {SERVICES_DATA[activeIndex].captionText}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
  
                <div ref={transitionRef} aria-hidden="true" className="relative w-full h-[30vh] pointer-events-none" />
  
                <section
                    id="about"
                    className="relative flex flex-col w-full lg:min-h-screen pt-[48px] lg:pt-[144px] pb-[48px] md:pb-[64px] px-[var(--page-pad)] bg-transparent"
                >
                    <div className="w-full flex flex-col gap-[40px] md:gap-[48px] items-start lg:flex-row lg:items-stretch lg:gap-[64px] xl:gap-[138px]">
                        <div className="flex-shrink-0 lg:self-stretch">
                            <div className="w-[160px] h-[211px] md:w-[217px] md:h-[286px] lg:sticky lg:top-[120px]">
                                <motion.div
                                    initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                                    whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 1.2, ease: SMOOTH_SLIDE_EASE }}
                                    className="relative w-full h-full bg-[var(--bg-surface-light)] isolate overflow-hidden"
                                >
                                    <motion.img
                                        src="/portrait.webp"
                                        alt="Iyosias Portrait"
                                        loading="lazy"
                                        decoding="async"
                                        initial={{ scale: 1.25 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true, amount: 0.3 }}
                                        transition={{ duration: 1.6, ease: SMOOTH_SLIDE_EASE }}
                                        className="object-cover w-full h-full grayscale will-change-transform"
                                    />
                                </motion.div>
                            </div>
                        </div>
  
                        <div className="flex-1 flex flex-col w-full min-w-0">
                            <div className="flex flex-col">
                                <p className="H5 sm:max-md:portrait:!text-[28px] pb-[4px] mb-[68px] text-[var(--text-light-primary)]">
                                    ABOUT ME
                                </p>
  
                                <ScrollFillGroup
                                    blocks={[
                                        {
                                            text: "Industries change; the standard doesn't. Over eight years, I have shaped brands across real estate, coffee, technology, consumer products, and social impact.",
                                            className: "H3 about-text rwd-pretty sm:max-md:portrait:!text-[42px] sm:max-md:portrait:!leading-[1.1] lg:max-xl:!text-[36px] lg:max-xl:!leading-[1.1] w-full max-w-[900px] mb-[32px] md:mb-[48px] lg:mb-[64px] uppercase",
                                        },
                                        {
                                            text: "Great brands win on distinction, not volume. I turn complex ideas into identities that define their category.",
                                            className: "H3 about-text rwd-pretty sm:max-md:portrait:!text-[42px] sm:max-md:portrait:!leading-[1.1] lg:max-xl:!text-[36px] lg:max-xl:!leading-[1.1] w-full max-w-[900px] mb-0 uppercase",
                                        },
                                    ]}
                                />
                            </div>
  
                            <div
                                id="expertise"
                                className="flex flex-col w-full mt-[144px]"
                                onPointerMove={vp.isDesktop ? (e) => {
                                    pointerRef.current = { x: e.clientX, y: e.clientY }
                                    cursorX.set(e.clientX)
                                    cursorY.set(e.clientY)
                                } : undefined}
                                onPointerLeave={() => { pointerRef.current = null }}
                            >
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{ duration: 0.8, ease: SMOOTH_SLIDE_EASE }}
                                    className="H5 sm:max-md:portrait:!text-[28px] pb-[4px] nav-title mb-[68px] text-[var(--text-light-primary)]"
                                >
                                    EXPERTISE
                                </motion.p>
  
                                {vp.isDesktop && (
                                    <ExpertiseCursorImage
                                        x={cursorX}
                                        y={cursorY}
                                        hoveredIndex={hoveredExpertise}
                                        ratios={expertiseRatios}
                                    />
                                )}
  
                                <motion.ul
                                    variants={listContainerVariants}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true, amount: 0.1, margin: "0px 0px -25% 0px" }}
                                    onMouseLeave={() => {
                                        hoverRef.current = null
                                        setHoveredExpertise(null)
                                        setActiveExpertise(scrollIndexRef.current)
                                    }}
                                    className="flex flex-col m-0 p-0 list-none w-full"
                                >
                                    {EXPERTISE_DATA.map((item, index) => {
                                        const isActive = activeExpertise === index
                                        const isDimmed = activeExpertise !== null && !isActive
  
                                        return (
                                            <motion.li
                                                key={item.title}
                                                ref={(el) => {
                                                    expertiseRefs.current[index] = el
                                                }}
                                                variants={listRowVariants}
                                                onMouseMove={
                                                    vp.isDesktop
                                                        ? (e) => {
                                                              cursorX.set(e.clientX)
                                                              cursorY.set(e.clientY)
                                                              const last = lastPointerRef.current
                                                              if (e.clientX === last.x && e.clientY === last.y) return
                                                              lastPointerRef.current = { x: e.clientX, y: e.clientY }
                                                              hoverRef.current = index
                                                              setActiveExpertise(index)
                                                              setHoveredExpertise(index)
                                                          }
                                                        : undefined
                                                }
                                                className="flex flex-col w-full m-0"
                                            >
                                                <motion.div
                                                    variants={listDividerVariants}
                                                    style={{ backgroundColor: SITE_GREY }}
                                                    className="w-full h-[1px] origin-left"
                                                />
  
                                                <motion.div
                                                    initial={false}
                                                    animate={{
                                                        x: vp.isDesktop && isActive ? EXPERTISE_SHIFT : 0,
                                                    }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 170,
                                                        damping: 26,
                                                        mass: 0.9,
                                                    }}
                                                    className="grid grid-cols-1 gap-[16px] md:grid-cols-2 md:gap-[24px] lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_380px] pt-[24px] pb-[48px] md:pt-[28px] md:pb-[56px] lg:pt-[clamp(16px,2.5svh,28px)] lg:pb-[clamp(24px,5svh,56px)] will-change-transform relative items-start"
                                                >
                                                    <motion.h3
                                                        data-exp-text
                                                        variants={listTextItemVariants}
                                                        animate={vp.isDesktop ? { opacity: isDimmed ? 0.42 : 1 } : undefined}
                                                        style={{ color: "#000000" }}
                                                        transition={{ duration: 0.55, ease: SMOOTH_SLIDE_EASE }}
                                                        className="H2 expertise-title rwd-balance m-0 tracking-[-0.02em] uppercase !text-[28px] lg:!text-[30px] xl:!text-[44px] will-change-[transform,opacity]"
                                                    >
                                                        {item.title}
                                                    </motion.h3>
  
                                                    <motion.div
                                                        data-exp-copy
                                                        variants={listTextContainerVariants}
                                                        className="flex flex-col justify-between h-full pr-[120px] md:pr-0"
                                                        style={vp.isDesktop ? { paddingRight: EXPERTISE_SHIFT } : undefined}
                                                    >
                                                        <motion.p
                                                            data-exp-text
                                                            variants={listTextItemVariants}
                                                            animate={vp.isDesktop ? { opacity: isDimmed ? 0.42 : 1 } : undefined}
                                                            style={{ color: "#000000" }}
                                                            transition={{ duration: 0.55, ease: SMOOTH_SLIDE_EASE }}
                                                            className="svc-size H6 !leading-[1.35] !tracking-[-0.005em] !text-[16px] ![font-family:var(--font-body)] rwd-balance whitespace-pre-line m-0 will-change-[transform,opacity]"
                                                        >
                                                            {glueLastWords(item.description)}
                                                        </motion.p>
  
                                                        <motion.ul
                                                            data-exp-tools
                                                            variants={listTextItemVariants}
                                                            animate={vp.isDesktop ? { opacity: isDimmed ? 0.38 : 0.9 } : undefined}
                                                            style={{ color: SITE_SECONDARY_GREY }}
                                                            transition={{ duration: 0.55, ease: SMOOTH_SLIDE_EASE }}
                                                            className="svc-size H6 !leading-[1.35] !tracking-[-0.005em] !text-[16px] ![font-family:var(--font-body)] flex flex-col lg:flex-row lg:flex-wrap lg:gap-x-[6px] m-0 p-0 list-none mt-[24px] lg:mt-[12px] will-change-[transform,opacity]"
                                                        >
                                                            {item.tools.map((tool, i) => (
                                                                <li key={tool}>
                                                                    {tool}
                                                                    {i < item.tools.length - 1 ? "," : ""}
                                                                </li>
                                                            ))}
                                                        </motion.ul>
                                                    </motion.div>
  
                                                    {(() => {
                                                        const fitted = fitByArea(
                                                            expertiseRatios[item.image] || 1,
                                                            vp.isMobile ? EXPERTISE_SIZE.mobile : EXPERTISE_SIZE.tablet
                                                        )
                                                        const boost = vp.isMobile ? item.mobileBoost || 1 : 1
                                                        const size = { w: Math.round(fitted.w * boost), h: Math.round(fitted.h * boost) }
                                                        const nudge = (vp.isMobile && item.mobileOffset) || { x: 0, y: 0 }
                                                        return (
                                                            <div className="absolute inset-0 flex items-end justify-end pb-[20px] md:items-center md:justify-end md:pb-0 lg:hidden pointer-events-none">
                                                                <img
                                                                    data-exp-img
                                                                    src={item.image}
                                                                    alt=""
                                                                    aria-hidden="true"
                                                                    draggable={false}
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    style={{ width: size.w, height: size.h, opacity: 0, marginRight: -nudge.x, marginBottom: nudge.y }}
                                                                    className="shrink-0 object-contain pointer-events-none select-none will-change-[transform,opacity]"
                                                                />
                                                            </div>
                                                        )
                                                    })()}
                                                </motion.div>
                                            </motion.li>
                                        )
                                    })}
  
                                    <motion.li
                                        aria-hidden="true"
                                        variants={listDividerVariants}
                                        style={{ backgroundColor: SITE_GREY }}
                                        className="w-full h-[1px] origin-left list-none"
                                    />
                                </motion.ul>
                            </div>
                        </div>
                    </div>
                    <div className="w-full h-[48px] lg:h-[144px]" aria-hidden="true" />
                </section>
            </SunriseTransition>
        </div>
    )
  }