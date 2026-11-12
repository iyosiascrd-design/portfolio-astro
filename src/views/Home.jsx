// src/pages/Home.jsx

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
    useTransform,
    useInView,
} from "framer-motion"
import { useNavigate, useOutletContext } from "react-router-dom"
import gsap from "gsap"
import { ArrowRight } from "lucide-react"

import { ViewportContext } from "../lib/viewport"
import {
    customEase,
    taylorEase,
    TICKER_HEIGHT,
    TICKER_REVEAL,
    servicesContainerVariants,
    taylorServiceRowVariants,
    dividerVariants,
    servicesListContainerVariants,
    servicesRowVariants,
    servicesDividerVariants,
    SERVICES_VIEWPORT,
    TICKER_MOTION,
    createTicker,
} from "../lib/motion"

import { WORK_PROJECTS, LOOPING_IMAGES } from "../lib/projects"
import { FETCH_PRIORITY_KEY, whenIdle } from "../lib/loadingHints"
import { prefetchHero, heroSlugFor, warmAllHeroes } from "../lib/heroPrefetch.js"

import MaskRevealText from "../components/MaskRevealText"
import ServiceImageStage from "../components/ServiceImageStage"
import ScrollFillGroup from "../components/ScrollFillGroup"
import FlipbookCarousel from "../components/FlipbookCarousel.jsx"
import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"

const glueLastWords = (str) => {
    const i = str.lastIndexOf(" ")
    if (i === -1) return str
    return str.slice(0, i) + "\u00A0" + str.slice(i + 1)
}

const flat = (str) => str.replace(/\n/g, " ")

// Ticker image loading: LOOPING_IMAGES repeats the same 4 files, and on desktop all 4 are
// on screen at once, so the first 4 slides load at high priority. Repeat slides share the
// same URLs, so they need no hint of their own.
const TICKER_PRIORITY_COUNT = 4
const TICKER_START_DELAY = 1200 // ms after pageReady (preloader exit / page transition wipe still running)

const SERVICES_DATA = [
    {
        id: "01",
        title: "Brand Identity",
        keywords: "Strategy, positioning, identity\nsystems and guidelines",
        image: "/brand-identity.jpeg",
        captionTitle: "Make your\nDifference Visible",
        captionText:
            "Every business has an edge. I sharpen yours into a brand people recognize",
    },
    {
        id: "02",
        title: "Digital Design",
        keywords: "Websites, landing pages and\ndigital experiences",
        image: "/digital-design.jpeg",
        captionTitle: "Make your website\nwork harder",
        captionText:
            "Create digital experiences people enjoy, turning curious visitors into customers",
    },
    {
        id: "03",
        title: "Communication",
        keywords: "Pitch decks, presentations\nand campaign design",
        image: "/communication.jpeg",
        captionTitle: "Turn information\ninto influence",
        captionText:
            "From pitch decks to campaigns, turn complex ideas into clear visuals that get people to act",
    },
    {
        id: "04",
        title: "3D Visuals",
        keywords: "Product visualization,\narch visualization and motion",
        image: "/3d-visuals.jpg",
        captionTitle: "Make products feel\npremium before launch",
        captionText:
            "High-fidelity renders that build desire and make the future instantly tangible",
    },
]

const SERVICE_IMAGES = SERVICES_DATA.map((s) => s.image)

const EXPERTISE_DATA = [
    {
        title: "Brand Identity",
        description: "Complete positioning, visual systems,\nand brand guideline",
        tools: ["Adobe Illustrator", "Adobe Photoshop", "Adobe InDesign"],
        image: "/expertise-brand.png",
        tilt: -14,
        scale: 1,
        mobileBoost: 1.4,
        mobileOffset: { x: 12, y: 16 },
    },
    {
        title: "Web & UI Design",
        description: "High-converting landing pages and responsive Framer sites",
        tools: ["Figma", "Framer", "Webflow"],
        image: "/expertise-web.png",
        tilt: 6,
        scale: 1.25,
    },
    {
        title: "Pitch & Presentation",
        description: "Decks that win clients,\nfunding, and board approval",
        tools: ["Canva", "PowerPoint", "Keynote"],
        image: "/expertise-pitch.png",
        tilt: -10,
        scale: 1,
        desktopOffset: { x: 0, y: 40 },
        mobileOffset: { x: 0, y: 16 },
    },
    {
        title: "3D & Motion",
        description: "High-impact 3D visuals,\nproduct renders, and video motion",
        tools: ["Blender", "After Effects", "DaVinci"],
        image: "/expertise-3d.png",
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

// Keeps the decoded expertise images warm between visits. Keyed by src so it
// never grows past EXPERTISE_DATA.length entries.
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

        // These PNGs are only needed once the user reaches the expertise list,
        // so load them when the browser is idle instead of competing with the
        // hero and ticker for bandwidth.
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
const SITE_SECONDARY_GREY = "#999999"
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

const TickerSlideBase = ({ src, project, ready, onClick, fetchPriority, isClone }) => {
    const slideRef = useRef(null)
    const cardRef = useRef(null)
    const [reveal, setReveal] = useState(null)
    // The arrow nudge only runs while this slide is hovered. Before, every slide ran an
    // infinite framer-motion loop all the time (even while invisible), which competed
    // with the ticker for the main thread on every frame.
    const [hovered, setHovered] = useState(false)

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

    // Rise-in + fade as Web Animations: they run on the compositor, so the reveal can't stutter
    // while the main thread is busy with the preloader hand-off, text reveals and image decode.
    // Layout effect + fill "both" means there is never a frame showing the slide in its final
    // state before the animation takes over.
    useLayoutEffect(() => {
        const el = cardRef.current
        if (!reveal || reveal.instant || !el || typeof el.animate !== "function") return
        const delay = reveal.delay * 1000
        const dur = TICKER_REVEAL.duration * 1000
        el.style.willChange = "transform, opacity"
        const rise = el.animate(
            [{ transform: `translateY(${TICKER_REVEAL.from})` }, { transform: "translateY(0%)" }],
            { duration: dur, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }
        )
        const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: dur * 0.5,
            delay,
            easing: "ease-out",
            fill: "both",
        })
        const settle = () => {
            // end state == the element's normal style, so drop the animations and the layer
            rise.cancel()
            fade.cancel()
            el.style.willChange = ""
        }
        Promise.all([rise.finished, fade.finished]).then(settle, () => {})
        return () => {
            rise.cancel()
            fade.cancel()
            el.style.willChange = ""
        }
    }, [reveal])

    const getSubtitle = (name) => {
        if (!name) return ""
        const lower = name.toLowerCase()
        if (lower.includes("yimaj")) return "Branding / 3D"
        if (lower.includes("weyra")) return "Branding"
        if (lower.includes("origen")) return "Branding"
        return project.category || "Branding"
    }

    // The ticker repeats the same slides 3x to loop seamlessly. Only the first copy is exposed to
    // keyboard and screen readers; the clones are decoration.
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
                if (project) prefetchHero(heroSlugFor(project.name)) // start the case-study hero early
                if (e.pointerType === "mouse") setHovered(true)
            }}
            onPointerDown={() => {
                if (project) prefetchHero(heroSlugFor(project.name))
            }}
            onPointerLeave={() => setHovered(false)}
            className="relative flex-[0_0_72vw] md:flex-[0_0_42vw] lg:flex-[0_0_352px] min-w-0 pr-[12px] cursor-pointer group outline-none"
            {...a11y}
        >
            <div
                ref={cardRef}
                // hidden until the reveal is decided; the Web Animation above takes over from here
                style={{
                    height: TICKER_HEIGHT,
                    ...(reveal ? null : { opacity: 0, transform: `translateY(${TICKER_REVEAL.from})` }),
                }}
                className="relative w-full overflow-hidden rounded-lg md:rounded-[12px] lg:rounded-[8px] bg-[var(--bg-surface-dark)]"
            >
                <div className="absolute inset-0 w-full h-full">
                    <img
                        src={src}
                        alt={project ? project.name : "Portfolio Work"}
                        draggable={false}
                        decoding="async"
                        // Stays eager on purpose: slides sit inside overflow-hidden marquees, where
                        // loading="lazy" would not fetch until they are already visible (pop-in).
                        loading="eager"
                        {...(fetchPriority ? { [FETCH_PRIORITY_KEY]: fetchPriority } : null)}
                        className="object-cover w-full h-full scale-[1.35] pointer-events-none select-none"
                    />
                </div>
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                {/* keyboard focus ring (inside the clipped card so the marquee never crops it) */}
                <div className="absolute inset-0 rounded-[inherit] pointer-events-none ring-2 ring-inset ring-white opacity-0 group-focus-visible:opacity-100" />

                {project && (
                    <div className="absolute inset-x-0 bottom-0 pointer-events-none">
                        <div
                            className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-black/65 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                        />
                        <div className="relative flex items-end justify-between p-[16px]">
                            <div className="flex flex-col items-start opacity-0 translate-y-[14px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-1000 ease-[cubic-bezier(0.25,0.8,0.25,1)]">
                                <span className="Caption !text-[14px] uppercase !font-medium text-white leading-[1.2]">
                                    {project.name}
                                </span>
                                <span className="Caption !text-[14px] uppercase !font-medium text-white leading-[1.2] mt-[2px]">
                                    {getSubtitle(project.name)}
                                </span>
                            </div>

                            <span className="Caption !text-[14px] uppercase !font-medium leading-[1.2] opacity-0 translate-y-[14px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-1000 ease-[cubic-bezier(0.25,0.8,0.25,1)] flex items-center gap-[6px] text-white">
                                <span>VIEW PROJECT</span>
                                {hovered ? (
                                    <motion.span
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                        className="flex items-center"
                                    >
                                        <ArrowRight className="w-[1.1em] h-[1.1em]" strokeWidth={2.5} />
                                    </motion.span>
                                ) : (
                                    <span className="flex items-center">
                                        <ArrowRight className="w-[1.1em] h-[1.1em]" strokeWidth={2.5} />
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                )}
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

// iOS-style curve: leaves immediately, settles softly. One curve and one clock for the whole panel.
const APPLE_EASE_CSS = "cubic-bezier(0.32, 0.72, 0, 1)"
const ACCORDION_OPEN = { duration: 0.6, fadeIn: 0.45, fadeInDelay: 0.12 }
const ACCORDION_CLOSE = { duration: 0.5, fadeOut: 0.18 }

// Height is animated by the browser (grid 0fr -> 1fr), not measured and tweened in JS.
const AccordionPanel = ({ active, children }) => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const dur = reduce ? 0 : active ? ACCORDION_OPEN.duration : ACCORDION_CLOSE.duration
    return (
        <div
            aria-hidden={!active}
            style={{
                display: "grid",
                gridTemplateRows: active ? "1fr" : "0fr",
                // visibility flips at the end of a close so hidden rows can't be tabbed into
                visibility: active ? "visible" : "hidden",
                transition: `grid-template-rows ${dur}s ${APPLE_EASE_CSS}, visibility 0s linear ${active ? 0 : dur}s`,
            }}
        >
            <div style={{ overflow: "hidden", minHeight: 0 }}>{children}</div>
        </div>
    )
}

// Only opacity and transform animate inside the panel, so nothing triggers extra layout.
const ServiceAccordionImage = ({ src, alt, active }) => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    return (
        <div className="relative w-full aspect-[4/3] max-h-[clamp(180px,30svh,320px)] bg-[var(--bg-surface-dark)] overflow-hidden rounded-lg md:rounded-[12px] border border-[var(--border-dark-subtle)]">
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
    )
}

const RES = 0.5
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

function SunriseTransition({ children, anchorRef, onHeaderTone }) {
    const canvasRef = useRef(null)
    const { scrollY } = useScroll()
    const travel = useMotionValue(0)
    const smooth = useSpring(travel, { stiffness: 80, damping: 40, mass: 1.2 })

    useEffect(() => {
        const update = () => {
            const el = anchorRef?.current
            if (!el) return
            const vh = window.innerHeight || 800
            const rect = el.getBoundingClientRect()
            const progress = (vh - rect.top) / (vh * 1.5)
            travel.set(Math.max(0, Math.min(1, progress)))
        }

        update()
        const unsubscribe = scrollY.on("change", update)
        window.addEventListener("resize", update)
        window.addEventListener("load", update)
        return () => {
            unsubscribe()
            window.removeEventListener("resize", update)
            window.removeEventListener("load", update)
        }
    }, [anchorRef, scrollY, travel])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        let ctx = null
        try {
            ctx = canvas.getContext("2d", { alpha: false })
        } catch (e) {
            console.warn("2D context error:", e)
        }
        if (!ctx) return

        const lut = buildLut()
        const lutScale = (LUT_SIZE - 1) / V_MAX
        const noise = new Float32Array(4096)
        for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * 2.4

        let W = 0
        let H = 0
        let img = null
        let arc = null
        let lastLight = null

        const resize = () => {
            W = Math.max(2, Math.round(window.innerWidth * RES))
            H = Math.max(2, Math.round(window.innerHeight * RES))
            canvas.width = W
            canvas.height = H
            try {
                img = ctx.createImageData(W, H)
                for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255
            } catch (err) {
                img = null
            }
            arc = new Float32Array(W)
            for (let x = 0; x < W; x++) {
                const dx = x / (W - 1) - 0.5
                arc[x] = 1 - 4 * dx * dx
            }
        }

        const draw = (sv) => {
            if (!img || !arc) return
            const shift = BASE_SHIFT + SPEED * sv
            const clamp01 = (n) => Math.min(1, Math.max(0, n))
            const bottomDepth = BEND * Math.sin(Math.PI * clamp01(sv / 0.75))
            const topDepth = TOP_BEND * Math.sin(Math.PI * clamp01((sv + 0.35) / 1.1))

            const data = img.data
            const off = (Math.random() * 4096) | 0
            let i = 0

            for (let y = 0; y < H; y++) {
                const vb = y / H + shift
                const w = clamp01((1.0 - vb) / 0.6)
                const mix = w * w * (3 - 2 * w)
                const depth = topDepth * mix + bottomDepth * (1 - mix)

                for (let x = 0; x < W; x++) {
                    const vv = vb - depth * arc[x]
                    const k = vv <= 0 ? 0 : vv >= V_MAX ? LUT_SIZE - 1 : (vv * lutScale) | 0
                    const j = k * 3
                    const n = noise[(i + off) & 4095]
                    const o = i * 4

                    data[o] = lut[j] + n
                    data[o + 1] = lut[j + 1] + n
                    data[o + 2] = lut[j + 2] + n
                    i++
                }
            }

            ctx.putImageData(img, 0, 0)

            if (typeof onHeaderTone === "function") {
                const headerCenter = window.innerWidth < 768 ? 36 : 47
                const headerV = headerCenter / window.innerHeight
                const vv = headerV + shift
                const k = vv <= 0 ? 0 : vv >= V_MAX ? LUT_SIZE - 1 : (vv * lutScale) | 0
                const lum = (0.2126 * lut[k * 3] + 0.7152 * lut[k * 3 + 1] + 0.0722 * lut[k * 3 + 2]) / 255
                const light = lum > HEADER_TONE_THRESHOLD
                if (light !== lastLight) {
                    lastLight = light
                    onHeaderTone(light)
                }
            }
        }

        resize()
        draw(smooth.get())
        const unsubscribe = smooth.on("change", draw)
        const onResize = () => {
            resize()
            draw(smooth.get())
        }
        window.addEventListener("resize", onResize)

        return () => {
            unsubscribe()
            window.removeEventListener("resize", onResize)
        }
    }, [smooth, onHeaderTone])

    return (
        <div className="relative w-full">
            <div className="sticky top-0 z-0 w-full h-[100lvh] overflow-hidden pointer-events-none bg-[var(--bg-dark)]">
                <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" />
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

    // Arriving from a (scrolled) case study: start at the top, like the case studies do.
    // Skipped when the URL has a #hash so anchor links keep working.
    useEffect(() => {
        if (window.location.hash) return
        window.scrollTo(0, 0)
    }, [])

    // ---- Services text reveal ------------------------------------------------------------------
    // The reveal plays once the section is in view AND the page is actually showing it. Without
    // this gate it fired while the page was still covered by the transition (cross-page link) or
    // while the smooth scroll was still travelling (same-page link), so the visitor never saw it.
    // The header announces "#services" links with a "header-anchor" event; while that scroll is
    // still moving we hold the reveal, then release it ~160ms after the scroll goes quiet.
    const servicesHeadRef = useRef(null)
    const servicesListRef = useRef(null)
    const servicesHeadInView = useInView(servicesHeadRef, SERVICES_VIEWPORT)
    const servicesListInView = useInView(servicesListRef, SERVICES_VIEWPORT)
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
            if (servicesRevealedRef.current) return // already played: don't hide it again
            setServicesHold(true)
            if (!listening) {
                window.addEventListener("scroll", onScroll, { passive: true })
                listening = true
            }
            clearTimeout(settleTimer)
            clearTimeout(hardStop)
            settleTimer = setTimeout(release, 700) // the scroll has not started yet / nothing to scroll
            hardStop = setTimeout(release, 3000) // never hold forever
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
    // Hover highlight for the accordion rows (tablet/mobile widths with a mouse or trackpad).
    // Touch input is ignored so taps still just toggle the row.
    const [hoveredRow, setHoveredRow] = useState(null)
    const [openIndexes, setOpenIndexes] = useState([0])

    // Services (tablet/mobile): instead of an accordion, every service shows its full panel and its name
    // row sticks to the top as you scroll past. Names stack in order (Brand Identity first, the next
    // below it, ...), so only passed services are reduced to their names.
    //
    // This is pure CSS sticky, so the browser positions everything on the compositor and it cannot lag:
    //  - every name has a SOLID background, so panels simply slide behind the stack (no masking, no JS);
    //  - at the end of the list the names leave together: each name has a bottom margin of (names after
    //    it) * row height and sticky keeps that margin box inside the list. The panel below pulls up by
    //    the same amount, so the layout does not move.
    // The only JS is the highlight: it measures once and sets data-stuck on the names (no React state).
    useLayoutEffect(() => {
        const list = servicesListRef.current
        if (!list) return
        if (vp.isDesktop) {
            list.style.removeProperty("--svc-row-h")
            return
        }

        let geo = null
        let lastRowH = ""
        let lastStuck = -2
        let raf = 0
        let idleTimer = 0

        // Measured once (and on resize / font / image load / scroll-idle), never per scroll frame.
        const measure = () => {
            const hs = Array.from(list.querySelectorAll(".svc-sticky-head"))
            const ps = Array.from(list.querySelectorAll(".svc-panel"))
            if (!hs.length || hs.length !== ps.length || hs[0].offsetHeight <= 0) return

            // fractional: offsetHeight rounds and the error stacks
            const rowH = hs[0].getBoundingClientRect().height
            const rowHStr = `${rowH}px`
            if (rowHStr !== lastRowH) {
                lastRowH = rowHStr
                list.style.setProperty("--svc-row-h", rowHStr)
            }
            const top0 = parseFloat(getComputedStyle(hs[0]).top) || 0
            const sy = window.scrollY
            geo = { heads: hs, rowH, top0, panelTops: ps.map((el) => el.getBoundingClientRect().top + sy) }
            lastStuck = -2 // force the highlight to be re-applied
        }

        const frame = () => {
            raf = 0
            if (!geo) return
            const { heads, rowH, top0, panelTops } = geo
            const sy = window.scrollY
            // A name is stuck once its natural top (= its panel's top minus its own height) reaches its
            // stuck position. The last such name is the highlighted one.
            let stuck = 0
            for (let i = 0; i < heads.length; i++) {
                if (panelTops[i] - rowH - sy <= top0 + i * rowH + 1) stuck = i
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
            // Safety net: if layout shifted while scrolling (late image, page transition), correct it once
            // scrolling stops, off the hot path.
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
    const transitionRef = useRef(null)

    const tickerViewportRef = useRef(null)
    const tickerRef = useRef(null)
    const tickerWrapRef = useRef(null)
    const workSectionRef = useRef(null)
    const tickerEngine = useRef(null)
    const [tickerReady, setTickerReady] = useState(false)
    const [tickerPaused, setTickerPaused] = useState(false)
    const tickerPausedRef = useRef(false)
    const toggleTickerPause = () => {
        const next = !tickerPausedRef.current
        tickerPausedRef.current = next
        setTickerPaused(next)
        tickerEngine.current?.setPaused(next)
    }
    const pageReadyRef = useRef(pageReady)
    pageReadyRef.current = pageReady

    useEffect(() => {
        if (!tickerViewportRef.current || !tickerRef.current) return

        tickerEngine.current = createTicker(tickerViewportRef.current, tickerRef.current, {
            ...TICKER_MOTION,
            startPaused: true,
        })
        if (tickerPausedRef.current) tickerEngine.current.setPaused(true)
        // If the page is already revealed (e.g. after a resize), start right away
        if (pageReadyRef.current) tickerEngine.current.start()
        setTickerReady(true)
        return () => {
            tickerEngine.current?.destroy()
            tickerEngine.current = null
        }
    }, [vp.isMobile])

    // Start the ticker once the page is revealed (after the preloader / page transition)
    // Held back until the reveal wipe has finished: starting it earlier piles the ticker's
    // first frames on top of the mask wipe, the page slide and every slide's rise-in. The
    // ticker springs up from rest, so a late start still looks like a smooth ease-in.
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

    // Warm every case-study hero once the homepage is idle (4 images, low priority).
    useEffect(() => whenIdle(() => warmAllHeroes(), 2500), [])

    useEffect(() => {
        if (!vp.isDesktop) return
        const onMove = (e) => {
            if (e.pointerType && e.pointerType !== "mouse") return
            pointerRef.current = { x: e.clientX, y: e.clientY }
            cursorX.set(e.clientX)
            cursorY.set(e.clientY)
        }
        const onLeaveWindow = () => {
            pointerRef.current = null
        }
        window.addEventListener("pointermove", onMove, { passive: true })
        document.documentElement.addEventListener("mouseleave", onLeaveWindow)
        return () => {
            window.removeEventListener("pointermove", onMove)
            document.documentElement.removeEventListener("mouseleave", onLeaveWindow)
        }
    }, [vp.isDesktop, cursorX, cursorY])

    useEffect(() => {
        let frame = null
        const update = () => {
            frame = null
            if (!isDesktopRef.current) return
            const rows = expertiseRefs.current
            if (!rows.some(Boolean)) return
            const mid = (window.innerHeight || 800) * 0.5

            let idx = null
            rows.forEach((node, i) => {
                if (node && node.getBoundingClientRect().top <= mid) idx = i
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
        update()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            if (frame !== null) cancelAnimationFrame(frame)
            window.removeEventListener("scroll", onScroll)
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
        if (allTexts.length) gsap.set(allTexts, { color: SITE_GREY })
        toolsLists.forEach((tools) => {
            if (tools) gsap.set(tools, { color: SITE_GREY })
        })

        let current

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
                        color: active ? "#000000" : SITE_GREY,
                        duration: reduce ? 0 : 0.3,
                        ease: "power3.out",
                        overwrite: "auto",
                    })
                }
                if (toolsLists[i]) {
                    gsap.to(toolsLists[i], {
                        color: active ? SITE_SECONDARY_GREY : SITE_GREY,
                        duration: reduce ? 0 : 0.3,
                        ease: "power3.out",
                        overwrite: "auto",
                    })
                }
            })
        }

        const onScroll = () => {
            const mid = (window.innerHeight || 800) * 0.65
            let idx = null
            for (let i = 0; i < rows.length; i++) {
                if (rows[i] && rows[i].getBoundingClientRect().top <= mid) idx = i
            }
            apply(idx)
        }

        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
            gsap.killTweensOf([...imgs.filter(Boolean), ...allTexts, ...toolsLists.filter(Boolean)])
            gsap.set(imgs.filter(Boolean), { clearProps: "transform,transformOrigin" })
            gsap.set([...allTexts, ...toolsLists.filter(Boolean)], { clearProps: "color" })
        }
    }, [vp.isDesktop, vp.isMobile])

    const handleRowPress = (index) => {
        if (vp.isDesktop) selectService(index)
    }

    const toggleAccordion = (index) => {
        setOpenIndexes((current) =>
            current.includes(index) ? current.filter((i) => i !== index) : [...current, index]
        )
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

        prefetchHero(heroSlugFor(projectName)) // no-op if already warmed

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
                        <main className="flex flex-col items-start gap-[32px] w-full m-0 lg:flex-row lg:items-end lg:justify-between lg:gap-0">
                            <MaskRevealText
                                as="h1"
                                mode="lines"
                                linesFrom="md"
                                active={pageReady}
                                delay={0.1}
                                stagger={0.08}
                                className="H2 hero-title rwd-balance max-md:![text-wrap:pretty] max-md:!text-[40px] max-md:!leading-[1.1] sm:max-md:portrait:text-left sm:max-md:portrait:!text-[56px] !text-white m-0 p-0 uppercase"
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
                                className="svc-size Body rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] !text-[var(--text-dark-muted)] max-w-[440px] sm:max-md:portrait:max-w-[560px] sm:max-md:portrait:self-start lg:max-w-none m-0 p-0 text-left self-end"
                            >
                                {"I close the gap between how good your\nbusiness is and how it looks."}
                            </MaskRevealText>
                        </main>

                        <div className="flex flex-col items-start gap-1 w-full m-0 -translate-y-[12px] md:translate-y-0 md:flex-row md:justify-between md:items-center md:gap-0">
                            <MaskRevealText
                                mode="words"
                                active={pageReady}
                                delay={0.4}
                                className="Nav sm:max-md:portrait:!text-[22px] uppercase text-[var(--text-dark-secondary)]"
                            >
                                Selected Work
                            </MaskRevealText>

                            <div className="hidden md:block">
                                <MaskRevealText
                                    mode="words"
                                    active={pageReady}
                                    delay={0.45}
                                    className="Nav sm:max-md:portrait:!text-[22px] uppercase text-[var(--text-dark-secondary)] text-right"
                                >
                                    Based in Addis Ababa, Ethiopia
                                </MaskRevealText>
                            </div>
                        </div>
                    </div>
                </div>

                {vp.isMobile ? (
                    <div className="w-full pb-[var(--page-pad-y)]">
                        <FlipbookCarousel
                            fullWidth
                            projects={[...WORK_PROJECTS].sort((a, b) =>
                                b.name.toLowerCase().includes("weyra") ? 1 : -1
                            )}
                            onSelect={handleProjectClick}
                        />
                    </div>
                ) : (
                    <div ref={tickerWrapRef} className="relative flex-shrink-0 w-full pb-[16px] m-0 overflow-hidden will-change-transform">
                        {/* Moving content needs a pause control (WCAG 2.2.2). Hidden until keyboard focus. */}
                        <button
                            type="button"
                            onClick={toggleTickerPause}
                            className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:right-[16px] focus-visible:top-[16px] focus-visible:z-10 focus-visible:rounded-full focus-visible:bg-white focus-visible:px-[14px] focus-visible:py-[8px] focus-visible:text-black Caption !text-[14px] uppercase !font-medium"
                        >
                            {tickerPaused ? "Play work gallery" : "Pause work gallery"}
                        </button>
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
                            className="w-full overflow-hidden select-none cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:[&>div]:pointer-events-none"
                        >
                            <div ref={tickerRef} className="flex w-full">
                                {Array.from({ length: TICKER_MOTION.copies }, () => LOOPING_IMAGES).flat().map((src, idx) => {
                                    const proj = WORK_PROJECTS.find((p) => p.image === src)
                                    return (
                                        <TickerSlide
                                            key={idx}
                                            src={src}
                                            project={proj}
                                            ready={tickerReady && pageReady}
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

            {/* Tablet/mobile: the stacked name that is currently stuck is white; written as an attribute by the
                scroll effect so no React render happens while scrolling. */}
            <style>{`
                .svc-sticky-head .svc-num, .svc-sticky-head .svc-title-text { transition: color 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
                .svc-sticky-head[data-stuck="true"] .svc-num, .svc-sticky-head[data-stuck="true"] .svc-title-text { color: #fff !important; }
                @media (hover: hover) {
                    .svc-sticky-head:hover .svc-num, .svc-sticky-head:hover .svc-title-text { color: #fff !important; }
                }
            `}</style>
            <SunriseTransition anchorRef={transitionRef} onHeaderTone={setHeaderLight}>
                <section
                    id="services"
                    // Rows resize while they animate; keep the browser from nudging scrollTop in response.
                    style={{ overflowAnchor: "none" }}
                    className="relative flex flex-col justify-between w-full min-h-[100svh] pt-[48px] lg:pt-[clamp(96px,15svh,144px)] pb-[48px] md:pb-[64px] lg:pb-[var(--page-pad)] m-0 bg-transparent"
                >
                    <div className="w-full h-full px-[var(--page-pad)] flex flex-col flex-1 m-0">
                        <div ref={servicesHeadRef} className="flex flex-col items-start gap-[40px] w-full mb-[clamp(48px,8svh,80px)] md:flex-row md:justify-between md:items-start md:gap-[32px] m-0">
                            <MaskRevealText as="h2" mode="words" active={servicesHeadActive} className="cap-align H1 md:shrink-0 md:max-lg:!text-[clamp(56px,8vw,96px)] text-white m-0 uppercase">
                                Services
                            </MaskRevealText>

                            <MaskRevealText
                                as="p"
                                mode="words"
                                active={servicesHeadActive}
                                stagger={0.02}
                                delay={0.1}
                                className="cap-align svc-keywords rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] w-full max-w-[500px] md:w-auto md:flex-none md:ml-auto md:self-end md:min-w-0 !text-[var(--text-dark-muted)] m-0"
                            >
                                Good brands don't happen because everything looks nice. They happen when the strategy, identity and experience all point in the same direction. I work across four disciplines to make that happen.
                            </MaskRevealText>
                        </div>

                        <div className="flex flex-col gap-[32px] w-full items-stretch lg:flex-row lg:items-start m-0">
                            <div className="svc-list flex-1 min-w-0 flex flex-col w-full lg:pr-[32px] m-0">
                                <motion.ul
                                    ref={servicesListRef}
                                    variants={servicesListContainerVariants}
                                    initial="hidden"
                                    animate={servicesListActive ? "show" : "hidden"}
                                    className="flex flex-col m-0 p-0 list-none w-full"
                                >
                                    {/* Tablet/mobile: the stacked names have no background of their own. Panels that pass under
                                        them are clipped away in JS (clipPanels), so there is nothing to hide with a solid colour
                                        and no black bars can show over the sunrise gradient. */}
                                    {SERVICES_DATA.map((service, index) => {
                                        // Desktop: hover-selected. Tablet/mobile: every panel is always shown;
                                        // the name that is currently stacked/stuck is the highlighted one.
                                        const isActive = vp.isDesktop ? activeIndex === index : true
                                        const isHighlighted = vp.isDesktop ? isActive : hoveredRow === index
                                        const HeadWrap = "div"
                                        const headWrapProps = vp.isDesktop
                                            ? { className: "contents" }
                                            : {
                                                  className: "svc-sticky-head sticky z-10",
                                                  "data-stuck": index === 0 ? "true" : "false",
                                                  style: {
                                                      top: `calc(var(--svc-stick-top, 76px) + ${index} * var(--svc-row-h, 84px))`,
                                                      // Native exit: sticky keeps the head's MARGIN box inside the list, so a
                                                      // bottom margin of (heads after it) * rowHeight makes the heads stop in
                                                      // stack order and leave with the page together. The panel below pulls up
                                                      // by the same amount (wrapper below), so the layout does not move.
                                                      marginBottom: `calc(${SERVICES_DATA.length - 1 - index} * var(--svc-row-h, 84px))`,
                                                      // Solid, so panels sliding behind the stack are fully hidden. Set --svc-head-bg
                                                      // if the section background is not --bg-dark. The 1px shadow overlaps the name
                                                      // above, so a fractional device pixel can never open a seam between two names.
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
                                                    className="w-full h-[1px] bg-[var(--border-dark)] origin-left"
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

                                                    <div className="svc-keywords-cell min-w-0 overflow-hidden">
                                                        {/* Desktop keeps the keywords in the row; tablet/mobile shows them inside the expanded panel instead. */}
                                                        {vp.isDesktop && (
                                                        <motion.div
                                                            animate={{
                                                                color: isHighlighted ? "#ffffff" : SERVICE_INACTIVE_GREY,
                                                                opacity: isHighlighted ? 1 : 0.45,
                                                                y: isHighlighted ? 0 : 4,
                                                            }}
                                                            transition={{ duration: 0.25, ease: taylorEase }}
                                                            className="svc-keywords rwd-pretty !leading-[1.35] !tracking-[-0.005em] !text-[16px] whitespace-pre-line"
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
                                                    <div style={{ marginTop: `calc(${-(SERVICES_DATA.length - 1 - index)} * var(--svc-row-h, 84px))` }}>
                                                    <AccordionPanel active={isActive}>
                                                            <div className="svc-panel pb-[28px]">
                                                                <ServiceAccordionImage
                                                                    src={service.image}
                                                                    alt={service.title}
                                                                    active={isActive}
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

                                    <motion.div
                                        variants={servicesDividerVariants}
                                        className="w-full h-[1px] bg-[var(--border-dark)] origin-left"
                                    />
                                </motion.ul>
                            </div>

                            <div className="hidden lg:flex w-[332px] flex-shrink-0 flex-col justify-between m-0">
                                <div className="relative w-full h-[clamp(150px,25svh,230px)] bg-[var(--bg-surface-dark)] overflow-hidden rounded-lg md:rounded-[12px] border border-[var(--border-dark-subtle)]">
                                    <ServiceImageStage
                                        images={SERVICE_IMAGES}
                                        index={activeIndex}
                                        label={SERVICES_DATA[activeIndex].title}
                                    />
                                </div>

                                <div className="relative min-h-[120px] mt-[24px] m-0 overflow-hidden flex flex-col justify-end">
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
                                <div className="relative w-full h-full bg-[var(--bg-surface-light)] overflow-hidden rounded-lg md:rounded-[12px]">
                                    <img
                                        src="/portrait.jpeg"
                                        alt="Iyosias Portrait"
                                        loading="lazy"
                                        decoding="async"
                                        className="object-cover w-full h-full grayscale"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col w-full min-w-0">
                            <div className="flex flex-col">
                                <p className="H5 sm:max-md:portrait:!text-[28px] pb-[4px] mb-[24px] md:mb-[40px] lg:mb-[64px] text-[var(--text-light-primary)]">
                                    ABOUT ME
                                </p>

                                <ScrollFillGroup
                                    blocks={[
                                        {
                                            text: "Industries change; the standard doesn't. Over eight years, I have shaped brands across real estate, coffee, technology, consumer products, and social impact.",
                                            className: "H3 about-text rwd-pretty sm:max-md:portrait:!text-[34px] sm:max-md:portrait:!leading-[1.1] w-full max-w-[900px] mb-[32px] md:mb-[48px] lg:mb-[64px] uppercase",
                                        },
                                        {
                                            text: "Great brands win on distinction, not volume. I turn complex ideas into identities that define their category.",
                                            className: "H3 about-text rwd-pretty sm:max-md:portrait:!text-[34px] sm:max-md:portrait:!leading-[1.1] w-full max-w-[900px] mb-[24px] uppercase",
                                        },
                                    ]}
                                />
                            </div>

                            <div id="expertise" className="flex flex-col w-full mt-[48px] lg:mt-[clamp(72px,14svh,144px)]">
                                <p className="H5 sm:max-md:portrait:!text-[28px] pb-[4px] nav-title mb-[48px] md:mb-[80px] lg:mb-[clamp(48px,8svh,80px)] text-[var(--text-light-primary)]">
                                    EXPERTISE
                                </p>

                                {vp.isDesktop && (
                                    <ExpertiseCursorImage
                                        x={cursorX}
                                        y={cursorY}
                                        hoveredIndex={hoveredExpertise}
                                        ratios={expertiseRatios}
                                    />
                                )}

                                <motion.ul
                                    variants={servicesContainerVariants}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true, amount: 0.15 }}
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
                                                variants={taylorServiceRowVariants}
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
                                                    variants={dividerVariants}
                                                    style={{ backgroundColor: SITE_GREY }}
                                                    className="w-full h-[1px] origin-left"
                                                />

                                                <motion.div
                                                    initial={false}
                                                    animate={{
                                                        x: vp.isDesktop && isActive ? EXPERTISE_SHIFT : 0,
                                                    }}
                                                    transition={{ duration: 0.45, ease: taylorEase }}
                                                    className="grid grid-cols-1 gap-[16px] md:grid-cols-2 md:gap-[24px] lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_380px] pt-[24px] pb-[48px] md:pt-[28px] md:pb-[56px] lg:pt-[clamp(16px,2.5svh,28px)] lg:pb-[clamp(24px,5svh,56px)] will-change-transform relative items-start"
                                                >
                                                    <h3 data-exp-text style={{ color: isDimmed ? SITE_GREY : "#000000" }} className="H2 expertise-title rwd-balance m-0 tracking-[-0.02em] uppercase !text-[28px] lg:!text-[44px] lg:transition-colors lg:duration-500">
                                                        {item.title}
                                                    </h3>

                                                    <div
                                                        className="flex flex-col justify-between h-full pr-[120px] md:pr-0"
                                                        style={vp.isDesktop ? { paddingRight: EXPERTISE_SHIFT } : undefined}
                                                    >
                                                        <p data-exp-text style={{ color: isDimmed ? SITE_GREY : "#000000" }} className="svc-size H6 !leading-[1.35] !tracking-[-0.005em] !text-[16px] ![font-family:var(--font-body)] rwd-balance whitespace-pre-line m-0 lg:transition-colors lg:duration-500">
                                                            {glueLastWords(item.description)}
                                                        </p>

                                                        <ul data-exp-tools style={{ color: isDimmed ? SITE_GREY : SITE_SECONDARY_GREY }} className="svc-size H6 !leading-[1.35] !tracking-[-0.005em] !text-[16px] ![font-family:var(--font-body)] flex flex-col lg:flex-row lg:flex-wrap lg:gap-x-[6px] m-0 p-0 list-none lg:transition-colors lg:duration-500 mt-[24px] lg:mt-[12px]">
                                                            {item.tools.map((tool, i) => (
                                                                <li key={tool}>
                                                                    {tool}
                                                                    {i < item.tools.length - 1 ? "," : ""}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

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

                                    <motion.div
                                        variants={dividerVariants}
                                        style={{ backgroundColor: SITE_GREY }}
                                        className="w-full h-[1px] origin-left"
                                    />
                                </motion.ul>
                            </div>
                        </div>
                    </div>
                    {/* Moved spacer outside the flex row so the sticky portrait stops exactly at the end of the list */}
                    <div className="w-full h-[48px] lg:h-[144px]" aria-hidden="true" />
                </section>
            </SunriseTransition>
        </div>
    )
}