// src/components/Header.jsx

import React, { useState, useRef, useEffect, useLayoutEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import gsap from "gsap"
import MaskRevealText from "./MaskRevealText"
import { usePageTransition, announcePageLanded } from "./PageTransitionOverlay"

/* ------------------------------------------------------------------
   Layout (matches the 1512px reference)
   - 12-column grid, 20px side padding, 20px gutters
   - Fixed 80px bar height, content vertically centred
   - Full desktop header from 1024px and up (lg:): logo left, then
     WORK / SERVICE / ABOUT ME / GET IN TOUCH as plain text links,
     spread evenly from column 7 to the right edge
   - Below 1024px: plain MENU text (no hover animation). Pressing it
     makes the black menu expand out of the word itself (and shrink back on close)
   - No blur. The header uses mix-blend-mode: difference, so the white
     logo + nav + label invert against whatever is behind them (black on
     light areas, white on dark areas) at every screen size.

   Logo file (in /public):
     /iyosias-logo-white.svg  -> the only logo needed (the blend inverts it)
------------------------------------------------------------------- */

const LOGO_WHITE = "/iyosias-logo-white.svg"

const NAV = [
    // `desktop` is the label in the 1024px+ bar; `label` is used in the menu panel
    { label: "Work", desktop: "Work", target: "#work" },
    { label: "Services", desktop: "Service", target: "#services" },
    { label: "About Me", desktop: "About Me", target: "#about" },
]

// The Work link opens the dedicated /work page; the other links scroll to a homepage section.
const WORK_ROUTE = "/work"
const hrefFor = (target) => (target === "#work" ? WORK_ROUTE : target)

// sessionStorage key used to remember which homepage section to scroll to after a page change.
// Must be a NAMED EXPORT: SiteLayout.jsx imports it.
export const PENDING_SCROLL_KEY = "pendingScroll"

// Extra scroll offset in px when landing on a section. Negative = land higher up
// (shows more above the section's top edge). Tweak this if the title still sits too high or low.
const SCROLL_OFFSET = 0

const GET_IN_TOUCH = { label: "Get In Touch", href: "mailto:info@iyosiasdesign.com" }

// Menu panel footer socials
const SOCIALS_LEFT = [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/iyosias-tekezeshoa-3524031ba/" },
    { label: "Twitter(X)", href: "https://x.com/IyosiasTeke" },
    { label: "Instagram", href: "https://www.instagram.com/iyosias.t/" },
]

// Desktop nav link text
const NAV_TEXT = "Nav !text-[16px] !leading-none uppercase"

// Specific style for Menu/Close buttons to force Borscha and SemiBold weight (600)
const MENU_BTN_TEXT = "![font-family:'Borscha'] !font-semibold !text-[16px] !leading-none uppercase"

// Menu + Close buttons. 
const MENU_BTN = "inline-flex shrink-0 items-center whitespace-nowrap cursor-pointer"
// Menu / Close buttons: no stroke, identical 77 x 26 box so one can morph into the other
const MENU_BOX = "w-[77px] h-[26px] justify-center"

/* ------------------------------------------------------------------
   Roll: GSAP version of the RollingLink hover animation.
   Visible text rolls up and out while a duplicate rolls up from below.
   Hover is read from the closest <a> / <button>, so the whole pill or
   link is the hover target. Put the font classes on <Roll className>
   so both copies match. Pass `text` when children is not a plain string.

   Pass hover={false} to render plain static text (no duplicate copy,
   no listeners). Used for the Menu and Close buttons.
------------------------------------------------------------------- */

const ROLL = { duration: 0.6, ease: "power3.inOut", padY: 0.12, offset: 128 }

function Roll({ children, text, className = "", hover = true }) {
    const wrapRef = useRef(null)
    const topRef = useRef(null)
    const bottomRef = useRef(null)

    useEffect(() => {
        if (!hover) return

        const wrap = wrapRef.current
        const top = topRef.current
        const bottom = bottomRef.current
        if (!wrap || !top || !bottom) return

        const host = wrap.closest("a,button") || wrap
        gsap.set(top, { yPercent: 0 })
        gsap.set(bottom, { yPercent: ROLL.offset })

        const to = (hovered) => {
            const opts = { duration: ROLL.duration, ease: ROLL.ease, overwrite: "auto" }
            gsap.to(top, { yPercent: hovered ? -ROLL.offset : 0, ...opts })
            gsap.to(bottom, { yPercent: hovered ? 0 : ROLL.offset, ...opts })
        }

        const onEnter = (e) => {
            if (e.pointerType === "touch") return
            to(true)
        }
        const onLeave = () => to(false)
        const onFocus = () => {
            if (host.matches(":focus-visible")) to(true)
        }

        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("focus", onFocus)
        host.addEventListener("blur", onLeave)
        return () => {
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("focus", onFocus)
            host.removeEventListener("blur", onLeave)
            gsap.killTweensOf([top, bottom])
        }
    }, [hover])

    // Static version: plain text, no rolling copy
    if (!hover) {
        return <span className={`inline-block whitespace-nowrap ${className}`}>{children}</span>
    }

    return (
        <span
            ref={wrapRef}
            className={`relative inline-block overflow-hidden whitespace-nowrap ${className}`}
            style={{
                paddingTop: `${ROLL.padY}em`,
                paddingBottom: `${ROLL.padY}em`,
                marginTop: `-${ROLL.padY}em`,
                marginBottom: `-${ROLL.padY}em`,
            }}
        >
            <span ref={topRef} className="block will-change-transform">
                {children}
            </span>
            <span
                ref={bottomRef}
                aria-hidden="true"
                className="absolute left-0 right-0 block will-change-transform"
                style={{ top: `${ROLL.padY}em` }}
            >
                {text ?? children}
            </span>
        </span>
    )
}

/* ------------------------------------------------------------------
   FitWidth: scales its text so it spans the full width of its box.
   Measures the text at 100px, then sets the font size that makes it
   exactly as wide as the box. Re-fits when the box resizes (the menu
   panel is hidden until opened, so the first real size arrives via
   the ResizeObserver) and once the fonts have loaded.
   Children must inherit their font size (use !text-[1em]).
------------------------------------------------------------------- */

function FitWidth({ children, className = "" }) {
    const boxRef = useRef(null)
    const textRef = useRef(null)

    useLayoutEffect(() => {
        const box = boxRef.current
        const text = textRef.current
        if (!box || !text) return

        const fit = () => {
            const boxW = box.clientWidth
            if (!boxW) return // hidden (menu closed)
            text.style.fontSize = "100px"
            const textW = text.getBoundingClientRect().width
            if (!textW) return
            text.style.fontSize = `${(100 * boxW * 0.997) / textW}px`
        }

        fit()
        const ro = new ResizeObserver(fit)
        ro.observe(box)
        document.fonts?.ready?.then(fit)
        return () => ro.disconnect()
    }, [])

    return (
        <div ref={boxRef} className={`w-full ${className}`}>
            <div ref={textRef} className="w-fit whitespace-nowrap">
                {children}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */

export default function Header({ opacity = 1, scrollToTarget }) {
    const navigate = useNavigate()
    const location = useLocation()
    const pageTransition = usePageTransition()

    const [menuOpen, setMenuOpen] = useState(false)
    const [revealActive, setRevealActive] = useState(false)

    const headerRef = useRef(null)
    const rowRef = useRef(null)
    const mobileMenuRef = useRef(null)
    const menuBtnRef = useRef(null)
    const closeBtnRef = useRef(null)
    const closeLblMenuRef = useRef(null)
    const closeLblCloseRef = useRef(null)
    const closePillRef = useRef(null)
    // true while we programmatically land on a section (the scroll-linked header must ignore it)
    const landingRef = useRef(false)

    /* ---------- phone: scroll-linked header (iOS-style collapsing bar) ----------
       The header's position is a direct function of scroll distance, so it tracks the finger
       and never lags behind the content:
         - Scrolling down: the header leaves HIDE_GAIN x faster than the page moves, so it is
           always gone before the content can slide underneath it.
         - Scrolling up: it returns 1:1 with the finger.
         - When scrolling stops, it snaps fully hidden or fully shown (based on the last
           direction) with a short ease-out.
         - Touching / scrolling mid-snap catches the tween where it is, so nothing fights the finger. */

    useEffect(() => {
        const el = headerRef.current
        if (!el) return

        const mq = window.matchMedia("(max-width: 767px)")
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const HIDE_GAIN = 2 // header leaves 2x faster than the content scrolls (1 = exactly 1:1, iOS Safari feel)
        const SETTLE_DELAY = 90 // ms of no scrolling before it snaps open/closed
        const SETTLE_DURATION = 0.28 // s, ease-out of the snap
        const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

        let H = el.offsetHeight
        let offset = 0 // 0 = fully shown, -H = fully hidden
        let lastY = Math.max(0, window.scrollY)
        let lastDir = 0
        let frame = null
        let settleTimer = 0

        const paint = () => {
            frame = null
            gsap.set(el, { y: offset })
        }

        const settle = () => {
            const hide = lastDir > 0 && offset < -4
            const to = hide ? -H : 0
            offset = to
            gsap.to(el, {
                y: to,
                duration: reduce ? 0 : SETTLE_DURATION,
                ease: "power3.out",
                overwrite: true,
            })
        }

        const onScroll = () => {
            const y = Math.max(0, window.scrollY) // ignore iOS rubber-band overscroll
            // Programmatic landing jump: track position, but never hide/show the bar for it
            if (landingRef.current) {
                lastY = y
                return
            }
            const diff = y - lastY
            lastY = y
            if (!diff) return

            // Grabbing the page mid-snap: pick up from where the header currently is
            if (gsap.isTweening(el)) {
                offset = gsap.getProperty(el, "y")
                gsap.killTweensOf(el)
            }

            lastDir = diff
            H = el.offsetHeight
            offset =
                y <= 0 || menuOpen
                    ? 0
                    : clamp(offset - (diff > 0 ? diff * HIDE_GAIN : diff), -H, 0)

            if (frame === null) frame = requestAnimationFrame(paint)

            clearTimeout(settleTimer)
            settleTimer = setTimeout(settle, SETTLE_DELAY)
        }

        const reset = () => {
            offset = 0
            gsap.killTweensOf(el)
            gsap.set(el, { clearProps: "transform" })
        }

        const attach = () => {
            lastY = Math.max(0, window.scrollY)
            window.addEventListener("scroll", onScroll, { passive: true })
        }
        const detach = () => {
            window.removeEventListener("scroll", onScroll)
            clearTimeout(settleTimer)
            if (frame !== null) {
                cancelAnimationFrame(frame)
                frame = null
            }
        }

        const onBreakpoint = (e) => {
            if (e.matches) attach()
            else {
                detach()
                reset()
            }
        }

        if (mq.matches) attach()
        if (menuOpen) {
            offset = 0
            gsap.to(el, { y: 0, duration: 0.2, overwrite: true })
        }
        mq.addEventListener("change", onBreakpoint)

        return () => {
            mq.removeEventListener("change", onBreakpoint)
            detach()
            reset()
        }
    }, [menuOpen, location.pathname])

    /* ---------- menu: the black card grows out of the MENU word and shrinks back into it ----------
       Tablet: card ends as the dropdown, 60vw wide with a 520px minimum. Phone: card ends full screen.
       The card's content is pinned top-right at its final size, so nothing reflows while it grows.
       The card box itself also stays at its final size the whole time; only a clip-path window grows from
       the MENU word to the full card (and back). clip-path runs on the compositor with no layout per frame,
       so it stays smooth, and its rounded corners match the 16px used on the site's images. */

    useEffect(() => {
        const menuEl = mobileMenuRef.current
        const closeEl = closeBtnRef.current
        const lblMenu = closeLblMenuRef.current
        const lblClose = closeLblCloseRef.current
        const pill = closePillRef.current
        const menuBtn = menuBtnRef.current
        if (!menuEl || !menuBtn) return

        // Tablet = 768px and up (this menu is only used below 1024px)
        const isTablet = window.matchMedia("(min-width: 768px)").matches
        const clear = "top,right,left,bottom,width,height,backgroundColor,borderRadius,clipPath,opacity,willChange"
        const CLEAR = "rgba(0,0,0,0)"
        const MENU_RADIUS = 16 // px, same rounding as the images
        const PHONE_END_RADIUS = 0 // phone card ends full screen, so its corners end square
        const endRadius = isTablet ? MENU_RADIUS : PHONE_END_RADIUS

        const full = isTablet
            ? {
                  top: 10,
                  right: 10,
                  width: Math.max(window.innerWidth * 0.6, 520),
                  height: Math.min(640, window.innerHeight - 20),
              }
            : {
                  top: 0,
                  right: 0,
                  width: window.innerWidth,
                  height: window.innerHeight,
              }

        // Exact box of the MENU word
        const wordBox = () => {
            const r = menuBtn.getBoundingClientRect()
            return {
                top: r.top,
                right: window.innerWidth - r.right,
                width: r.width,
                height: r.height,
            }
        }

        // The card box is always its final size; these describe the visible window inside it
        const clipFull = (radius) => `inset(0px 0px 0px 0px round ${radius}px)`
        const clipFor = (box, radius) => {
            const t = box.top - full.top
            const r = box.right - full.right
            const b = full.height - t - box.height
            const l = full.width - r - box.width
            return `inset(${t}px ${r}px ${b}px ${l}px round ${radius}px)`
        }
        // Offset that puts the in-card CLOSE button exactly on the MENU word's box
        const closeOffset = (cs, box) => ({
            x: parseFloat(cs.right) - (box.right - full.right),
            y: box.top - full.top - parseFloat(cs.top),
        })
        const cardBox = { top: full.top, right: full.right, width: full.width, height: full.height }

        gsap.killTweensOf(menuEl)
        if (closeEl) gsap.killTweensOf([closeEl, lblMenu, lblClose, pill])

        /* ----- open ----- */
        if (menuOpen) {
            document.body.style.overflow = "hidden"

            // Swapped to expo.inOut for an Apple-like smooth expansion and increased duration slightly 
            const opts = { duration: 0.85, ease: "expo.inOut" }

            // Card starts invisible on top of the MENU word, then turns black as it grows
            const wb = wordBox()
            gsap.set(menuEl, {
                display: "block",
                opacity: 1,
                left: "auto",
                bottom: "auto",
                backgroundColor: CLEAR,
                willChange: "clip-path",
                ...cardBox,
                clipPath: clipFor(wb, MENU_RADIUS),
            })
            // Hide the header MENU button; the card grows out of its box
            gsap.set(menuBtn, { autoAlpha: 0 })

            /* MENU morphs into CLOSE: the in-card button starts exactly on the MENU box
               (same colour, offset back to the card's top-right corner) and settles into its place
               (phone: the very same spot, so it never moves; tablet: 12px inset). A white pill grows
               from the centre of the MENU word behind the label, the text turns black and
               MENU crossfades into CLOSE. */
            if (closeEl) {
                const startColor = getComputedStyle(menuBtn).color
                const cs = getComputedStyle(closeEl)
                gsap.set(closeEl, { autoAlpha: 1, ...closeOffset(cs, wb), color: startColor })
                gsap.set(pill, { scale: 0 })
                gsap.set(lblMenu, { autoAlpha: 1 })
                gsap.set(lblClose, { autoAlpha: 0 })
                gsap.to(closeEl, { x: 0, y: 0, ...opts })
                gsap.to(closeEl, { color: "#000000", duration: 0.35, delay: 0.1, ease: "power2.out" })
                gsap.to(pill, { scale: 1, duration: 0.6, ease: "expo.inOut" })
                gsap.to(lblMenu, { autoAlpha: 0, duration: 0.15, delay: 0.2, ease: "none" })
                gsap.to(lblClose, { autoAlpha: 1, duration: 0.15, delay: 0.35, ease: "none" })
            }

            gsap.to(menuEl, {
                clipPath: clipFull(endRadius),
                backgroundColor: "#000000",
                ...opts,
                onComplete: () => {
                    // Tablet keeps its 16px corners from the md:rounded class; phone is full screen
                    gsap.set(menuEl, { clipPath: "none", willChange: "auto" })
                    // Phone: hand the full-screen box back to the inset-0 class
                    if (!isTablet) gsap.set(menuEl, { clearProps: "top,right,left,bottom,width,height" })
                },
            })

            setRevealActive(true) // MaskRevealText plays its reveal
            return
        }

        /* ----- close ----- */
        document.body.style.overflow = ""

        const finish = () => {
            gsap.set(menuEl, { display: "none" })
            gsap.set(menuEl, { clearProps: clear })
            gsap.set(menuBtn, { clearProps: "opacity,visibility" })
            if (closeEl) gsap.set([closeEl, lblMenu, lblClose, pill], { clearProps: "opacity,visibility,transform,color" })
            setRevealActive(false) // reset text only after the card has closed
        }

        // Nothing open (first render, or closed twice): just make sure everything is reset
        if (getComputedStyle(menuEl).display === "none") {
            finish()
            return
        }

        const endColor = getComputedStyle(menuBtn).color
        
        // Match the Apple-like feel on the close animation too
        const opts = { duration: 0.75, ease: "expo.inOut" }

        // Restate the card's final box (phone's was handed back to CSS) and its window, then shrink the window into the MENU word
        const wb = wordBox()
        gsap.set(menuEl, {
            left: "auto",
            bottom: "auto",
            willChange: "clip-path",
            ...cardBox,
            clipPath: clipFull(endRadius),
        })
        gsap.to(menuEl, { clipPath: clipFor(wb, MENU_RADIUS), backgroundColor: CLEAR, ...opts, onComplete: finish })
        if (closeEl) {
            // Reverse morph: CLOSE glides back onto the MENU box while the pill shrinks into
            // the centre of the word, CLOSE crossfades back to MENU and the text recolours
            const cs = getComputedStyle(closeEl)
            gsap.to(closeEl, { ...closeOffset(cs, wb), ...opts })
            gsap.to(closeEl, { color: endColor, duration: 0.3, delay: 0.2, ease: "power2.in" })
            gsap.to(pill, { scale: 0, duration: 0.5, delay: 0.05, ease: "expo.inOut" })
            gsap.to(lblClose, { autoAlpha: 0, duration: 0.15, delay: 0.05, ease: "none" })
            gsap.to(lblMenu, { autoAlpha: 1, duration: 0.15, delay: 0.2, ease: "none" })
        }
    }, [menuOpen])

    // Close the menu on route change and when resizing up to the desktop header.
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)")
        const onChange = (e) => {
            if (e.matches) setMenuOpen(false)
        }
        mq.addEventListener("change", onChange)
        return () => mq.removeEventListener("change", onChange)
    }, [])

    useEffect(() => {
        return () => {
            document.body.style.overflow = ""
        }
    }, [])

    /* ---------- arriving on the homepage from another page: land on the requested section ----------
       handleNavClick stores the target (e.g. "#services") before the route changes.

       Rules that keep this smooth under the page transition:
       1. Measure WITHOUT the transition's transform. The overlay slides <main> with a translate3d
          while it is covered, so getBoundingClientRect() lies by up to 20% of the viewport. We subtract
          that shift, so the first jump is already exact and nothing is "fixed" later in front of the visitor.
       2. Land once, then re-correct only when the page height really changes (ResizeObserver),
          coalesced to one jump per frame. No fixed timers.
       3. The scroll-linked header is told to ignore the jump while we land.
       4. When settled (400ms with no layout change) we tell the overlay, which holds its reveal until then. */

    useLayoutEffect(() => {
        if (location.pathname !== "/") return

        let target = null
        try {
            target = sessionStorage.getItem(PENDING_SCROLL_KEY)
        } catch {}
        if (!target && location.hash) target = location.hash
        if (!target) return
        try {
            sessionStorage.removeItem(PENDING_SCROLL_KEY)
        } catch {}

        let cancelled = false
        let raf = 0
        let quietTimer = 0
        let hardStop = 0
        let ro = null

        // How far the page transition currently has <main> shifted (0 at rest)
        const pageShift = () => {
            const main = document.querySelector("[data-page-transition]")
            if (!main) return 0
            const t = getComputedStyle(main).transform
            return t && t !== "none" ? new DOMMatrixReadOnly(t).m42 : 0
        }
        // Absolute scroll position of the section, independent of any transition transform
        const targetY = (el) => el.getBoundingClientRect().top - pageShift() + window.scrollY + SCROLL_OFFSET

        const jump = (el) => {
            const y = Math.max(0, targetY(el))
            // "instant" so a CSS scroll-behavior: smooth can never turn the landing jump into an animation
            window.scrollTo({ top: y, behavior: "instant" })
        }
        const offBy = (el) => Math.abs(targetY(el) - window.scrollY)

        const userEvents = ["wheel", "touchstart", "keydown", "mousedown"]

        const finish = () => {
            if (cancelled) return
            cancelled = true
            cancelAnimationFrame(raf)
            clearTimeout(quietTimer)
            clearTimeout(hardStop)
            ro?.disconnect()
            userEvents.forEach((ev) => window.removeEventListener(ev, finish))
            landingRef.current = false
            announcePageLanded()
        }

        // The visitor takes over: stop correcting immediately
        userEvents.forEach((ev) => window.addEventListener(ev, finish, { passive: true }))

        landingRef.current = true

        // Re-correct only when the page actually changes height
        const watchLayout = (el) => {
            let pending = false
            ro = new ResizeObserver(() => {
                if (cancelled || pending) return
                pending = true
                raf = requestAnimationFrame(() => {
                    pending = false
                    if (cancelled) return
                    if (offBy(el) > 1) jump(el)
                    clearTimeout(quietTimer)
                    quietTimer = setTimeout(finish, 400) // 400ms of no layout change = settled
                })
            })
            ro.observe(document.documentElement)
            quietTimer = setTimeout(finish, 400)
            hardStop = setTimeout(finish, 2500) // never listen forever
        }

        const land = (el) => {
            jump(el) // this runs before paint, so the first frame is already at the section
            const fontsReady = document.fonts?.ready ?? Promise.resolve()
            fontsReady.then(() => {
                if (cancelled) return
                raf = requestAnimationFrame(() => {
                    // one frame for the font swap to re-wrap the hero
                    if (cancelled) return
                    if (offBy(el) > 1) jump(el)
                    watchLayout(el)
                })
            })
        }

        const first = document.querySelector(target)
        if (first) {
            land(first)
        } else {
            // Section not mounted yet: wait frame by frame (max ~4s)
            let frames = 0
            const poll = () => {
                if (cancelled) return
                const el = document.querySelector(target)
                if (el) return land(el)
                if (++frames > 240) return finish()
                raf = requestAnimationFrame(poll)
            }
            raf = requestAnimationFrame(poll)
        }

        return finish
    }, [location.pathname, location.hash])

    /* ---------- navigation ---------- */

    const handleNavClick = (e, targetId) => {
        e.preventDefault()
        const wasOpen = menuOpen
        setMenuOpen(false)

        const go = (to) => {
            if (pageTransition?.triggerTransition) pageTransition.triggerTransition(to)
            else navigate(to)
        }

        const run = () => {
            // Work has its own page
            if (targetId === "#work") {
                if (location.pathname !== WORK_ROUTE) go(WORK_ROUTE)
                return
            }
            // Off the homepage: remember the section, play the page transition, then land on it
            if (location.pathname !== "/") {
                try {
                    sessionStorage.setItem(PENDING_SCROLL_KEY, targetId)
                } catch {}
                go("/" + targetId)
                return
            }
            if (scrollToTarget) {
                scrollToTarget(targetId)
            } else {
                document.querySelector(targetId)?.scrollIntoView({ behavior: "smooth" })
            }
        }

        // Wait for the menu overlay to finish closing so scrolling is unlocked.
        if (wasOpen) setTimeout(run, 650)
        else run()
    }

    const handleLogoClick = (e) => {
        e.preventDefault()
        setMenuOpen(false)
        if (location.pathname === "/") {
            if (scrollToTarget) scrollToTarget(0)
            else window.scrollTo({ top: 0, behavior: "smooth" })
        } else if (pageTransition?.triggerTransition) {
            pageTransition.triggerTransition("/")
        } else {
            navigate("/")
        }
    }

    /* ---------- colors ---------- */

    // Always white: mix-blend-difference on the <header> inverts it over light backgrounds
    const textColorClass = "text-white"

    const logoSize = "h-[28px] lg:h-[34px] w-auto block"

    return (
        <>
            <header
                ref={headerRef}
                style={{ opacity }}
                className="fixed top-0 left-0 w-full h-[80px] z-50 px-[20px] pointer-events-none select-none mix-blend-difference"
            >
                {/* Content row: 12-column grid, 20px gutters */}
                <div ref={rowRef} className="grid grid-cols-12 gap-x-[20px] items-center h-full">
                    {/* Logo */}
                    <div className="col-span-6 pointer-events-auto">
                        <a href="/" onClick={handleLogoClick} className="relative inline-block cursor-pointer" aria-label="Home">
                            <img src={LOGO_WHITE} alt="Iyosias" draggable={false} className={logoSize} />
                        </a>
                    </div>

                    {/* Desktop nav (1024px and up): 4 plain text links spread from column 7 to the right edge */}
                    <nav
                        className={`hidden lg:flex col-start-7 col-span-6 items-center justify-between pointer-events-none ${textColorClass}`}
                    >
                        {NAV.map(({ desktop, target, label }) => (
                            <a
                                key={label}
                                href={hrefFor(target)}
                                onClick={(e) => handleNavClick(e, target)}
                                className="block w-fit cursor-pointer pointer-events-auto"
                            >
                                <Roll className={NAV_TEXT}>{desktop}</Roll>
                            </a>
                        ))}
                        <a
                            href={GET_IN_TOUCH.href}
                            className="block w-fit cursor-pointer pointer-events-auto"
                        >
                            <Roll className={NAV_TEXT}>{GET_IN_TOUCH.label}</Roll>
                        </a>
                    </nav>

                    {/* Mobile + tablet Menu label (below 1024px), no hover animation */}
                    <div className="lg:hidden col-span-6 flex justify-end pointer-events-auto">
                        <button
                            ref={menuBtnRef}
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-expanded={menuOpen}
                            aria-controls="mobile-menu"
                            className={`${MENU_BTN} ${MENU_BOX} ${textColorClass}`}
                        >
                            <Roll hover={false} className={MENU_BTN_TEXT}>Menu</Roll>
                        </button>
                    </div>
                </div>
            </header>

            {/* Tablet only (768-1023px): click outside the dropdown card to close it */}
            {menuOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setMenuOpen(false)}
                    className="hidden md:block lg:hidden fixed inset-0 z-[99]"
                />
            )}

            {/* Menu: full screen on phone (<768px), rounded dropdown card on tablet (768-1023px) */}
            <div
                id="mobile-menu"
                ref={mobileMenuRef}
                style={{ display: "none" }}
                className="lg:hidden fixed z-[100] bg-black text-white inset-0 overflow-hidden md:inset-auto md:top-[10px] md:right-[10px] md:w-[max(60vw,520px)] md:h-[min(640px,calc(100dvh-20px))] md:rounded-[16px]"
            >
                <div className="absolute top-0 right-0 flex flex-col w-[100vw] h-[100dvh] px-[20px] pb-[40px] md:w-[max(60vw,520px)] md:h-[min(640px,calc(100dvh-20px))] md:p-[20px]">
                    {/* Phone: same 80px row as the header so the logo sits where it does in the bar.
                        Tablet: the header logo stays visible outside the card. */}
                    <div className="flex items-center w-full h-[80px] flex-none md:hidden">
                        <a href="/" onClick={handleLogoClick} className="block cursor-pointer" aria-label="Home">
                            <img src={LOGO_WHITE} alt="Iyosias" draggable={false} className="h-[28px] w-auto block" />
                        </a>
                    </div>

                    {/* Close: box in the card's top-right corner (phone and tablet).
                        Same box as the header Menu button. A white pill grows from the centre of the
                        MENU word behind the label, and MENU crossfades into CLOSE. No hover animation. */}
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close menu"
                        className={`${MENU_BTN} ${MENU_BOX} absolute z-10 top-[27px] right-[20px] md:top-[12px] md:right-[12px] text-white`}
                    >
                        <span ref={closePillRef} aria-hidden="true" className="absolute inset-0 rounded-full bg-white" />
                        <span className="relative block w-full h-[16px] overflow-hidden">
                            <span ref={closeLblMenuRef} className="absolute inset-0 flex items-center justify-center pt-[2px]">
                                <span className={MENU_BTN_TEXT}>Menu</span>
                            </span>
                            <span ref={closeLblCloseRef} className="absolute inset-0 flex items-center justify-center pt-[2px]">
                                <Roll hover={false} className={MENU_BTN_TEXT}>Close</Roll>
                            </span>
                        </span>
                    </button>

                    {/* Main links. Phone: sit 24px above the divider over the socials. Tablet: start 22% down the card (matches the Figma frame) */}
                    <nav className="flex flex-col mt-auto mb-[24px] md:mt-0 md:mb-0 md:absolute md:left-0 md:right-0 md:top-[22%] md:px-[40px]">
                        {NAV.map(({ label, target }, idx) => (
                            <a
                                key={label}
                                href={hrefFor(target)}
                                onClick={(e) => handleNavClick(e, target)}
                                className="block w-fit cursor-pointer"
                            >
                                <Roll text={label} className="H3 !leading-[1.12] uppercase !whitespace-nowrap max-md:!text-[clamp(28px,8.2vw,36px)]">
                                    <MaskRevealText
                                        as="span"
                                        mode="words"
                                        active={revealActive}
                                        delay={0.45 + idx * 0.12}
                                        stagger={0.06}
                                        className="block"
                                    >
                                        {label}
                                    </MaskRevealText>
                                </Roll>
                            </a>
                        ))}
                    </nav>

                    {/* Bottom block pinned to the card bottom: divider, socials, divider, Get In Touch */}
                    <div className="md:mt-auto flex flex-col md:px-[20px] md:pb-[28px]">
                        <div className="h-px w-full bg-white/15 mb-[20px]" />

                        {/* Socials */}
                        <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-[4px]">
                                {SOCIALS_LEFT.map(({ label, href }, idx) => (
                                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="block w-fit cursor-pointer">
                                        <Roll text={label} className="Nav !text-[16px] uppercase">
                                            <MaskRevealText
                                                as="span"
                                                mode="words"
                                                active={revealActive}
                                                delay={1.0 + idx * 0.08}
                                                stagger={0.05}
                                                className="block"
                                            >
                                                {label}
                                            </MaskRevealText>
                                        </Roll>
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/15 mt-[16px]" />

                        {/* Get In Touch */}
                        <FitWidth className="mt-[16px]">
                            <a
                                href={GET_IN_TOUCH.href}
                                onClick={() => setMenuOpen(false)}
                                className="block w-fit cursor-pointer"
                            >
                                <Roll text="GET IN TOUCH" className="H3 !text-[1em] !leading-[1.05] uppercase block">
                                    <MaskRevealText
                                        as="span"
                                        mode="words"
                                        active={revealActive}
                                        delay={0.45 + NAV.length * 0.12}
                                        stagger={0.06}
                                        className="block"
                                    >
                                        GET IN TOUCH
                                    </MaskRevealText>
                                </Roll>
                            </a>
                        </FitWidth>
                    </div>
                </div>
            </div>
        </>
    )
}