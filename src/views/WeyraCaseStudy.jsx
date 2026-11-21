// src/pages/WeyraCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import MaskRevealText from "../components/MaskRevealText"
import LineMaskText from "../components/LineMaskText"
import { usePageReady, usePageHeroReady, usePageTransition } from "../components/PageTransitionOverlay"
import NextProject from "../components/NextProject"
import MobileImageGroups, { useIsMobile } from "../components/MobileImageGroups"
import { Img as BaseImg, LazyImg, HERO_IMG_PROPS, Media } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.js"

gsap.registerPlugin(ScrollTrigger)

/*
  EDITORIAL LAYOUT SYSTEM (12-col desktop grid, 20px gutters, 1680px ceiling)
  Same system as ZhongshanCaseStudy: horizontal sizes are fr/percent of the content width, vertical
  anchors are fixed px (72 / 80 top, 20 bottom) or dvh, so every desktop spread is one full viewport tall.
  - Standalone wide visuals alternate between CenteredInset pauses and full-bleed showcases.
  - Paired visuals sit on the same 12-col grid with a 20px gutter.
*/

const PRELOAD_SRCS = [
  "/weyra-story.jpg",
  "/weyra-pin.jpg",
  "/weyra-clothing.jpg",
  "/weyra-type.jpg",
  "/weyra-wristbands.jpg",
  "/weyra-badge.jpg",
  "/weyra-tote.jpg",
  "/weyra-banner.jpg",
  "/weyra-magazine.jpg",
  "/weyra-profile.jpg",
  "/weyra-phones.jpg",
  "/weyra-poster.jpg",
  "/weyra-board.jpg",
  "/weyra-flags.jpg",
]

const FRAME3_STORY_SRC = "/weyra-story.jpg"
const FRAME3_PIN_SRC = "/weyra-pin.jpg"
const FRAME5_COLOR_SRC = "/weyra-color.webm"
const FRAME5_PHOTO_SRC = "/weyra-clothing.jpg"

const HERO_TEXT =
  "I shaped Weyra’s identity to challenge outdated narratives about Ethiopian youth, uniting 100+ participants across government, media, civil society, and youth organizations."

const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

// Shared editorial layout tokens
const CONTAINER = "w-full max-w-[1680px] mx-auto"
const HEADING_CLS = `${CS_HEADING} [text-wrap:balance] lg:-mt-[0.12em]`
const PARA_CLS = `${CS_PARA} [text-wrap:pretty]`

const Img = (props) => <BaseImg placeholder={MEDIA_PLACEHOLDER} hideOnError {...props} />

// Note: Replace utility overrides once CaseStudyMedia's BaseImg exposes a native `fill` prop.
const Fill = ({ className = "", ...props }) => (
  <Img className={`!absolute !inset-0 !w-full !h-full !aspect-auto ${className}`} {...props} />
)

// Reusable centered pause frame for standalone wide visuals.
function CenteredInset({ aspectClass = "aspect-[16/9]", ratio = 16 / 9, children, className = "" }) {
  return (
    <section
      data-header-bg="light"
      className={`w-full py-[48px] lg:min-h-[100dvh] lg:py-[clamp(72px,10dvh,120px)] flex flex-col lg:justify-center ${className}`}
    >
      <div
        className={`relative w-full ${aspectClass} lg:mx-auto`}
        style={{ maxWidth: `min(82%, calc(72dvh * ${ratio.toFixed(3)}))` }}
      >
        {children}
      </div>
    </section>
  )
}

const WEYRA_RUN = [
  { id: "banner", ratio: 1472 / 942, ratioClass: "aspect-[1472/942]", bg: "dark",
    render: (p) => <Img src="/weyra-banner.jpg" alt="Voices That Build Outdoor Banners" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "magazine", ratio: 722 / 942, ratioClass: "aspect-[722/942]", bg: "dark",
    render: (p) => <Img src="/weyra-magazine.jpg" alt="Empowering Youth For Peace Report" ratio={p.ratio} className={p.className} /> },
  { id: "profile", ratio: 722 / 942, ratioClass: "aspect-[722/942]", bg: "dark",
    render: (p) => <Img src="/weyra-profile.jpg" alt="Weyra Social Media Layout" ratio={p.ratio} className={p.className} /> },
  { id: "phones", ratio: 1, ratioClass: "aspect-square", bg: "light",
    render: (p) => (
      <div data-reveal className={`relative w-full isolate overflow-hidden bg-[#d9f5c8] ${p.ratio} ${p.className}`}>
        <LazyImg src="/weyra-phones.jpg" alt="Weyra Mobile Stories" className="absolute inset-0 block w-full h-full object-contain scale-[1.35] will-change-transform" />
      </div>
    ) },
  { id: "poster", ratio: 722 / 688, ratioClass: "aspect-[722/688]", bg: "dark",
    render: (p) => <Img src="/weyra-poster.jpg" alt="Youth holding Weyra Poster" ratio={p.ratio} className={p.className} /> },
  { id: "board", ratio: 722 / 688, ratioClass: "aspect-[722/688]", bg: "dark",
    render: (p) => <Img src="/weyra-board.jpg" alt="Branded Basketball Backboard" ratio={p.ratio} className={p.className} /> },
  { id: "flags", ratio: 1472 / 962, ratioClass: "aspect-[1472/962]", bg: "dark",
    render: (p) => <Img src="/weyra-flags.jpg" alt="Weyra Outdoor Event Flags" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
]

export default function WeyraCaseStudy() {
  const outletCtx = useOutletContext()
  const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  const heroFade = outletCtx?.heroFade

  const isMobile = useIsMobile()
  const mobileGap = isMobile ? { gap: "var(--page-pad)" } : undefined
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

  // Meta row fade + unified GSAP scroll-arrow cue (respects prefers-reduced-motion)
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-meta]", { opacity: 1, duration: 0.9, delay: 0.6, ease: "power2.out" })
      gsap
        .timeline({ repeat: -1, repeatDelay: 0.8 })
        .fromTo(
          "[data-scroll-arrow]",
          { y: -8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, ease: "power2.out" }
        )
        .to("[data-scroll-arrow]", { y: 10, opacity: 0, duration: 0.78, ease: "power2.in" })
    }, heroRef)
    return () => ctx.revert()
  }, [ready])

  // Refresh ScrollTrigger when page settles or mobile/desktop gallery layout switches
  useEffect(() => {
    if (!ready) return
    const t = gsap.delayedCall(0.3, () => ScrollTrigger.refresh())
    return () => t.kill()
  }, [ready, isMobile])

  const assetsToPreload = isMobile ? PRELOAD_SRCS.slice(0, 2) : PRELOAD_SRCS
  useIdlePreload(assetsToPreload, ready && heroLoaded)
  useCaseStudyReveal(rootRef)

  return (
    <div ref={rootRef} data-page-transition="" className="w-full min-h-screen bg-[var(--bg-light)] text-[var(--text-light-primary)]">
      {/* HERO */}
      <section
        data-header-bg="dark"
        ref={heroRef}
        className="sticky top-0 z-0 w-full h-[100lvh] bg-[var(--bg-surface-dark)] overflow-hidden flex flex-col justify-end px-[var(--page-pad)] pb-[calc(40px_+_100lvh_-_100dvh)] md:pb-[calc(var(--cs-gap)_+_100lvh_-_100dvh)] lg:pb-[calc(64px_+_100lvh_-_100dvh)]"
      >
        <img
          data-hero-img
          {...HERO_IMG_PROPS}
          {...{ [FETCH_PRIORITY_KEY]: "high" }}
          src="/weyra-hero.jpg"
          alt="Weyra Brand Identity Sticker"
          className="absolute inset-0 w-full h-full object-cover object-[35%_30%] md:object-center z-0 will-change-transform"
        />
        <div className={CS_HERO_SCRIM} aria-hidden="true" />

        <div className={`${CONTAINER} relative z-10`}>
          <div
            data-hero-meta
            className="max-md:fixed max-md:inset-x-[var(--page-pad)] max-md:top-[22.3%] md:relative flex justify-between max-md:items-start md:grid md:grid-cols-12 md:max-lg:gap-x-[12px] lg:gap-x-[16px] text-white text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold [font-family:var(--font-display)]"
          >
            <span className="md:col-span-6">Brand Identity</span>
            <span className="max-md:hidden md:col-start-7 md:col-span-3">Completed 2023</span>
            <span className="inline-flex items-center gap-[0.4em] md:col-start-10 md:col-span-3 md:justify-self-end">
              Scroll Down
              <span data-scroll-arrow className="inline-flex">
                <ArrowDown className="w-[1.1em] h-[1.1em]" strokeWidth={2.2} aria-hidden="true" />
              </span>
            </span>
          </div>

          {/* Query container sits on the title row only, so the fixed meta row above keeps the viewport as its containing block */}
          <div className="[container-type:inline-size] flex flex-col lg:flex-row justify-between lg:items-end w-full text-white pt-0 md:pt-[100px] lg:pt-[180px]">
            <div className="max-w-[min(660px,46vw)] max-lg:max-w-none md:max-lg:max-w-[60vw] max-lg:mb-[64px]">
              <MaskRevealText
                as="span"
                active={ready}
                delay={0.1}
                stagger={0.06}
                className="block text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold mb-[32px] [font-family:var(--font-display)]"
              >
                What I Did
              </MaskRevealText>
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
              className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] whitespace-nowrap max-lg:tracking-[-0.02em] max-lg:text-[clamp(2.5rem,24cqw,7.5rem)]"
            >
              Weyra
            </MaskRevealText>
          </div>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)]">
        <div style={mobileGap} className={`${CONTAINER} flex flex-col gap-[var(--page-pad)] md:gap-[16px] lg:gap-0`}>
          {/* 1. AN OLIVE BRANCH REIMAGINED: heading cols 1-5, copy cols 8-12, stage media fills the rest of the viewport */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] lg:pt-[80px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col"
          >
            <div
              style={mobileGap}
              className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px] lg:gap-y-0 lg:grid-rows-[auto_minmax(0,1fr)] lg:flex-1"
            >
              <h2 className={`${HEADING_CLS} lg:col-start-1 lg:col-span-5`}>
                An Olive Branch<br className="max-md:hidden" /> Reimagined
              </h2>
              <LineMaskText as="p" className={`${PARA_CLS} md:max-w-[520px] lg:max-w-none lg:col-start-8 lg:col-span-5`}>
                Weyra needed an identity that presented peacebuilding as something young people could actively shape, not just a response to conflict. I built a contemporary visual identity around the olive branch, giving the organization a clear, recognizable voice without relying on the familiar visual language of NGOs.
              </LineMaskText>

              <div className="relative w-full aspect-square md:aspect-[3/2] lg:aspect-auto lg:col-span-12 lg:row-start-2 lg:mt-[7vw] lg:min-h-[26.5vw]">
                <Media
                  src="/weyra-stage.webm"
                  alt="Weyra Stage Presentation"
                  className="!absolute !inset-0 !w-full !h-full !aspect-auto object-cover"
                />
              </div>
            </div>
          </section>

          {/* 2. OLIVE LEAVES + DOVE: 845fr | 607fr, pin mark centred in its column */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col"
          >
            <div
              style={mobileGap}
              className="grid grid-cols-1 lg:grid-cols-[845fr_607fr] lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0"
            >
              <div className="relative w-full aspect-[5/4] lg:aspect-auto lg:h-full bg-[#d9f5c8]">
                <Fill
                  src={FRAME3_STORY_SRC}
                  alt="Olive Leaves + White Dove = Weyra"
                  parallax={false}
                  className="bg-[#d9f5c8]"
                  imgClassName="md:max-lg:object-contain md:max-lg:!transform-none"
                />
              </div>
              <div className="flex items-center justify-center">
                <Img
                  src={FRAME3_PIN_SRC}
                  alt="Weyra olive wreath pin on a green cap"
                  ratio="aspect-[546/600]"
                  className="!w-[70%] lg:!w-[57.6%] !aspect-[546/600]"
                />
              </div>
            </div>
          </section>

          {/* 3. A CLEAR VOICE EVERYWHERE: bottom 20. Three equal squares, caption 32px beneath the phone mockup */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] lg:pt-0 lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[55px]`}>
              A Clear Voice<br className="max-md:hidden" /> Everywhere
            </h2>

            <div
              style={mobileGap}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px] lg:items-start"
            >
              <div className="relative w-full aspect-square">
                <Media
                  src="/weyra-type-treatment.webm"
                  alt="Beyond Conflict Typography Treatment"
                  className="!absolute !inset-0 !w-full !h-full !aspect-auto object-cover"
                />
              </div>

              <div className="relative w-full aspect-square">
                <Fill
                  src="/weyra-type.jpg"
                  alt="Acumin Variable Concept Specimen"
                  parallax={false}
                  fade
                  imgClassName="object-cover"
                />
              </div>

              <div className="flex flex-col gap-[24px] md:col-span-2 lg:col-span-1 lg:gap-[32px]">
                <div className="relative w-full aspect-square tablet-hide">
                  <Media
                    src="/Weyra-iphone.webm"
                    alt="Weyra Mobile App Mockup"
                    className="!absolute !inset-0 !w-full !h-full !aspect-auto object-cover"
                  />
                </div>
                <LineMaskText as="p" className={`${PARA_CLS} md:max-w-[520px] lg:max-w-none`}>
                  Acumin Variable Concept suits signage, social media, and editorial layouts. It is geometric, clear, and approachable.
                </LineMaskText>
              </div>
            </div>
          </section>

          {/* 4. FAMILIARLY ETHIOPIAN: bottom 20. Palette cols 1-5, wristbands + copy cols 6-8, clothing cols 9-12, tops AND bottoms aligned */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] lg:pt-0 lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[47.5px]`}>
              Familiarly<br className="max-md:hidden" /> Ethiopian
            </h2>

            <div
              style={mobileGap}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px] lg:items-stretch"
            >
              <div className="w-full isolate overflow-hidden bg-transparent md:col-span-2 lg:col-span-5">
                <Media
                  src={FRAME5_COLOR_SRC}
                  alt="Weyra colour palette"
                  className="w-full aspect-[602/581] object-cover object-left-top [clip-path:inset(1px)]"
                />
              </div>

              <div className="flex flex-col justify-between gap-[24px] md:col-span-2 lg:col-span-3 lg:h-full">
                <div className="relative w-full aspect-[357/345] bg-[#0b1f14] tablet-hide">
                  <Fill src="/weyra-wristbands.jpg" alt="Weyra Branded Wristbands" parallax={false} />
                </div>
                <LineMaskText as="p" className={`${PARA_CLS} md:max-w-[520px] lg:max-w-[360px]`}>
                  Familiar Ethiopian colors bring warmth and youth to the palette, keeping the visual language grounded and true to its subject.
                </LineMaskText>
              </div>

              <div className="relative w-full aspect-[1205/1162] md:col-span-2 lg:aspect-auto lg:col-span-4 bg-[#e1efdc]">
                <Fill
                  src={FRAME5_PHOTO_SRC}
                  alt="Weyra branded clothing"
                  parallax={false}
                  className="bg-[#e1efdc]"
                  imgClassName="lg:object-top"
                />
              </div>
            </div>
          </section>

          {/* 5. ONE IDENTITY IN HARMONY: bottom 20. Two equal cells */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] lg:pt-0 lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[47.5px]`}>
              One Identity<br className="max-md:hidden" /> In Harmony
            </h2>
            <div
              style={mobileGap}
              className="grid grid-cols-1 md:grid-cols-2 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px]"
            >
              <div className="relative w-full aspect-[726/700]">
                <Fill src="/weyra-badge.jpg" alt="Weyra Event Lanyard" />
              </div>
              <div className="relative w-full aspect-[726/700]">
                <Fill src="/weyra-tote.jpg" alt="Weyra Branded Tote Bag" />
              </div>
            </div>
          </section>

          {/* RUN: Mobile grouped gallery vs Desktop editorial spreads */}
          {isMobile ? (
            <MobileImageGroups items={WEYRA_RUN} padVar="--page-pad" />
          ) : (
            <>
              {/* 6. OUTDOOR BANNERS INSET */}
              <CenteredInset aspectClass="aspect-[1472/942]" ratio={1472 / 942}>
                <Fill
                  src="/weyra-banner.jpg"
                  alt="Voices That Build Outdoor Banners"
                  className="bg-black"
                  imgClassName="max-md:object-[50%_50%]"
                />
              </CenteredInset>

              {/* 7. MAGAZINE + PROFILE: two tall cells filling the viewport */}
              <section
                data-header-bg="light"
                className="w-full pt-[88px] lg:pt-[72px] lg:pb-[20px] lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px]"
              >
                <div className="relative w-full aspect-[722/942] lg:aspect-auto lg:h-full">
                  <Fill src="/weyra-magazine.jpg" alt="Empowering Youth For Peace Report" />
                </div>
                <div className="relative w-full aspect-[722/942] lg:aspect-auto lg:h-full">
                  <Fill src="/weyra-profile.jpg" alt="Weyra Social Media Layout" />
                </div>
              </section>

              {/* 8. MOBILE STORIES: full-viewport showcase */}
              <section data-header-bg="light" className="w-full lg:h-[100dvh] lg:pt-[72px] lg:pb-[20px] flex flex-col">
                <div
                  data-reveal
                  className="relative w-full aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-0 isolate overflow-hidden bg-[#d9f5c8]"
                >
                  <LazyImg
                    src="/weyra-phones.jpg"
                    alt="Weyra Mobile Stories"
                    className="absolute inset-0 block w-full h-full object-cover will-change-transform"
                  />
                </div>
              </section>

              {/* 9. POSTER + BACKBOARD: two equal cells centred in the viewport */}
              <section
                data-header-bg="light"
                className="w-full pt-[88px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 gap-[var(--page-pad)] md:gap-[16px] lg:gap-x-[20px] lg:items-center lg:content-center"
              >
                <div className="relative w-full aspect-[722/688]">
                  <Fill src="/weyra-poster.jpg" alt="Youth holding Weyra Poster" />
                </div>
                <div className="relative w-full aspect-[722/688]">
                  <Fill src="/weyra-board.jpg" alt="Branded Basketball Backboard" />
                </div>
              </section>

              {/* 10. EVENT FLAGS: closing showcase, leaves room for the next-project peek */}
              <section data-header-bg="dark" className="w-full pb-[var(--page-pad)] lg:pt-[72px] lg:pb-[17.4px]">
                <Img
                  src="/weyra-flags.jpg"
                  alt="Weyra Outdoor Event Flags"
                  ratio="aspect-[1472/962]"
                  className="max-md:h-auto lg:h-[calc(100dvh-258px)]"
                  imgClassName="max-md:object-[50%_50%]"
                />
              </section>
            </>
          )}

          <NextProject current="weyra" />
        </div>
      </main>
    </div>
  )
}