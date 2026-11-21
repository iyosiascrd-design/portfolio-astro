// src/pages/ZhongshanCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import MaskRevealText from "../components/MaskRevealText"
import { usePageReady, usePageHeroReady, usePageTransition } from "../components/PageTransitionOverlay"
import NextProject from "../components/NextProject"
import { useIsMobile } from "../components/MobileImageGroups"
import { Img as BaseImg, Media, isVideo, HERO_IMG_PROPS } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.js"

gsap.registerPlugin(ScrollTrigger)

/*
  EDITORIAL LAYOUT SYSTEM (12-col desktop grid, 20px gutters, 1680px ceiling)
  Calibrated to the 1512 x 982 desktop spec (1472px inner width with 20px side padding).
  Column spans used below: 1 col = 104.33px, so 3 cols = 353, 4 = 477, 5 = 602, 6 = 726, 8 = 975.
*/

const HERO_POS_MOBILE = "50% 30%"
const HERO_POS_DESKTOP = "50% 50%"

const HERO_TITLE = "Zhongshan"
const HERO_YEAR = "Completed 2025"
const HERO_TEXT =
  "Turning the complexity of sourcing an entire building into a refined architectural brand that feels clear, tangible and trustworthy."

const ASSETS = {
  hero: "/zhongshan-house.jpg",
  suppliers: "/zhongshan-logo-animation.webm",
  logoConstruction: "/zhongshan-logo-construction.jpg",
  book: "/zhongshan-book.jpg",
  font: "/zhongshan-font.jpg",
  brass: "/zhongshan-brass.jpg",
  typeTablet: "/zhongshan-type-tablet.webm",
  color: "/zhongshan-color.webm",
  colorTexture: "/zhongshan-color-texture.jpg",
  hardhat: "/zhongshan-hardhat.jpg",
  flyer: "/zhongshan-flyer.jpg",
  cardboard: "/zhongshan-cardboard.jpg",
  screen: "/zhongshan-screen.jpg",
  poster: "/zhongshan-poster.jpg",
  folder: "/zhongshan-folder.jpg",
  boxes: "/zhongshan-boxes.jpg",
  cargo: "/zhongshan-cargo.jpg",
  construction: "/zhongshan-construction.jpg",
  tiles: "/zhongshan-tiles.webm",
  wallPanel: "/zhongshan-wall-panel.jpg",
  floorplan: "/zhongshan-floorplan.webm",
  doors: "/zhongshan-doors.jpg",
  bathroom: "/zhongshan-bathroom.jpg",
  kitchen: "/zhongshan-kitchen.jpg",
  living: "/zhongshan-living.jpg",
}

const TYPE_CARD_LIVE_TEXT = false

const PRELOAD_SRCS = Object.entries(ASSETS).filter(([k]) => k !== "hero").map(([, v]) => v)

const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

// Shared editorial layout tokens
const CONTAINER = "w-full max-w-[1680px] mx-auto"
const HEADING_CLS = `${CS_HEADING} [text-wrap:balance] max-md:![font-size:var(--type-h2-size)] md:![font-size:var(--type-case-h2-size)] max-md:leading-none max-md:tracking-[-0.03em] lg:-mt-[0.12em]`
const PARA_CLS = `${CS_PARA} [text-wrap:pretty] ![font-size:var(--type-case-body-size)] max-md:leading-[1.45] max-md:tracking-[-0.02em]`

// Grid whose single row fills the section height on desktop (so images can use h-full instead of an aspect ratio)
const FILL_GRID =
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0"
// Plain grid sized by its content
const FLOW_GRID = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px]"

const Img = (props) => <BaseImg placeholder={MEDIA_PLACEHOLDER} hideOnError {...props} />

const Fill = ({ className = "", ...props }) => (
  <Img className={`!absolute !inset-0 !w-full !h-full !aspect-auto ${className}`} {...props} />
)

// Reusable centered pause frame for standalone wide visuals.
// `frame` = exact desktop size from the spec ({ w, h } at 1512 x 982, 1472px content width).
function CenteredInset({ aspectClass = "aspect-[16/9]", ratio = 16 / 9, frame, children, className = "", mobileAspect = "" }) {
  const lg = frame
    ? {
        "--inset-lg-w": `min(${((frame.w / 1472) * 100).toFixed(3)}%, calc(${((frame.h / 982) * 100).toFixed(3)}dvh * ${(frame.w / frame.h).toFixed(4)}))`,
        "--inset-lg-ar": `${frame.w} / ${frame.h}`,
      }
    : null
  return (
    <section
      data-header-bg="light"
      className={`w-full py-[48px] max-md:py-[36px] lg:min-h-[100dvh] lg:py-[100px] flex flex-col lg:justify-center ${className}`}
    >
      <div
        className={`relative w-full ${aspectClass} ${mobileAspect} max-md:!max-w-none lg:mx-auto ${
          frame ? "lg:![max-width:var(--inset-lg-w)] lg:![aspect-ratio:var(--inset-lg-ar)]" : ""
        }`}
        style={{ maxWidth: `min(82%, calc(72dvh * ${ratio.toFixed(3)}))`, ...lg }}
      >
        {children}
      </div>
    </section>
  )
}

function InViewGif({ src, alt, className = "", threshold = 0.15, fit = "cover" }) {
  const boxRef = useRef(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setStarted(true)
      return
    }

    let warmIo
    if (!isVideo(src)) {
      warmIo = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const warm = new Image()
            warm.decoding = "async"
            warm.src = src
            warmIo.disconnect()
          }
        },
        { rootMargin: "100% 0px" }
      )
      warmIo.observe(el)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: "120px 0px" }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      warmIo?.disconnect()
    }
  }, [src, threshold])

  return (
    <div data-reveal ref={boxRef} className={`relative isolate w-full overflow-hidden ${className}`}>
      {started && (
        <Media
          src={src}
          alt={alt}
          lazy={false}
          className={
            fit === "contain"
              ? "absolute inset-0 w-full h-full max-w-none"
              : "absolute -inset-px w-[calc(100%+2px)] h-[calc(100%+2px)] max-w-none object-cover scale-[1.012]"
          }
          {...(fit === "contain"
            ? { imgClassName: "w-full h-full object-contain", mediaProps: { style: { objectFit: "contain", objectPosition: "center" } } }
            : {})}
        />
      )}
    </div>
  )
}

export default function ZhongshanCaseStudy() {
  const outletCtx = useOutletContext()
  const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  const heroFade = outletCtx?.heroFade

  const isMobile = useIsMobile()
  const ready = usePageReady()
  const heroReady = usePageHeroReady()
  const pageTransition = usePageTransition()

  const rootRef = useRef(null)
  const heroRef = useRef(null)
  const [heroLoaded, setHeroLoaded] = useState(false)

  useEffect(() => {
    setHeaderLight(false)
    window.scrollTo(0, 0)
    if (heroFade) {
      heroFade.set(1)
    }
  }, [setHeaderLight, heroFade])

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    if (!pageTransition?.isSharedEntry?.()) gsap.set("[data-hero-img]", { scale: 1.25 })
    gsap.set("[data-hero-meta]", { opacity: 0 })
  }, [pageTransition])

  useEffect(() => {
    const img = heroRef.current?.querySelector("[data-hero-img]")
    let cancelled = false

    const settled = () => {
      if (!cancelled) setHeroLoaded(true)
    }

    const decoded = img?.decode ? img.decode() : Promise.resolve()
    decoded.then(settled, settled)
    const fallback = setTimeout(settled, 4000)

    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
  }, [])

  // Hero image scales down in sync with the overlay lifting
  useEffect(() => {
    if (!heroReady || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-img]", { scale: 1, duration: 2, ease: "power3.out" })
    }, heroRef)
    return () => ctx.revert()
  }, [heroReady])

  // Meta row fade + unified GSAP scroll-arrow cue
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-meta]", { opacity: 1, duration: 0.9, delay: 0.6, ease: "power2.out" })
      gsap
        .timeline({ repeat: 2, repeatDelay: 0.8 })
        .fromTo(
          "[data-scroll-arrow]",
          { y: -8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, ease: "power2.out" }
        )
        .to("[data-scroll-arrow]", { y: 10, opacity: 0, duration: 0.78, ease: "power2.in" })
    }, heroRef)
    return () => ctx.revert()
  }, [ready])

  // Refresh ScrollTrigger when page settles or mobile/desktop layout switches
  useEffect(() => {
    if (!ready) return
    const t = gsap.delayedCall(0.3, () => ScrollTrigger.refresh())
    return () => t.kill()
  }, [ready, isMobile])

  const assetsToPreload = isMobile ? PRELOAD_SRCS.slice(0, 2) : PRELOAD_SRCS
  useIdlePreload(assetsToPreload, ready && heroLoaded)
  useCaseStudyReveal(rootRef)

  return (
    <div
      ref={rootRef}
      data-page-transition=""
      className="w-full min-h-screen overflow-x-clip bg-[var(--bg-light)] text-[var(--text-light-primary)]"
    >
      {/* HERO */}
      <section
        data-header-bg="dark"
        ref={heroRef}
        style={{ "--hero-pos-m": HERO_POS_MOBILE, "--hero-pos-d": HERO_POS_DESKTOP }}
        className="sticky top-0 z-0 w-full h-[100lvh] bg-[var(--bg-surface-dark)] overflow-hidden flex flex-col justify-end px-[var(--page-pad)] pb-[calc(max(40px,env(safe-area-inset-bottom))_+_100lvh_-_100dvh)] md:pb-[calc(var(--cs-gap)_+_100lvh_-_100dvh)] lg:pb-[calc(64px_+_100lvh_-_100dvh)]"
      >
        <Media
          src={ASSETS.hero}
          alt="Zhongshan brand identity"
          mediaProps={{ "data-hero-img": "", ...HERO_IMG_PROPS, [FETCH_PRIORITY_KEY]: "high" }}
          className="absolute inset-0 w-full h-full object-cover [object-position:var(--hero-pos-m)] md:[object-position:var(--hero-pos-d)] z-0 will-change-transform"
        />
        <div className={CS_HERO_SCRIM} aria-hidden="true" />

        <div className={`${CONTAINER} relative z-10`}>
          <div
            data-hero-meta
            className="max-md:fixed max-md:inset-x-[var(--page-pad)] max-md:top-[max(22.3%,calc(env(safe-area-inset-top)+88px))] md:relative flex justify-between max-md:items-start md:grid md:grid-cols-12 md:max-lg:gap-x-[12px] lg:gap-x-[16px] text-white text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold [font-family:var(--font-display)]"
          >
            <span className="md:col-span-6 inline-flex flex-col items-start gap-[4px]">
              <span>Brand Identity</span>
              <span>3D Visuals</span>
            </span>
            <span className="max-md:hidden md:col-start-7 md:col-span-3">{HERO_YEAR}</span>
            <span className="inline-flex items-center gap-[0.4em] md:col-start-10 md:col-span-3 md:justify-self-end">
              Scroll Down
              <span data-scroll-arrow className="inline-flex">
                <ArrowDown className="w-[1.1em] h-[1.1em]" strokeWidth={2.2} aria-hidden="true" />
              </span>
            </span>
          </div>

          <div className="[container-type:inline-size] flex flex-col lg:flex-row justify-between lg:items-end w-full min-w-0 text-white pt-0 md:pt-[100px] lg:pt-[180px]">
            <div className="max-w-[min(660px,46vw)] max-lg:max-w-none md:max-lg:max-w-[60vw] max-lg:mb-[48px]">
              <MaskRevealText
                as="p"
                active={ready}
                mode="words"
                delay={0.25}
                stagger={0.05}
                className={`${CS_HERO_PARA} [text-wrap:pretty]`}
              >
                {HERO_TEXT}
              </MaskRevealText>
            </div>

            <MaskRevealText
              as="h1"
              mode="words"
              active={ready}
              delay={0}
              className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] whitespace-nowrap w-full max-w-full !tracking-[-0.03em] !text-[14.6cqw] lg:!text-[116px]"
            >
              {HERO_TITLE}
            </MaskRevealText>
          </div>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] max-md:overflow-x-clip">
        <div className={`${CONTAINER} flex flex-col gap-[12px] md:gap-[16px] lg:gap-0`}>
          {/* 1. SPLIT INTRO */}
          <section
            data-header-bg="light"
            className="w-full pt-[80px] max-md:pt-[117px] lg:pt-[calc(var(--header-h,64px)+20px)] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <div
              className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0"
            >
              <div className="lg:col-start-1 lg:col-span-5 flex flex-col gap-[20px] lg:justify-between">
                <h2 className={HEADING_CLS}>
                  Beyond finding<br /> suppliers
                </h2>
                <p className={`${PARA_CLS}`}>
                  Sourcing an entire building means navigating countless suppliers, materials and decisions. The challenge was to turn that complexity into a refined architectural brand that makes the process feel clearer, more tangible and trustworthy.
                </p>
              </div>

              <div className="relative w-full aspect-[4/5] max-md:aspect-[4/5] max-md:mt-[16px] lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-7 lg:col-span-6 overflow-hidden">
                <Fill src={ASSETS.logoConstruction} alt="Zhongshan identity introduction" parallax={false} className="bg-[#1b1b1b]" />
              </div>
            </div>
          </section>

          {/* 2. LOGO INSET */}
          <CenteredInset aspectClass="aspect-[1228/624]" mobileAspect="max-md:!aspect-[16/10]" ratio={1228 / 624} frame={{ w: 1228, h: 624 }}>
            <Fill src={ASSETS.suppliers} alt="Zhongshan logo animation" />
          </CenteredInset>

          {/* 3. TECHNICAL BY NATURE */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-[40px] md:pt-[80px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[68px] max-md:mb-[28px] md:mb-[48px] lg:mb-[64px]`}>
              Technical by<br className="md:hidden" /> nature Editorial<br className="md:hidden" /> by design
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Inter balances bold editorial headlines with crisp, legible numbers across technical spec tables.
            </p>

            <div className={`${FLOW_GRID} lg:items-start max-md:!grid-cols-[1.25fr_1fr]`}>
              <div className="relative w-full aspect-[477/548] max-md:order-1 lg:col-start-1 lg:col-span-4 [container-type:inline-size] overflow-hidden text-white">
                <Fill src={ASSETS.font} alt="Inter Variable type specimen" parallax={false} />
                {TYPE_CARD_LIVE_TEXT && (
                  <div className="absolute inset-0 flex flex-col justify-between p-[13cqw]">
                    <span className="block text-[4.19cqw] font-bold leading-none tracking-[-0.01em]">TYPOGRAPHY</span>
                    <div className="flex flex-col gap-[6.8cqw]">
                      <div className="flex flex-col gap-[3.85cqw]">
                        <span className="block text-[2.96cqw] font-medium leading-none tracking-[-0.01em]">PRIMARY FONT</span>
                        <span className="block text-[4.73cqw] font-bold leading-none tracking-[-0.01em]">
                          Inter<br />Variable
                        </span>
                      </div>
                      <span
                        className="block text-[30.2cqw] font-medium leading-none tracking-[-0.01em]"
                        style={{ fontFamily: '"Inter Variable", "InterVariable", Inter, system-ui, sans-serif' }}
                      >
                        Aa
                      </span>
                    </div>
                    <span className="block h-[4px] w-[35cqw] bg-white" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="relative w-full aspect-[602/548] max-md:aspect-[4/3] max-md:col-span-2 max-md:order-3 md:col-span-2 md:order-last lg:order-none lg:col-start-5 lg:col-span-5 overflow-hidden">
                <Fill
                  src={ASSETS.typeTablet}
                  alt="Tablet showing Sourcing Simplified"
                  parallax={false}
                  imgClassName="object-cover"
                />
              </div>

              <div className="flex flex-col gap-[16px] max-md:order-2 lg:col-start-10 lg:col-span-3 lg:gap-[32px]">
                <div className="relative w-full aspect-square lg:aspect-[353/356] overflow-hidden">
                  <Fill src={ASSETS.book} alt="Stack of teal Zhongshan product books" parallax={false} />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  Inter balances bold editorial headlines with crisp, legible numbers across technical spec tables.
                </p>
              </div>
            </div>
          </section>

          {/* 4. CONTRAST WITH PURPOSE */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-[64px] md:pt-[80px] lg:pt-[150px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[54px]`}>
              Contrast<br /> with Purpose
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              A restrained grey palette puts the materials first, while deep blue and turquoise bring contrast and character.
            </p>

            <div className={`${FLOW_GRID} lg:items-start`}>
              <div
                className="grid grid-cols-1 max-md:grid-cols-2 max-md:order-2 md:grid-cols-2 md:col-span-2 gap-[12px] md:gap-[16px] lg:gap-x-[19px] lg:col-start-1 lg:col-span-6 items-start"
              >
                <div className="flex flex-col gap-[24px] max-md:order-2 lg:gap-[32px]">
                  <div className="relative w-full aspect-[348/491] max-md:aspect-[4/5] overflow-hidden">
                    <Fill src={ASSETS.hardhat} alt="Worker in a branded Zhongshan hard hat" parallax={false} />
                  </div>
                  <p className={`${PARA_CLS} max-md:hidden`}>
                    A restrained grey palette puts the materials first, while deep blue and turquoise bring contrast and character.
                  </p>
                </div>
                <div className="relative w-full aspect-[351/388] max-md:aspect-[4/5] max-md:order-1 overflow-hidden">
                  <Fill src={ASSETS.colorTexture} alt="Material samples in grey, wood and teal" parallax={false} />
                </div>
              </div>

              <div className="max-md:order-1 md:col-span-2 lg:col-start-7 lg:col-span-6 flex justify-center lg:justify-start">
                <InViewGif
                  fit="contain"
                  src={ASSETS.color}
                  alt="Zhongshan colour palette"
                  className="bg-transparent w-full aspect-[725.3/700] max-md:w-full max-md:max-w-[408px] max-md:aspect-[408/393.77]"
                />
              </div>
            </div>
          </section>

          {/* 5. PRECISION IN EVERY DETAIL */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-[64px] md:pt-[80px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[64px]`}>
              Precision<br /> In Every Detail
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              A visual identity that balances the precision of architectural sourcing with the sophistication of editorial design.
            </p>

            <div className={`${FLOW_GRID} lg:items-start`}>
              <div className="flex flex-col gap-[24px] max-md:order-2 lg:col-start-1 lg:col-span-4 lg:gap-[32px]">
                <div className="relative w-full aspect-[477/385] max-md:aspect-[4/3] overflow-hidden">
                  <Fill src={ASSETS.brass} alt="Navy hang tag with foil logo" parallax={false} className="max-md:hidden" />
                  <Fill src={ASSETS.folder} alt="Zhongshan catalogues" parallax={false} className="md:hidden" />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  A visual identity that balances the precision of architectural sourcing with the sophistication of editorial design.
                </p>
              </div>
              <div className="relative w-full aspect-[4/3] max-md:aspect-[4/3] max-md:order-1 lg:aspect-[975/700] lg:col-start-5 lg:col-span-8 overflow-hidden">
                <Fill src={ASSETS.flyer} alt="Brochure on stone material samples" />
              </div>
            </div>
          </section>

          {/* 6. WIDE INSET */}
          <CenteredInset aspectClass="aspect-[1212/616]" mobileAspect="max-md:!aspect-[16/10]" ratio={1212 / 616} frame={{ w: 1212, h: 616 }}>
            <Fill src={ASSETS.screen} alt="Display screen: Sourcing without the guesswork" />
          </CenteredInset>

          {/* 7. SPLIT */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:pt-[12px] lg:pt-[100px] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0">
              <div className="md:hidden col-span-2 relative w-full aspect-[16/10] overflow-hidden">
                <Fill src={ASSETS.flyer} alt="Brochure on stone material samples" />
              </div>

              <div className="relative w-full aspect-[3/4] max-md:aspect-[4/5] md:aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-1 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.poster} alt="Poster: A home is only as good as its details" />
              </div>

              <div className="md:hidden relative w-full aspect-[4/5] overflow-hidden">
                <Fill src={ASSETS.cargo} alt="Zhongshan cargo truck" />
              </div>

              <div className="max-md:hidden relative w-full aspect-[602/450] lg:self-start lg:col-start-8 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.cardboard} alt="Zhongshan catalogues" />
              </div>
            </div>
          </section>

          {/* 8. WIDE INSET */}
          <CenteredInset aspectClass="aspect-[1212/706]" mobileAspect="max-md:!aspect-[16/10]" ratio={1212 / 706} frame={{ w: 1212, h: 706 }}>
            <Fill src={ASSETS.cardboard} alt="Zhongshan catalogues" className="md:hidden" />
            <Fill src={ASSETS.folder} alt="Person carrying a Zhongshan folder" className="max-md:hidden" />
          </CenteredInset>

          {/* 9. SPLIT */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:pt-[12px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col"
          >
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-start">
              <div className="md:hidden col-span-2 relative w-full aspect-[16/10] overflow-hidden">
                <Fill src={ASSETS.construction} alt="Construction hoarding with interior renders" />
              </div>

              <div className="relative w-full aspect-[3/4] max-md:aspect-[4/5] md:aspect-[602/452] lg:self-end lg:col-start-1 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.boxes} alt="Branded boxes in a warehouse" />
              </div>

              <div className="md:hidden relative w-full aspect-[4/5] overflow-hidden">
                <Fill src={ASSETS.brass} alt="Zhongshan embossed brand detail" />
              </div>

              <div className="max-md:hidden relative w-full aspect-[4/5] lg:aspect-[602/862] lg:col-start-8 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.cargo} alt="Zhongshan cargo truck" />
              </div>
            </div>
          </section>

          {/* 10. WIDE INSET (1212 x 616) — desktop/tablet */}
          <CenteredInset
            aspectClass="aspect-[1212/616]"
            ratio={1212 / 616}
            frame={{ w: 1212, h: 616 }}
            className="max-md:hidden"
          >
            <Fill src={ASSETS.construction} alt="Construction hoarding with interior renders" />
          </CenteredInset>

          {/* 11. 3D RENDERS THAT FEEL REAL */}
          <section
            data-header-bg="light"
            className="block w-full pt-[105px] max-md:!pt-[72px] md:pt-[80px] lg:pt-[72px] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[64px]`}>
              3D Renders<br /> That Feel Real
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[16px]`}>
              A visual identity that balances the precision of architectural sourcing with the sophistication of editorial design.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0">
              <div className="relative w-full aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-0 max-md:order-2 md:col-span-2 lg:col-start-1 lg:col-span-8 overflow-hidden">
                <Fill src={ASSETS.wallPanel} alt="3D render of the building" />
              </div>
              <div className="w-full flex flex-col gap-[24px] max-md:order-1 md:col-span-2 lg:col-start-9 lg:col-span-4 lg:gap-[32px] lg:self-stretch">
                <div className="relative w-full aspect-[4/3] lg:aspect-[477/404] overflow-hidden">
                  <Fill
                    src={ASSETS.tiles}
                    alt="3D render detail"
                    parallax={false}
                    imgClassName="w-full h-full object-cover scale-[1.05]"
                  />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  A visual identity that balances the precision of architectural sourcing with the sophistication of editorial design.
                </p>
              </div>
            </div>
          </section>

          {/* 12. WIDE INSET (1212 x 647): Sourcing with ease isometric floorplan */}
          <CenteredInset
            aspectClass="aspect-[1212/647]"
            ratio={1212 / 647}
            frame={{ w: 1212, h: 647 }}
            mobileAspect="max-md:!aspect-[16/10]"
            className="max-md:!py-[36px]"
          >
            <Fill src={ASSETS.floorplan} alt="3D render, wide view" />
          </CenteredInset>

          {/* 13. FULL-WIDTH DOORS SHOWCASE */}
          <section
            data-header-bg="light"
            className="block w-full pt-[88px] max-md:pt-[12px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <div className="relative w-full aspect-[4/3] lg:aspect-[1472/784] overflow-hidden">
              <Fill src={ASSETS.doors} alt="Zhongshan full-width doors render" />
            </div>
          </section>

          {/* 14. SPLIT: Kitchen & Bathroom 3D renders */}
          <section
            data-header-bg="light"
            className="block w-full pt-0 max-md:pt-[12px] lg:pb-[20px] lg:flex lg:flex-col"
          >
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-start">
              <div className="relative w-full aspect-[4/5] max-md:order-1 md:order-2 lg:aspect-[726/962] lg:col-start-1 lg:col-span-6 overflow-hidden">
                <Fill src={ASSETS.kitchen} alt="Kitchen render" />
              </div>

              <div className="relative w-full aspect-[4/5] max-md:order-2 md:order-1 lg:aspect-[723/633] lg:col-start-7 lg:col-span-6 overflow-hidden">
                <Fill src={ASSETS.bathroom} alt="Bathroom render" />
              </div>
            </div>
          </section>

          {/* 15. CLOSING SHOWCASE (1472 x 724, 54px gap above NextProject): living room */}
          <section
            data-header-bg="light"
            className="block w-full pt-0 max-md:pt-[12px] pb-[var(--page-pad)] max-md:pb-[48px] md:pt-0 lg:pt-[100px] lg:pb-[20px] lg:min-h-[calc(100dvh-140px)] lg:flex lg:flex-col lg:justify-center"
          >
            <div className="relative w-full aspect-[1472/724] max-md:!aspect-[16/10] lg:mb-[54px] overflow-hidden">
              <Fill src={ASSETS.living} alt="Zhongshan closing showcase" />
            </div>
          </section>

          <NextProject current="zhongshan" />
        </div>
      </main>
    </div>
  )
}