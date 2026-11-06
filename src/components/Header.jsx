// src/components/Header.jsx

import React, { useState, useRef, useEffect, useLayoutEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import gsap from "gsap"
import MaskRevealText from "./MaskRevealText"
import { usePageTransition } from "./PageTransitionOverlay"

/* ------------------------------------------------------------------
   Layout (matches the 1512px reference)
   - 12-column grid, 20px side padding, 20px gutters
   - Fixed 80px bar height, content vertically centred
   - Full desktop header from 1024px and up (lg:): logo left, then
     WORK / SERVICE / ABOUT ME / GET IN TOUCH as plain text links,
     spread evenly from column 7 to the right edge
   - Below 1024px: plain MENU text with the same rolling hover. Pressing it
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

const GET_IN_TOUCH = { label: "Get In Touch", href: "mailto:info@iyosiasdesign.com" }

// Menu panel footer socials
const SOCIALS_LEFT = [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/iyosias-tekezeshoa-3524031ba/" },
    { label: "Twitter(X)", href: "https://x.com/IyosiasTeke" },
    { label: "Instagram", href: "https://www.instagram.com/iyosias.t/" },
]

// Desktop nav link text
const NAV_TEXT = "Nav !text-[16px] !leading-none uppercase"

// Menu + Close buttons. Text style comes from NAV_TEXT on the <Roll>.
const MENU_BTN = "inline-flex shrink-0 items-center whitespace-nowrap cursor-pointer"
// Menu / Close buttons: no stroke, identical 77 x 26 box so one can morph into the other
const MENU_BOX = "w-[77px] h-[26px] justify-center"

/* ------------------------------------------------------------------
   Roll: GSAP version of the RollingLink hover animation.
   Visible text rolls up and out while a duplicate rolls up from below.
   Hover is read from the closest <a> / <button>, so the whole pill or
   link is the hover target. Put the font classes on <Roll className>
   so both copies match. Pass `text` when children is not a plain string.
------------------------------------------------------------------- */

const ROLL = { duration: 0.6, ease: "power3.inOut", padY: 0.12, offset: 128 }

function Roll({ children, text, className = "" }) {
    const wrapRef = useRef(null)
    const topRef = useRef(null)
    const bottomRef = useRef(null)

    useEffect(() => {
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
    }, [])

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

export default function Header({ opacity = 1, scrollToTarget, lenisRef }) {
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

    /* ---------- phone: hide on scroll down, show on scroll up ---------- */

    useEffect(() => {
        const el = headerRef.current
        if (!el) return

        const mq = window.matchMedia("(max-width: 767px)")
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const HIDE_AFTER = 12 // px scrolled down in one direction before hiding
        const SHOW_AFTER = 8 // px scrolled up in one direction before showing

        let hidden = false
        let lastY = Math.max(0, window.scrollY)
        let acc = 0
        let frame = null

        const move = (hide) => {
            if (hidden === hide) return
            hidden = hide
            gsap.to(el, {
                yPercent: hide ? -100 : 0,
                duration: reduce ? 0 : 0.5,
                ease: "power3.inOut",
                overwrite: "auto",
            })
        }

        const update = () => {
            frame = null
            const y = Math.max(0, window.scrollY) // ignore iOS rubber-band overscroll
            const diff = y - lastY
            lastY = y

            if (menuOpen || y <= 10) {
                acc = 0
                move(false)
                return
            }
            if (diff === 0) return

            // Reset the running total whenever the direction flips
            if ((diff > 0) !== (acc > 0)) acc = 0
            acc += diff

            if (acc > HIDE_AFTER && y > el.offsetHeight) move(true)
            else if (acc < -SHOW_AFTER) move(false)
        }

        const onScroll = () => {
            if (frame === null) frame = requestAnimationFrame(update)
        }

        const reset = () => {
            hidden = false
            acc = 0
            gsap.killTweensOf(el)
            gsap.set(el, { clearProps: "transform" })
        }

        const attach = () => {
            lastY = Math.max(0, window.scrollY)
            window.addEventListener("scroll", onScroll, { passive: true })
        }
        const detach = () => {
            window.removeEventListener("scroll", onScroll)
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
        if (menuOpen) move(false)
        mq.addEventListener("change", onBreakpoint)

        return () => {
            mq.removeEventListener("change", onBreakpoint)
            detach()
            reset()
        }
    }, [menuOpen, location.pathname])

    /* ---------- menu: the black card grows out of the MENU word and shrinks back into it ----------
       Tablet: card ends as the dropdown, 60vw wide with a 520px minimum. Phone: card ends full screen.
       The card's content is pinned top-right at its final size, so nothing reflows while it grows. */

    useEffect(() => {
        const menuEl = mobileMenuRef.current
        const closeEl = closeBtnRef.current
        const lblMenu = closeLblMenuRef.current
        const lblClose = closeLblCloseRef.current
        const menuBtn = menuBtnRef.current
        if (!menuEl || !menuBtn) return

        // Tablet = 768px and up (this menu is only used below 1024px)
        const isTablet = window.matchMedia("(min-width: 768px)").matches
        const clear = "top,right,left,bottom,width,height,backgroundColor,borderRadius,clipPath,opacity"
        const CLEAR = "rgba(0,0,0,0)"

        const full = isTablet
            ? {
                  top: 10,
                  right: 10,
                  width: Math.max(window.innerWidth * 0.6, 520),
                  height: Math.min(640, window.innerHeight - 20),
                  borderRadius: "8px 8px 8px 8px",
              }
            : {
                  top: 0,
                  right: 0,
                  width: window.innerWidth,
                  height: window.innerHeight,
                  borderRadius: "0px 0px 0px 0px",
              }

        // Exact box of the MENU word
        const wordBox = () => {
            const r = menuBtn.getBoundingClientRect()
            return {
                top: r.top,
                right: window.innerWidth - r.right,
                width: r.width,
                height: r.height,
                borderRadius: "0px 0px 0px 0px",
            }
        }

        gsap.killTweensOf(menuEl)
        if (closeEl) gsap.killTweensOf([closeEl, lblMenu, lblClose])

        /* ----- open ----- */
        if (menuOpen) {
            document.body.style.overflow = "hidden"
            lenisRef?.current?.stop()

            const opts = { duration: 0.8, ease: "power3.inOut" }

            // Card starts invisible on top of the MENU word, then turns black as it grows
            gsap.set(menuEl, {
                display: "block",
                clipPath: "none",
                opacity: 1,
                left: "auto",
                bottom: "auto",
                backgroundColor: CLEAR,
                ...wordBox(),
            })
            // Hide the header MENU button; the card grows out of its box
            gsap.set(menuBtn, { autoAlpha: 0 })

            /* MENU morphs into CLOSE: the in-card button starts exactly on the MENU box
               (same size, same colour, offset back to the card's top-right corner), then
               settles into its place (phone: the very same spot, so it never moves; tablet: 12px inset), turns white and its label rolls MENU -> CLOSE. */
            if (closeEl) {
                const startColor = getComputedStyle(menuBtn).color
                const cs = getComputedStyle(closeEl)
                gsap.set(closeEl, { autoAlpha: 1, x: parseFloat(cs.right), y: -parseFloat(cs.top), color: startColor })
                gsap.set(lblMenu, { yPercent: 0 })
                gsap.set(lblClose, { yPercent: 100 })
                gsap.to(closeEl, { x: 0, y: 0, color: "#ffffff", ...opts })
                gsap.to(lblMenu, { yPercent: -100, duration: 0.5, ease: "power3.inOut" })
                gsap.to(lblClose, { yPercent: 0, duration: 0.5, ease: "power3.inOut" })
            }

            gsap.to(menuEl, {
                ...full,
                backgroundColor: "#000000",
                ...opts,
                onComplete: () => {
                    // Phone: hand the full-screen box back to the inset-0 class
                    if (!isTablet) gsap.set(menuEl, { clearProps: "top,right,left,bottom,width,height" })
                },
            })

            setRevealActive(true) // MaskRevealText plays its reveal
            return
        }

        /* ----- close ----- */
        document.body.style.overflow = ""
        lenisRef?.current?.start()

        const finish = () => {
            gsap.set(menuEl, { display: "none" })
            gsap.set(menuEl, { clearProps: clear })
            gsap.set(menuBtn, { clearProps: "opacity,visibility" })
            if (closeEl) gsap.set([closeEl, lblMenu, lblClose], { clearProps: "opacity,visibility,transform,color" })
            setRevealActive(false) // reset text only after the card has closed
        }

        // Nothing open (first render, or closed twice): just make sure everything is reset
        if (getComputedStyle(menuEl).display === "none") {
            finish()
            return
        }

        const endColor = getComputedStyle(menuBtn).color
        const opts = { duration: 0.6, ease: "power3.inOut" }

        // Phone's full-screen box was handed back to CSS after opening, so restate it
        gsap.set(menuEl, { left: "auto", bottom: "auto", ...(isTablet ? {} : full) })
        gsap.to(menuEl, { ...wordBox(), backgroundColor: CLEAR, ...opts, onComplete: finish })
        if (closeEl) {
            // Reverse morph: CLOSE glides back onto the MENU box, recolours and rolls back to MENU
            const cs = getComputedStyle(closeEl)
            gsap.to(closeEl, { x: parseFloat(cs.right), y: -parseFloat(cs.top), color: endColor, ...opts })
            gsap.to(lblMenu, { yPercent: 0, duration: 0.45, ease: "power3.inOut" })
            gsap.to(lblClose, { yPercent: 100, duration: 0.45, ease: "power3.inOut" })
        }
    }, [menuOpen, lenisRef])

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
            lenisRef?.current?.start()
        }
    }, [lenisRef])

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
            // Off the homepage: play the page transition, then land on the section
            if (location.pathname !== "/") {
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

                    {/* Mobile + tablet Menu label (below 1024px) */}
                    <div className="lg:hidden col-span-6 flex justify-end pointer-events-auto">
                        <button
                            ref={menuBtnRef}
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-expanded={menuOpen}
                            aria-controls="mobile-menu"
                            className={`${MENU_BTN} ${MENU_BOX} ${textColorClass}`}
                        >
                            <Roll className={NAV_TEXT}>Menu</Roll>
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
                className="lg:hidden fixed z-[100] bg-black text-white inset-0 overflow-hidden md:inset-auto md:top-[10px] md:right-[10px] md:w-[max(60vw,520px)] md:h-[min(640px,calc(100dvh-20px))] md:rounded-[8px]"
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
                        Same box as the header Menu button; the two labels roll over each other. */}
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close menu"
                        className={`${MENU_BTN} ${MENU_BOX} absolute z-10 top-[27px] right-[20px] md:top-[12px] md:right-[12px] text-white`}
                    >
                        <span className="relative block w-full h-[16px] overflow-hidden">
                            <span ref={closeLblMenuRef} className="absolute inset-0 flex items-center justify-center">
                                <span className="Nav !text-[16px] !leading-none uppercase">Menu</span>
                            </span>
                            <span ref={closeLblCloseRef} className="absolute inset-0 flex items-center justify-center">
                                <Roll className={NAV_TEXT}>Close</Roll>
                            </span>
                        </span>
                    </button>

                        {/* Main links: start 22% down the card (matches the Figma frame) */}
                        <nav className="absolute left-0 right-0 top-[22%] flex flex-col px-[20px] md:px-[40px]">
                            {NAV.map(({ label, target }, idx) => (
                                <a
                                    key={label}
                                    href={hrefFor(target)}
                                    onClick={(e) => handleNavClick(e, target)}
                                    className="block w-fit cursor-pointer"
                                >
                                    <Roll text={label} className="H3 !leading-[1.12] uppercase !whitespace-nowrap max-md:!text-[clamp(32px,10.9vw,48px)]">
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
                    <div className="mt-auto flex flex-col md:px-[20px] md:pb-[28px]">
                        <div className="h-px w-full bg-white/30 mb-[20px]" />

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

                        <div className="h-px w-full bg-white/30 mt-[16px]" />

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