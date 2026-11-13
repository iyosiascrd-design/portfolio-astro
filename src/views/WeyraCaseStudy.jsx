// src/pages/WeyraCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { useOutletContext } from "react-router-dom"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import MaskRevealText from "../components/MaskRevealText"
import LineMaskText from "../components/LineMaskText"
import { usePageReady, usePageHeroReady, usePageTransition } from "../components/PageTransitionOverlay"
import NextProject from "../components/NextProject"
import MobileImageGroups, { useIsMobile } from "../components/MobileImageGroups"
import { Img, LazyImg, HERO_IMG_PROPS, Media } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.JS"

gsap.registerPlugin(ScrollTrigger)

const FRAME_PB = "pb-0"

const CS_FRAME_MIN_H = "lg:min-h-[max(64.95vw,min(100dvh,75vw))]"
const CS_FRAME_PT = "pt-[96px] lg:pt-[144px]"

const CS_FULL_H = "max-md:min-h-[100svh] max-md:pt-[calc(var(--header-h,64px)+var(--page-pad))] max-md:pb-[var(--page-pad)] md:h-[100svh] md:pt-[calc(var(--header-h,64px)+var(--page-pad))] md:pb-[var(--page-pad)]"

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

const HERO_TEXT =
  "I shaped Weyra’s identity to challenge outdated narratives about Ethiopian youth, uniting 100+ participants across government, media, civil society, and youth organizations."

const FRAME5_COLOR_SRC = "/weyra-color.webm"
const FRAME5_PHOTO_SRC = "/weyra-clothing.jpg"

const WEYRA_LETTER_SPACING_EM = -0.02

const WEYRA_RUN = [
  { id: "banner", ratio: 1472 / 942, ratioClass: "aspect-[1472/942]", bg: "dark",
    render: (p) => <Img src="/weyra-banner.jpg" alt="Voices That Build Outdoor Banners" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "magazine", ratio: 722 / 942, ratioClass: "aspect-[722/942]", bg: "dark",
    render: (p) => <Img src="/weyra-magazine.jpg" alt="Empowering Youth For Peace Report" ratio={p.ratio} className={p.className} /> },
  { id: "profile", ratio: 722 / 942, ratioClass: "aspect-[722/942]", bg: "dark",
    render: (p) => <Img src="/weyra-profile.jpg" alt="Weyra Social Media Layout" ratio={p.ratio} className={p.className} /> },
  { id: "phones", ratio: 1, ratioClass: "aspect-square", bg: "light",
    render: (p) => (
      <div data-reveal className={`relative w-full isolate overflow-hidden bg-[#d9f5c8] rounded-[12px] md:rounded-[16px] lg:rounded-[24px] ${p.ratio} ${p.className}`}>
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

  useLayoutEffect(() => {
    const hero = heroRef.current
    const title = hero?.querySelector("h1")
    if (!hero || !title) return

    const mq = window.matchMedia("(max-width: 767px)")
    let cancelled = false

    const fit = () => {
      if (cancelled) return
      if (!mq.matches) {
        title.style.removeProperty("font-size")
        title.style.removeProperty("letter-spacing")
        return
      }
      const cs = getComputedStyle(hero)
      const avail = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const ctx = document.createElement("canvas").getContext("2d")
      ctx.font = '500 100px "Borscha"'
      const w100 =
        Array.from("WEYRA").reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        5 * WEYRA_LETTER_SPACING_EM * 100
      if (!w100 || !avail) return
      title.style.letterSpacing = `${WEYRA_LETTER_SPACING_EM}em`
      title.style.fontSize = `${Math.floor((avail / w100) * 100 * 0.90)}px`
    }

    const load = document.fonts?.load
      ? document.fonts.load('500 100px "Borscha"')
      : Promise.resolve()
    load.then(fit, fit)

    window.addEventListener("resize", fit)
    return () => {
      cancelled = true
      window.removeEventListener("resize", fit)
    }
  }, [])

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
  }, [])

  useEffect(() => {
    const img = heroRef.current?.querySelector("[data-hero-img]")
    let cancelled = false
    
    const settled = () => {
      if (cancelled) return
      setHeroLoaded(true)
    }
    
    const decoded = img?.decode ? img.decode() : Promise.resolve()
    decoded.then(settled, settled)
    const fallback = setTimeout(() => { if (!cancelled) setHeroLoaded(true) }, 4000)
    
    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
  }, [])

  // Hero image scales down in sync with the overlay lifting (heroReady = mask wipe start)
  useEffect(() => {
    if (!heroReady || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-img]", { scale: 1, duration: 2, ease: "power3.out" })
    }, heroRef)
    return () => ctx.revert()
  }, [heroReady])

  // Meta row fades in after the text has begun (ready = overlay mostly cleared)
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-meta]", { opacity: 1, duration: 0.9, delay: 0.6, ease: "power2.out" })
    }, heroRef)
    return () => ctx.revert()
  }, [ready])

  useEffect(() => {
    if (!ready) return
    const t = gsap.delayedCall(1.3, () => ScrollTrigger.refresh())
    return () => t.kill()
  }, [ready])

  const assetsToPreload = isMobile ? PRELOAD_SRCS.slice(0, 2) : PRELOAD_SRCS
  useIdlePreload(assetsToPreload, ready && heroLoaded)
  useCaseStudyReveal(rootRef)

  return (
    <div ref={rootRef} data-page-transition="" className="w-full min-h-screen bg-[var(--bg-light)] text-[var(--text-light-primary)]">
      <section
        data-header-bg="dark"
        ref={heroRef}
        className="sticky top-0 z-0 w-full h-[100lvh] bg-[var(--bg-surface-dark)] overflow-hidden flex flex-col justify-end px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] pb-[calc(40px_+_100lvh_-_100dvh)] md:pb-[calc(var(--cs-gap)_+_100lvh_-_100dvh)] lg:pb-[calc(64px_+_100lvh_-_100dvh)]"
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

        <div
          data-hero-meta
          className="absolute inset-x-[var(--page-pad)] top-[22.3%] z-10 flex justify-between md:relative md:inset-x-auto md:top-auto md:grid md:grid-cols-12 md:max-lg:gap-x-[12px] lg:gap-x-[16px] text-white text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold [font-family:var(--font-display)]"
        >
          <span className="md:col-span-6">Brand Identity</span>
          <span className="max-md:hidden md:col-start-7 md:col-span-3">Completed 2023</span>
          <span className="inline-flex items-center gap-[0.4em] md:col-start-10 md:col-span-3 md:justify-self-end">
            Scroll Down
            <motion.span
              className="inline-flex"
              animate={{ y: [-8, 0, 10], opacity: [0, 1, 0] }}
              transition={{
                duration: 1.2,
                times: [0, 0.35, 1],
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.8,
              }}
            >
              <ArrowDown className="w-[1.1em] h-[1.1em]" strokeWidth={2.2} aria-hidden="true" />
            </motion.span>
          </span>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end w-full text-white pt-0 md:pt-[100px] lg:pt-[180px]">
          <div className="max-w-[min(660px,46vw)] max-md:max-w-none md:max-lg:max-w-[50vw] max-md:mb-[64px]">
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
              className={CS_HERO_PARA}
            >
              {HERO_TEXT}
            </MaskRevealText>
          </div>

          <MaskRevealText
            as="h1"
            mode="words"
            active={ready}
            delay={0}
            className="CaseH1 uppercase !leading-[1.1] -my-[0.125em]"
          >
            Weyra
          </MaskRevealText>
        </div>
      </section>

      <main style={mobileGap} className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] flex flex-col gap-[var(--page-pad)] md:gap-[16px]">
        <div style={mobileGap} className="flex flex-col gap-[var(--page-pad)] md:gap-[16px] lg:gap-0">
          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--page-pad))] max-md:pb-0 ${CS_FRAME_PT} lg:pt-[11.9vw] pb-0 lg:pb-[16px] lg:flex lg:flex-col lg:!pt-[calc(144px+2.2vw)] lg:min-h-[min(64.95vw,100dvh)]`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-[16px] gap-y-[32px] md:gap-y-[80px] lg:items-start max-md:items-stretch mb-[32px] md:mb-[48px] lg:mb-[7vw] max-md:flex max-md:flex-col max-md:flex-1">
              <h2 className={`${CS_HEADING} lg:col-span-7 lg:-mt-[0.12em] max-md:mb-auto max-md:pb-[32px]`}>
                An Olive Branch<br className="max-md:hidden" />{" "}Reimagined
              </h2>
              <LineMaskText as="p" className={`${CS_PARA} max-md:w-full max-md:self-stretch md:max-w-[520px] lg:max-w-none lg:col-start-8 lg:col-span-5`}>
                Weyra needed an identity that presented peacebuilding as something young people could actively shape, not just a response to conflict. I built a contemporary visual identity around the olive branch, giving the organization a clear, recognizable voice without relying on the familiar visual language of NGOs.
              </LineMaskText>
            </div>
            <Media
              src="/weyra-stage.webm"
              alt="Weyra Stage Presentation"
              className="max-md:!aspect-auto max-md:h-[40svh] max-md:min-h-[320px] max-md:shrink-0 md:max-lg:!aspect-[3/2] lg:[flex:1_1_0px] lg:min-h-[26.5vw] lg:w-full w-full md:h-full object-cover rounded-[12px] md:rounded-[16px] lg:rounded-[24px]"
            />
          </section>

          <section
            data-header-bg="light"
            className="w-full flex flex-col pt-0 pb-0 max-xl:h-[100dvh] xl:pt-0 xl:pb-[16px] xl:min-h-[max(64.95vw,min(100dvh,75vw))]"
          >
            <div style={mobileGap} className="grid grid-cols-[minmax(0,845fr)_minmax(0,607fr)] grid-rows-1 max-md:grid-cols-1 max-md:grid-rows-2 portrait:max-xl:grid-cols-1 portrait:max-xl:grid-rows-2 gap-[var(--page-pad)] md:gap-[16px] flex-1 min-h-0">
              <Img
                src={FRAME3_STORY_SRC}
                alt="Olive Leaves + White Dove = Weyra"
                ratio="aspect-auto"
                imgClassName="min-[600px]:portrait:max-xl:object-contain min-[600px]:portrait:max-xl:!transform-none"
                className="bg-[#d9f5c8] xl:min-h-[31.7vw]"
              />
              <div className="flex items-center justify-center max-md:items-start">
                <Img
                  src={FRAME3_PIN_SRC}
                  alt="Weyra olive wreath pin on a green cap"
                  ratio="aspect-[546/600]"
                  className="!w-[57.6%] !aspect-[546/600] max-md:!w-auto max-md:!h-[70%] portrait:max-xl:!w-auto portrait:max-xl:!h-[70%]"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col pb-0 ${CS_FULL_H}`}>
            <div style={mobileGap} className="cs-f4-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--page-pad)] md:gap-[var(--page-pad)] lg:gap-y-0 md:max-lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:grid-rows-[auto_minmax(min-content,1fr)_minmax(0,32.08vw)] md:flex-1 md:min-h-0 max-md:flex max-md:flex-col max-md:flex-1">
              <div className="max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--page-pad))] md:contents">
                <h2 className={`cs-f4-span ${CS_HEADING} md:col-span-2 lg:col-span-3 lg:row-start-1 md:-mt-[0.125em] max-md:mb-auto max-md:pb-[32px]`}>
                  A Clear Voice<br className="max-md:hidden" />{" "}Everywhere
                </h2>

                <LineMaskText as="p" className={`cs-f4-span ${CS_PARA} md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-2 lg:self-end md:max-w-[360px] lg:max-w-none md:[text-wrap:wrap] md:max-lg:mt-[10.85vw] lg:mt-0 md:mb-[24px] lg:mb-[64px] max-md:mb-[24px]`}>
                  Acumin Variable Concept suits signage, social media, and editorial layouts. It is geometric, clear, and approachable.
                </LineMaskText>

                <div className="lg:row-start-3 lg:col-start-1 md:h-full md:min-h-0 flex flex-col max-md:h-auto max-md:shrink-0 w-full aspect-square md:aspect-auto">
                  <Media
                    src="/weyra-type-treatment.webm"
                    alt="Beyond Conflict Typography Treatment"
                    className="w-full max-md:h-auto md:h-full object-cover rounded-[12px] md:rounded-[16px] lg:rounded-[24px]"
                  />
                </div>
              </div>
              <div className="lg:row-start-3 lg:col-start-2 md:h-full md:min-h-0 flex flex-col aspect-square md:aspect-auto">
                <Img
                  src="/weyra-type.jpg"
                  alt="Acumin Variable Concept Specimen"
                  ratio="aspect-square"
                  parallax={false}
                  fade
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:row-start-3 lg:col-start-3 md:h-full md:min-h-0 flex flex-col tablet-hide aspect-square md:aspect-auto">
                <Media
                  src="/Weyra-iphone.webm"
                  alt="Weyra Mobile App Mockup"
                  className="w-full max-md:h-auto md:h-full object-cover rounded-[12px] md:rounded-[16px] lg:rounded-[24px]"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col lg:flex lg:flex-col pb-0 ${CS_FULL_H}`}>
            <h2 className={`cs-f5-heading ${CS_HEADING} md:max-lg:mb-[64px] lg:mb-[72px] max-md:hidden`}>
              Familiarly<br className="max-md:hidden" />{" "}Ethiopian
            </h2>
            <div style={mobileGap} className="cs-f5-grid grid grid-cols-1 md:grid-cols-[60%_minmax(0,1fr)] lg:grid-cols-[602fr_357fr_481fr] md:grid-rows-[minmax(0,1fr)] gap-[var(--page-pad)] md:gap-[var(--page-pad)] lg:items-stretch md:flex-1 lg:flex-1 md:min-h-0 max-md:flex max-md:flex-col">
              <div className="md:contents max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--page-pad))]">
                <h2 className={`${CS_HEADING} md:hidden mb-auto pb-[32px]`}>
                  Familiarly Ethiopian
                </h2>
                <LineMaskText as="p" className={`${CS_PARA} md:hidden self-start mb-[24px]`}>
                  Familiar Ethiopian colors bring warmth and youth to the palette, keeping the visual language grounded and true to its subject.
                </LineMaskText>
                <div className="lg:col-start-1 lg:row-start-1 md:order-2 flex flex-col h-full max-md:h-auto max-md:shrink-0">
                  <div className="w-full md:h-full isolate overflow-hidden rounded-[12px] md:rounded-[16px] lg:rounded-[24px] bg-transparent">
                    <Media
                      src={FRAME5_COLOR_SRC}
                      alt="Weyra colour palette"
                      className="w-full max-md:h-auto max-md:aspect-[602/581] md:h-full object-cover scale-[1.012]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="cs-f5-wrap flex flex-col justify-between lg:col-start-2 lg:row-start-1 md:order-1 h-full max-md:contents">
                <Img
                  src="/weyra-wristbands.jpg"
                  alt="Weyra Branded Wristbands"
                  ratio="aspect-[357/345]"
                  className="bg-[#0b1f14] lg:!aspect-[357/345] lg:shrink-0 w-full tablet-hide max-md:order-3"
                />
                <LineMaskText as="p" className={`cs-f5-para ${CS_PARA} md:max-w-[520px] lg:max-w-[360px] mt-0 md:mt-[12px] lg:mt-[var(--page-pad)] max-md:hidden`}>
                  Familiar Ethiopian colors bring warmth and youth to the palette, keeping the visual language grounded and true to its subject.
                </LineMaskText>
              </div>
              
              <div className="lg:col-start-3 lg:row-start-1 md:order-3 flex flex-col h-full max-md:order-4">
                <Img
                  src={FRAME5_PHOTO_SRC}
                  alt="Weyra branded clothing"
                  ratio="aspect-none"
                  parallax={false}
                  className="bg-[#e1efdc] w-full lg:h-full object-cover" imgClassName="lg:object-top"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col max-md:min-h-[100svh] max-md:pb-0 ${CS_FRAME_PT} lg:h-[100dvh] lg:pb-0 lg:flex lg:flex-col`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)] gap-[var(--page-pad)] md:gap-[16px] lg:flex-1 lg:min-h-0 max-md:flex max-md:flex-col">
              <div className="max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--page-pad))] md:contents">
                <h2 className={`${CS_HEADING} md:col-span-2 mb-[32px] md:mb-[48px] lg:mb-[72px] max-md:mb-auto max-md:pb-[32px]`}>
                  One Identity<br className="max-md:hidden" />{" "}In Harmony
                </h2>
                <Img src="/weyra-badge.jpg" alt="Weyra Event Lanyard" ratio="aspect-[726/700]" className="max-md:h-auto lg:h-[31.7vw] lg:self-end lg:min-h-0 lg:!aspect-auto" />
              </div>
              <Img src="/weyra-tote.jpg" alt="Weyra Branded Tote Bag" ratio="aspect-[726/700]" className="lg:h-[31.7vw] lg:self-end lg:min-h-0 lg:!aspect-auto" />
            </div>
          </section>
        </div>

        {isMobile && <MobileImageGroups items={WEYRA_RUN} padVar="--page-pad" />}

        {!isMobile && (
        <>
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src="/weyra-banner.jpg"
            alt="Voices That Build Outdoor Banners"
            ratio="aspect-[1472/942]"
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px]`}>
          <Img src="/weyra-magazine.jpg" alt="Empowering Youth For Peace Report" ratio="aspect-[722/942]" />
          <Img src="/weyra-profile.jpg" alt="Weyra Social Media Layout" ratio="aspect-[722/942]" />
        </section>

        <section data-header-bg="light" className={`w-full ${FRAME_PB} md:landscape:h-[100dvh]`}>
          <div data-reveal className="relative w-full max-md:aspect-square md:landscape:h-full isolate overflow-hidden bg-[#d9f5c8] rounded-[12px] md:rounded-[16px] lg:rounded-[24px]">
            <LazyImg
              src="/weyra-phones.jpg"
              alt="Weyra Mobile Stories"
              className="block w-full h-auto max-md:absolute max-md:inset-0 max-md:h-full max-md:object-contain max-md:scale-[1.35] md:landscape:h-full md:landscape:object-cover will-change-transform"
            />
          </div>
        </section>

        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[74.1vh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px]`}>
          <Img src="/weyra-poster.jpg" alt="Youth holding Weyra Poster" ratio="aspect-[722/688]" />
          <Img src="/weyra-board.jpg" alt="Branded Basketball Backboard" ratio="aspect-[722/688]" />
        </section>

        <section data-header-bg="dark" className="w-full">
          <Img
            src="/weyra-flags.jpg"
            alt="Weyra Outdoor Event Flags"
            ratio="aspect-[1472/962]"
            className="max-md:h-auto lg:h-[calc(100dvh-24px)]" imgClassName="max-md:object-[50%_50%]" />
        </section>
        </>
        )}

        <NextProject current="weyra" />
      </main>
    </div>
  )
}