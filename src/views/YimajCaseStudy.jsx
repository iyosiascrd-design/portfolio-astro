// src/pages/YimajCaseStudy.jsx

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

const HERO_POS_MOBILE = "35% 30%"
const HERO_POS_DESKTOP = "50% 50%"

const HERO_TITLE = "Yimaj"
const HERO_YEAR = "Completed 2025"
const HERO_TEXT =
  "Designing the brand identity and 3D visuals that resulted in 62 Million in sales before a single brick was laid."

const ASSETS = {
  hero: "/yimaj-hero.jpg",
  logoAnimation: "/yimaj-logo.webm",
  logoConstruction: "/yimaj-logoconstruction.jpg",
  logoPin: "/yimaj-wood.jpg",
  typeTreatment: "/yimaj-type-treatment.jpg",
  typeApplied: "/yimaj-typeapplied.jpg",
  typeSpecimen: "/yimaj-type.jpg",
  color: "/yimaj-color.webm",
  logoGrid: "/yimaj-logo-grid.jpg",
  colorCard: "/yimaj-color-card.jpg",
  colorPoster: "/yimaj-color-poster.jpg",
  envelope: "/yimaj-envelop.jpeg",
  keytag: "/yimaj-keychain.jpg",
  businessCard: "/yimaj-buisnesscard.jpg",
  brochure: "/yimaj-brochure.jpg",
  wayfinding: "/yimaj-wayfinding.jpg",
  iphone: "/yimaj-iphone.jpg",
  billboard: "/yimaj-billboard.jpg",
  folder: "/yimaj-folder.jpg",
  socials: "/yimaj-socials.webm",
  presentation: "/yimaj-presentation.jpg",
  living: "/yimaj-living.jpg",
  exterior: "/yimaj-exterior.jpg",
  bedroom: "/yimaj-bedroom.jpg",
  kitchen: "/yimaj-kitchen.jpg",
  sitePlan: "/yimaj-topdownsite.jpg",
  courtyard: "/yimaj-courtyard.jpg",
  football: "/yimaj-basketball.jpg",
  pool: "/yimaj-swimming.jpg",
  floorplan: "/yimaj-floorplan.jpg",
}

const PRELOAD_SRCS = Object.entries(ASSETS).filter(([k]) => k !== "hero").map(([, v]) => v)

const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

// Shared editorial layout tokens
const CONTAINER = "w-full max-w-[1680px] mx-auto"
const HEADING_CLS = `${CS_HEADING} [text-wrap:balance] max-md:![font-size:var(--type-h2-size)] md:![font-size:var(--type-case-h2-size)] max-md:leading-none max-md:tracking-[-0.03em] lg:-mt-[0.12em]`
const PARA_CLS = `${CS_PARA} [text-wrap:pretty] ![font-size:var(--type-case-body-size)] max-md:leading-[1.45] max-md:tracking-[-0.02em]`

// Grid whose single row fills the section height (so images can use h-full instead of an aspect ratio)
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
      className={`w-full py-[48px] max-md:pt-[88px] max-md:pb-[68px] lg:min-h-[100dvh] lg:py-[100px] flex flex-col lg:justify-center ${className}`}
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

// Videos in page order.
const VIDEO_SRCS = [ASSETS.logoAnimation, ASSETS.socials, ASSETS.color].filter((src) => isVideo(src))
const VIDEO_RELEASE_GAP_MS = 700

// Once the hero has settled, videos are released one at a time in page order. A released
// video mounts as a real <video> element and starts loading straight away, which is what
// every browser (iOS Safari included) honours. The old hidden-element warmup did not.
// Returns how many videos have been released so far.
function useReleasedVideos(enabled) {
  const [released, setReleased] = useState(0)
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || navigator.connection?.saveData) return
    let n = 0
    let timer
    const tick = () => {
      n += 1
      setReleased(n)
      if (n < VIDEO_SRCS.length) timer = setTimeout(tick, VIDEO_RELEASE_GAP_MS)
    }
    timer = setTimeout(tick, 250)
    return () => clearTimeout(timer)
  }, [enabled])
  return released
}

function InViewGif({ src, alt, className = "", threshold = 0.35, fit = "cover", eager = false }) {
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
      { threshold, rootMargin: isVideo(src) ? "150% 0px" : "0px" }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      warmIo?.disconnect()
    }
  }, [src, threshold])

  return (
    <div data-reveal ref={boxRef} className={`relative isolate w-full overflow-hidden ${className}`}>
      {(started || eager) && (
        <Media
          src={src}
          alt={alt}
          lazy={false}
          className={
            fit === "contain"
              ? "absolute inset-0 w-full h-full max-w-none"
              : "absolute -inset-px w-[calc(100%+2px)] h-[calc(100%+2px)] max-w-none object-cover scale-[1.012]"
          }
          {...(fit === "contain" ? { imgClassName: "w-full h-full object-contain" } : {})}
        />
      )}
    </div>
  )
}

export default function YimajCaseStudy() {
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
  const releasedVideos = useReleasedVideos(ready && heroLoaded)
  const eagerVideo = (src) => releasedVideos > VIDEO_SRCS.indexOf(src)
  const eagerLoad = (src) => (eagerVideo(src) ? { lazy: false } : null)

  return (
    <div ref={rootRef} data-page-transition="" className="w-full min-h-screen bg-[var(--bg-light)] text-[var(--text-light-primary)]">
      {/* HERO */}
      <section
        data-header-bg="dark"
        ref={heroRef}
        style={{ "--hero-pos-m": HERO_POS_MOBILE, "--hero-pos-d": HERO_POS_DESKTOP }}
        className="sticky top-0 z-0 w-full h-[100lvh] bg-[var(--bg-surface-dark)] overflow-hidden flex flex-col justify-end px-[var(--page-pad)] pb-[calc(max(40px,env(safe-area-inset-bottom))_+_100lvh_-_100dvh)] md:pb-[calc(var(--cs-gap)_+_100lvh_-_100dvh)] lg:pb-[calc(64px_+_100lvh_-_100dvh)]"
      >
        <Media
          src={ASSETS.hero}
          alt="Yimaj Heights lobby interior"
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

          <div className="[container-type:inline-size] flex flex-col lg:flex-row justify-between lg:items-end w-full text-white pt-0 md:pt-[100px] lg:pt-[180px]">
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
              className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] whitespace-nowrap max-lg:tracking-[-0.02em] max-lg:text-[clamp(2.5rem,22cqw,7.5rem)]"
            >
              {HERO_TITLE}
            </MaskRevealText>
          </div>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] max-md:overflow-x-clip">
        <div className={`${CONTAINER} flex flex-col gap-0 md:gap-[16px] lg:gap-0`}>
          {/* 1. SPLIT INTRO: heading top-left, copy bottom-left (cols 1-5); logoConstruction right (cols 7-12) */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:pt-[117px] lg:pt-[calc(var(--header-h,64px)+20px)] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <div
              className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0"
            >
              <div className="lg:col-start-1 lg:col-span-5 flex flex-col gap-[20px] lg:justify-between lg:-mb-[4.5px]">
                <h2 className={HEADING_CLS}>
                  Selling More Than<br /> Square Metre
                </h2>
                <p className={`${PARA_CLS}`}>
                  Most developments sell square footage and location. Yimaj Heights sold a way of life focusing on family, luxury, and community. The identity started with two ideas: aspiration and continuity. The star represents the ambition behind owning a home and building a better future. The bridge connects that ambition across generations: what families have built, what they are building now, and what they hope to leave behind.
                </p>
              </div>

              <div className="relative w-full aspect-[4/5] max-md:aspect-[816/1154] lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-7 lg:col-span-6">
                <Fill
                  src={ASSETS.logoConstruction}
                  alt="Aspiration plus Generational Bridge equals Yimaj Heights"
                  parallax={false}
                  className="bg-[#4b95c0]"
                />
              </div>
            </div>
          </section>

          {/* 2. LOGO ANIMATION INSET (1228 x 624) */}
          <CenteredInset
            aspectClass="aspect-[1228/624]"
            mobileAspect="max-md:!aspect-[816/502]"
            ratio={1228 / 624}
            frame={{ w: 1228, h: 624 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill src={ASSETS.logoAnimation} alt="Yimaj Heights logo animation" {...eagerLoad(ASSETS.logoAnimation)} />
          </CenteredInset>

          {/* 3. PRECISION SOFTENED BY WARMTH:
              Mobile: heading -> body copy -> 2-col [typeSpecimen (left) | socials (right)] -> full-width typeApplied
              Desktop: typeSpecimen (cols 1-4) | typeApplied (cols 5-9) | socials + caption (cols 10-12) */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[64px]`}>
              Precision Softened<br /> By Warmth
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Architectural precision sans serif meets timeless serif typography, creating a refined system that feels premium without feeling sterile.
            </p>

            <div className={`${FLOW_GRID} lg:items-start max-md:!grid-cols-1`}>
              <div className="relative w-full aspect-[477/548] max-md:order-1 lg:col-start-1 lg:col-span-4">
                <Fill
                  src={ASSETS.typeSpecimen}
                  alt="Switzer Variable and Snell Roundhand type specimen"
                  parallax={false}
                  fade
                  imgClassName="object-cover"
                />
              </div>

              <div className="relative w-full aspect-[602/548] max-md:aspect-[816/560] max-md:order-3 md:col-span-2 md:order-last lg:order-none lg:col-start-5 lg:col-span-5">
                <Fill
                  src={ASSETS.typeApplied}
                  alt="Yimaj Heights welcome signage with serif script"
                  parallax={false}
                  fade
                  imgClassName="object-cover"
                />
              </div>

              <div className="flex flex-col gap-[16px] max-md:order-2 lg:col-start-10 lg:col-span-3 lg:gap-[32px]">
                <div className="relative w-full aspect-square lg:aspect-[353/356]">
                  <InViewGif src={ASSETS.socials} alt="Yimaj Heights social media stories" className="!absolute inset-0 !h-full" threshold={0.01} eager={eagerVideo(ASSETS.socials)} />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  Architectural precision sans serif meets timeless serif typography, creating a refined system that feels premium without feeling sterile.
                </p>
              </div>
            </div>
          </section>

          {/* 4. CONTRAST WITH PURPOSE (Frame 407):
              Mobile: heading -> body copy -> full-width palette -> 2-col [logoPin (left) | colorCard (right)]
              Desktop: colorCard + caption (cols 1-3) | logoPin (cols 4-6) | palette 725.3 x 700 (cols 7-12) */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[150px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[54px]`}>
              Contrast<br /> with Purpose
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Instead of following the cold, minimal language common in luxury real estate, Yimaj uses warm mineral tones to make the brand feel more human.
            </p>

            <div className={`${FLOW_GRID} lg:items-start`}>
              <div
                className="grid grid-cols-1 max-md:grid-cols-2 max-md:order-2 md:grid-cols-2 md:col-span-2 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:col-start-1 lg:col-span-6 items-start max-md:items-stretch"
              >
                <div className="flex flex-col gap-[24px] max-md:order-2 lg:gap-[32px]">
                  <div className="relative w-full aspect-[348/491] max-md:aspect-[396/510]">
                    <Fill src={ASSETS.colorCard} alt="Yimaj Heights colour card" parallax={false} />
                  </div>
                  <p className={`${PARA_CLS} max-md:hidden`}>
                    Instead of following the cold, minimal language common in luxury real estate, Yimaj uses warm mineral tones to make the brand feel more human.
                  </p>
                </div>
                <div className="relative w-full aspect-[351/388] max-md:aspect-auto max-md:order-1">
                  <Fill src={ASSETS.logoPin} alt="Yimaj Heights star logo in brushed metal on a wood wall" parallax={false} />
                </div>
              </div>

              <div className="max-md:order-1 md:col-span-2 lg:col-start-7 lg:col-span-6">
                <InViewGif
                  fit="contain"
                  src={ASSETS.color}
                  alt="Yimaj Heights colour palette"
                  eager={eagerVideo(ASSETS.color)}
                  className="bg-transparent aspect-[725.3/700] max-md:!w-[408px] max-md:!max-w-full max-md:!aspect-[408/393.77]"
                />
              </div>
            </div>
          </section>

          {/* 5. BRING IT TO LIFE WITH WARMTH & LEGACY:
              Mobile: heading -> body copy -> full-width brochure -> full-width businessCard
              Desktop: businessCard + caption (cols 1-4) | brochure (cols 5-12) */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[64px]`}>
              Bring It To Life With<br /> Warmth &amp; Legacy
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Tactile details across key tags, cards, and print pieces carry the warmth of the community into every handover.
            </p>

            <div className={`${FLOW_GRID} lg:items-start`}>
              <div className="flex flex-col gap-[24px] max-md:order-2 lg:col-start-1 lg:col-span-4 lg:gap-[32px]">
                <div className="relative w-full aspect-[477/385] max-md:aspect-[816/466]">
                  <Fill src={ASSETS.businessCard} alt="Yimaj Heights embossed business card" parallax={false} />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  Tactile details across key tags, cards, and print pieces carry the warmth of the community into every handover.
                </p>
              </div>
              <div className="relative w-full aspect-[4/3] max-md:aspect-[816/774] max-md:order-1 lg:aspect-[975/700] lg:col-start-5 lg:col-span-8">
                <Fill
                  src={ASSETS.brochure}
                  alt="Woman reading the Yimaj Heights brochure"
                  imgClassName="max-md:object-[65%_50%]"
                />
              </div>
            </div>
          </section>

          {/* 6. WIDE INSET (Frame 410: 1476 x 792): investor presentation */}
          <CenteredInset
            aspectClass="aspect-[1476/792]"
            mobileAspect="max-md:!aspect-[816/502]"
            ratio={1476 / 792}
            frame={{ w: 1476, h: 792 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill src={ASSETS.presentation} alt="Yimaj Heights investor presentation on a monitor" />
          </CenteredInset>

          {/* 7. SPLIT (Frame 408):
              Mobile: full-width wayfinding -> 2-col [iphone (left) | keytag (right)]
              Desktop: tall iphone (cols 1-5, full height) | wayfinding (cols 8-12, 602 x 450) */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[12px] lg:pt-[100px] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0">
              {/* Mobile-only full-width wayfinding beat */}
              <div className="md:hidden col-span-2 relative w-full aspect-[816/478]">
                <Fill src={ASSETS.wayfinding} alt="Yimaj Heights wayfinding signs" />
              </div>

              <div className="relative w-full aspect-[4/5] max-md:aspect-[396/522] lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-1 lg:col-span-5">
                <Fill src={ASSETS.iphone} alt="Yimaj Heights 3D logo on a phone" />
              </div>

              {/* Mobile-only right pair: leather key tag */}
              <div className="md:hidden relative w-full aspect-[396/522]">
                <Fill src={ASSETS.keytag} alt="Yimaj Heights leather key tag" />
              </div>

              {/* Desktop / Tablet right image: wayfinding */}
              <div className="max-md:hidden relative w-full aspect-[602/450] lg:self-start lg:col-start-8 lg:col-span-5">
                <Fill src={ASSETS.wayfinding} alt="Yimaj Heights wayfinding signs" />
              </div>
            </div>
          </section>

          {/* 8. WIDE INSET (1212 x 706): billboard */}
          <CenteredInset
            aspectClass="aspect-[1212/706]"
            mobileAspect="max-md:!aspect-[816/620]"
            ratio={1212 / 706}
            frame={{ w: 1212, h: 706 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill src={ASSETS.billboard} alt="Where Luxury Meets Community billboard" />
          </CenteredInset>

          {/* 9. SPLIT (Frame 409_2):
              Mobile: full-width envelope -> folder below
              Desktop: keytag (cols 1-5, 602 x 452) | folder (cols 8-12, 602 x 862) */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[12px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-start">
              {/* Mobile-only full-width envelope */}
              <div className="md:hidden relative w-full aspect-[816/620]">
                <Fill src={ASSETS.envelope} alt="Yimaj Heights envelope on marble" className="bg-[#e8e1d8]" />
              </div>

              <div className="max-md:hidden relative w-full aspect-[602/452] lg:self-end lg:col-start-1 lg:col-span-5">
                <Fill src={ASSETS.keytag} alt="Yimaj Heights leather key tag" />
              </div>

              {/* Mobile-only folder below envelope */}
              <div className="md:hidden relative w-full aspect-[393/504]">
                <Fill src={ASSETS.folder} alt="Yimaj Heights sales folder" />
              </div>

              {/* Desktop / Tablet right image: sales folder */}
              <div className="max-md:hidden relative w-full aspect-[4/5] lg:aspect-[602/862] lg:col-start-8 lg:col-span-5">
                <Fill src={ASSETS.folder} alt="Yimaj Heights sales folder" />
              </div>
            </div>
          </section>

          {/* 10. WIDE INSET (1212 x 616): envelope — desktop/tablet */}
          <CenteredInset
            aspectClass="aspect-[1212/616]"
            ratio={1212 / 616}
            frame={{ w: 1212, h: 616 }}
            className="max-md:hidden"
          >
            <Fill src={ASSETS.envelope} alt="Yimaj Heights envelope on marble" className="bg-[#e8e1d8]" />
          </CenteredInset>

          {/* 11. 62 MILLION IN SALE PRE-CONSTRUCTION:
              Mobile: heading -> body copy -> full-width exterior -> full-width courtyard
              Desktop: half-width exterior (cols 1-6) | half-width courtyard + caption (cols 7-12) */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[72px] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[64px]`}>
              62 Million In Sales<br /> Pre-Construction
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              I built the full 3D model in Blender and rendered photorealistic images of the residences and amenities. Used on billboards and in the brochure, they gave buyers something real to commit to before construction began.
            </p>

            <div className={FILL_GRID}>
              <div className="relative w-full aspect-[726/680] max-md:aspect-[354/226] max-md:order-1 md:col-span-1 lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-1 lg:col-span-8">
                <Fill src={ASSETS.exterior} alt="Yimaj Heights towers exterior render" />
              </div>
              <div className="w-full flex flex-col gap-[24px] max-md:order-2 md:col-span-1 lg:col-start-9 lg:col-span-4 lg:gap-[32px] lg:self-stretch">
                <div className="relative w-full aspect-[726/480] lg:aspect-[477/404] max-md:aspect-[354/290] overflow-hidden">
                  <Fill
                    src={ASSETS.courtyard}
                    alt="Yimaj Heights courtyard and amenity block"
                    parallax={false}
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  I built the full 3D model in Blender and rendered photorealistic images of the residences and amenities. Used on billboards and in the brochure, they gave buyers something real to commit to before construction began.
                </p>
              </div>
            </div>
          </section>

          {/* 12. WIDE INSET (1212 x 647): football court */}
          <CenteredInset
            aspectClass="aspect-[1212/647]"
            ratio={1212 / 647}
            frame={{ w: 1212, h: 647 }}
            mobileAspect="max-md:!aspect-[354/212]"
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill src={ASSETS.football} alt="Yimaj Heights rooftop football court from above" />
          </CenteredInset>

          {/* 12b. MOBILE ONLY: pool joins the exterior group (desktop keeps it as the closing image) */}
          <section data-header-bg="light" className="md:hidden w-full max-md:mt-[12px]">
            <div className="relative w-full aspect-[354/255]">
              <Fill src={ASSETS.pool} alt="Yimaj Heights indoor swimming pool" />
            </div>
          </section>

          {/* 13. FULL-WIDTH IMAGE:
              Mobile: living room render
              Desktop/Tablet: living room render (1472 x 784), 20px above next split */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[12px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <div className="md:hidden relative w-full aspect-[354/297]">
              <Fill src={ASSETS.living} alt="Yimaj Heights living room render" />
            </div>
            <div className="max-md:hidden relative w-full aspect-[4/3] lg:aspect-[1472/784]">
              <Fill src={ASSETS.living} alt="Yimaj Heights living room render" />
            </div>
          </section>

          {/* 14. SPLIT:
              Mobile: full-width kitchen -> centered inset bedroom (~52% width, matching Zhongshan)
              Desktop/Tablet: kitchen (cols 1-6, 962px tall) | bedroom (cols 7-12, 723 x 633), 20px below living */}
          <section
            data-header-bg="light"
            className="w-full pt-0 max-md:mt-[12px] lg:pb-[20px] lg:flex lg:flex-col"
          >
            <div className={`${FLOW_GRID} lg:items-start max-md:!grid-cols-1`}>
              {/* Mobile-only kitchen (left of the pair) */}
              <div className="md:hidden relative w-full aspect-[354/307]">
                <Fill src={ASSETS.kitchen} alt="Yimaj Heights kitchen and dining render" />
              </div>

              <div className="max-md:hidden relative w-full aspect-[4/5] lg:aspect-[726/962] lg:col-start-1 lg:col-span-6">
                <Fill src={ASSETS.kitchen} alt="Yimaj Heights kitchen and dining render" />
              </div>

              <div className="relative w-full aspect-[723/633] max-md:aspect-[354/288] lg:col-start-7 lg:col-span-6">
                <Fill src={ASSETS.bedroom} alt="Yimaj Heights bedroom render" />
              </div>
            </div>
          </section>

          {/* 14b. FLOORPLAN INSET (Frame 411): before the swimming pool showcase */}
          <CenteredInset
            aspectClass="aspect-[1212/706]"
            mobileAspect="max-md:!aspect-[354/316]"
            ratio={1212 / 706}
            frame={{ w: 1212, h: 706 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill src={ASSETS.floorplan} alt="Yimaj Heights isometric apartment floor plan" />
          </CenteredInset>

          {/* 15. CLOSING SHOWCASE (1472 x 724, 54px gap above NextProject): pool */}
          <section
            data-header-bg="light"
            className="max-md:hidden w-full pt-0 pb-[var(--page-pad)] max-md:pb-[56px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[calc(100dvh-140px)] lg:flex lg:flex-col lg:justify-center"
          >
            <div className="relative w-full aspect-[1472/724] max-md:aspect-[670/468] lg:mb-[54px]">
              <Fill src={ASSETS.pool} alt="Yimaj Heights indoor swimming pool" />
            </div>
          </section>

          <div className="max-md:mt-[12px]">
            <NextProject current="yimaj" />
          </div>
        </div>
      </main>
    </div>
  )
}