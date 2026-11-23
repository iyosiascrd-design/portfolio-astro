// src/pages/WeyraCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { useOutletContext } from "react-router-dom"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import MaskRevealText from "../components/MaskRevealText"
import LineMaskText from "../components/LineMaskText"
import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"
import NextProject from "../components/NextProject"
import { useIsMobile } from "../components/MobileImageGroups"
import { Img as BaseImg, Media, isVideo, HERO_IMG_PROPS } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"
import { useQueuedVideoIndices, useVideoShouldLoad } from "../lib/useCaseStudyVideoLoad"

import * as CaseStudyStyles from "../lib/caseStudyStyles.js"

const CS_HEADING = CaseStudyStyles.CS_HEADING ?? "CaseH2 uppercase text-black"
const CS_PARA = CaseStudyStyles.CS_PARA ?? "CaseBody text-black"
const CS_HERO_PARA = CaseStudyStyles.CS_HERO_PARA ?? "CaseHero text-white"
const CS_HERO_SCRIM =
  CaseStudyStyles.CS_HERO_SCRIM ?? "pointer-events-none absolute inset-0 bg-black/35 z-[1]"

gsap.registerPlugin(ScrollTrigger)

/*
  EDITORIAL LAYOUT SYSTEM (12-col desktop grid, 20px gutters, 1680px ceiling)
  Shared with Zhongshan. Column spans at 1472px inner width:
  1 col = 104.33px, so 3 cols = 353, 4 = 477, 5 = 602, 6 = 726, 8 = 975.
*/

const HERO_TEXT =
  "I shaped Weyra’s identity to challenge outdated narratives about Ethiopian youth, uniting 100+ participants across government, media, civil society, and youth organizations."

const WEYRA_LETTER_SPACING_EM = -0.02

const ASSETS = {
  hero: "/weyra-hero.jpg",
  stage: "/weyra-stage.webm",
  story: "/weyra-story.jpg",
  typeTreatment: "/weyra-type-treatment.webm",
  type: "/weyra-type.jpg",
  iphone: "/Weyra-iphone.webm",
  color: "/weyra-color.mp4",
  wristbands: "/weyra-wristbands.jpg",
  clothing: "/weyra-clothing.jpg",
  badge: "/weyra-badge.jpg",
  tote: "/weyra-tote.jpg",
  banner: "/weyra-banner.jpg",
  magazine: "/weyra-magazine.jpg",
  profile: "/weyra-profile.jpg",
  phones: "/weyra-phones.jpg",
  poster: "/weyra-poster.jpg",
  board: "/weyra-board.jpg",
  flags: "/weyra-flags.jpg",
}

const ALL_ASSET_SRCS = Object.entries(ASSETS)
  .filter(([k]) => k !== "hero")
  .map(([, v]) => v)

const IMAGE_PRELOAD_SRCS = ALL_ASSET_SRCS.filter((src) => !isVideo(src))
const VIDEO_SRCS = ALL_ASSET_SRCS.filter((src) => isVideo(src))

const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

// Shared editorial layout tokens
const CONTAINER = "w-full max-w-[1680px] mx-auto"
const HEADING_CLS = `${CS_HEADING} [text-wrap:balance] max-md:![font-size:var(--type-h2-size)] md:![font-size:var(--type-case-h2-size)] max-md:leading-none max-md:tracking-[-0.03em] lg:-mt-[0.12em]`
const PARA_CLS = `${CS_PARA} [text-wrap:pretty] ![font-size:var(--type-case-body-size)] max-md:leading-[1.45] max-md:tracking-[-0.02em]`

// Grid whose single row fills the section height on desktop
const FILL_GRID =
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0"
// Plain grid sized by its content
const FLOW_GRID = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px]"

const Img = (props) => <BaseImg placeholder={MEDIA_PLACEHOLDER} hideOnError {...props} />

const Fill = ({ className = "", ...props }) => (
  <Img className={`!absolute !inset-0 !w-full !h-full !aspect-auto ${className}`} {...props} />
)

function NearViewportVideoSlot({
  src,
  alt,
  videoSrcs,
  releasedCount,
  enabled,
  rootMargin = "500px 0px",
  className = "",
  mediaClassName = "",
  mediaProps = undefined,
  parallax = true,
}) {
  const slotRef = useRef(null)
  const shouldLoad = useVideoShouldLoad({
    ref: slotRef,
    src,
    videoSrcs,
    releasedCount,
    enabled,
    rootMargin,
  })

  return (
    <div data-reveal="wipe" ref={slotRef} className={`relative isolate overflow-hidden w-full h-full ${className}`}>
      {shouldLoad && (
        <Media
          src={src}
          alt={alt}
          lazy={false}
          parallax={parallax}
          mediaProps={mediaProps}
          className={`!absolute !inset-0 !w-full !h-full !aspect-auto ${mediaClassName}`}
        />
      )}
    </div>
  )
}

// Centered pause frame for standalone wide visuals.
// `frame` = exact desktop size at 1512 x 982 (1472px content width).
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

function InViewGif({
  src,
  alt,
  videoSrcs,
  releasedCount,
  videoGateEnabled,
  className = "",
  threshold = 0.15,
  fit = "cover",
  eager = false,
}) {
  const boxRef = useRef(null)
  const [started, setStarted] = useState(false)

  const nearVideoLoad = useVideoShouldLoad({
    ref: boxRef,
    src,
    videoSrcs,
    releasedCount,
    enabled: isVideo(src) && videoGateEnabled,
    rootMargin: "500px 0px",
  })

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
      { threshold, rootMargin: isVideo(src) ? "250px 0px" : "120px 0px" }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      warmIo?.disconnect()
    }
  }, [src, threshold])

  const canRender = isVideo(src) ? Boolean(eager || nearVideoLoad || started) : Boolean(started || eager)

  return (
    <div data-reveal="wipe" ref={boxRef} className={`relative isolate w-full overflow-hidden ${className}`}>
      {canRender && (
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

export default function WeyraCaseStudy() {
  const outletCtx = useOutletContext()
  const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  const heroFade = outletCtx?.heroFade

  const isMobile = useIsMobile()
  const ready = usePageReady()
  const pageTransition = usePageTransition()

  const rootRef = useRef(null)
  const heroRef = useRef(null)
  const [heroLoaded, setHeroLoaded] = useState(false)

  // Mobile: scale the WEYRA title so it spans the hero width
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

  useEffect(() => {
    if (!ready || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-meta]", { opacity: 1, duration: 0.9, delay: 0.6, ease: "power2.out" })
      gsap.to("[data-hero-img]", { scale: 1, duration: 2, ease: "power3.out" })
    }, heroRef)
    return () => ctx.revert()
  }, [ready])

  // Refresh ScrollTrigger when page settles or mobile/desktop layout switches
  useEffect(() => {
    if (!ready) return
    const t = gsap.delayedCall(1.3, () => ScrollTrigger.refresh())
    return () => t.kill()
  }, [ready, isMobile])

  const videoGateEnabled = Boolean(ready && heroLoaded)
  const imagesToPreload = useMemo(
    () => (isMobile ? IMAGE_PRELOAD_SRCS.slice(0, 2) : IMAGE_PRELOAD_SRCS),
    [isMobile]
  )

  useIdlePreload(imagesToPreload, videoGateEnabled)
  useCaseStudyReveal(rootRef)
  const releasedCount = useQueuedVideoIndices(VIDEO_SRCS, videoGateEnabled)

  const renderVideoFill = (src, alt, { parallax = true, mediaClassName = "", rootMargin = "500px 0px" } = {}) => (
    <NearViewportVideoSlot
      src={src}
      alt={alt}
      videoSrcs={VIDEO_SRCS}
      releasedCount={releasedCount}
      enabled={videoGateEnabled}
      rootMargin={rootMargin}
      parallax={parallax}
      mediaClassName={mediaClassName}
    />
  )

  return (
    <div
      ref={rootRef}
      data-page-transition=""
      className="w-full min-h-screen overflow-x-clip bg-[var(--bg-light)] text-[var(--text-light-primary)]"
    >
      {/* HERO (unchanged from the original Weyra hero) */}
      <section
        data-header-bg="dark"
        ref={heroRef}
        className="sticky top-0 z-0 w-full h-[100lvh] bg-[var(--bg-surface-dark)] overflow-hidden flex flex-col justify-end px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] pb-[calc(40px_+_100lvh_-_100dvh)] md:pb-[calc(var(--cs-gap)_+_100lvh_-_100dvh)] lg:pb-[calc(64px_+_100lvh_-_100dvh)]"
      >
        <img
          data-hero-img
          {...HERO_IMG_PROPS}
          {...{ [FETCH_PRIORITY_KEY]: "high" }}
          src={ASSETS.hero}
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
            delay={1.5}
            className="CaseH1 uppercase !leading-[1.1] -my-[0.125em]"
          >
            Weyra
          </MaskRevealText>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] max-md:overflow-x-clip">
        <div className={`${CONTAINER} flex flex-col gap-0 md:gap-[16px] lg:gap-0`}>
          {/* 1. SPLIT INTRO: An Olive Branch Reimagined */}
          <section
            data-header-bg="light"
            className="w-full pt-[80px] max-md:pt-[117px] lg:pt-[calc(var(--header-h,64px)+20px)] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <div className={FILL_GRID}>
              <div className="lg:col-start-1 lg:col-span-5 flex flex-col gap-[72px] lg:gap-[20px] lg:justify-between">
                <h2 className={HEADING_CLS}>
                  An Olive Branch<br /> Reimagined
                </h2>
                <LineMaskText as="p" className={PARA_CLS}>
                  Weyra needed an identity that presented peacebuilding as something young people could actively shape, not just a response to conflict. I built a contemporary visual identity around the olive branch, giving the organization a clear, recognizable voice without relying on the familiar visual language of NGOs.
                </LineMaskText>
              </div>

              <div className="relative w-full aspect-[4/5] max-md:aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-7 lg:col-span-6 overflow-hidden">
                <Fill src={ASSETS.story} alt="Olive Leaves + White Dove = Weyra" parallax={false} className="bg-[#d9f5c8]" />
              </div>
            </div>
          </section>

          {/* 2. LOGO INSET: stage presentation video */}
          <CenteredInset
            aspectClass="aspect-[1228/624]"
            mobileAspect="max-md:!aspect-[1228/624]"
            ratio={1228 / 624}
            frame={{ w: 1228, h: 624 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            {renderVideoFill(ASSETS.stage, "Weyra Stage Presentation", {
              rootMargin: "650px 0px",
              mediaClassName: "!object-cover",
            })}
          </CenteredInset>

          {/* 3. A CLEAR VOICE EVERYWHERE */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[72px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[72px] md:mb-[48px] lg:mb-[64px]`}>
              A Clear Voice<br /> Everywhere
            </h2>

            <LineMaskText as="p" className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Acumin Variable Concept suits signage, social media, and editorial layouts. It is geometric, clear, and approachable.
            </LineMaskText>

            <div className={`${FLOW_GRID} lg:items-start max-md:!grid-cols-[1.25fr_1fr]`}>
              <div className="relative w-full aspect-[477/548] max-md:order-1 lg:col-start-1 lg:col-span-4 overflow-hidden">
                {renderVideoFill(ASSETS.typeTreatment, "Beyond Conflict Typography Treatment", {
                  parallax: false,
                  mediaClassName: "object-cover",
                })}
              </div>

              <div className="relative w-full aspect-[602/548] max-md:aspect-[4/3] max-md:col-span-2 max-md:order-3 md:col-span-2 md:order-last lg:order-none lg:col-start-5 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.type} alt="Acumin Variable Concept Specimen" parallax={false} />
              </div>

              <div className="flex flex-col gap-[16px] max-md:order-2 lg:col-start-10 lg:col-span-3 lg:gap-[32px]">
                <div className="relative w-full aspect-square max-md:aspect-auto max-md:flex-1 max-md:min-h-0 lg:aspect-[353/356] overflow-hidden tablet-hide">
                  {renderVideoFill(ASSETS.iphone, "Weyra Mobile App Mockup", {
                    parallax: false,
                    mediaClassName: "object-cover",
                  })}
                </div>
                <LineMaskText as="p" className={`${PARA_CLS} max-md:hidden`}>
                  Acumin Variable Concept suits signage, social media, and editorial layouts. It is geometric, clear, and approachable.
                </LineMaskText>
              </div>
            </div>
          </section>

          {/* 4. FAMILIARLY ETHIOPIAN */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[150px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[72px] md:mb-[48px] lg:mb-[54px]`}>
              Familiarly<br /> Ethiopian
            </h2>

            <LineMaskText as="p" className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Familiar Ethiopian colors bring warmth and youth to the palette, keeping the visual language grounded and true to its subject.
            </LineMaskText>

            <div className={`${FLOW_GRID} lg:items-start`}>
              <div className="grid grid-cols-1 max-md:grid-cols-2 max-md:order-2 md:grid-cols-2 md:col-span-2 gap-[12px] md:gap-[16px] lg:gap-x-[19px] lg:col-start-1 lg:col-span-6 items-start">
                <div className="flex flex-col gap-[24px] max-md:order-2 lg:gap-[32px]">
                  <div className="relative w-full aspect-[348/491] max-md:aspect-[4/5] overflow-hidden">
                    <Fill src={ASSETS.clothing} alt="Weyra branded clothing" parallax={false} className="bg-[#e1efdc]" imgClassName="object-top" />
                  </div>
                  <LineMaskText as="p" className={`${PARA_CLS} max-md:hidden`}>
                    Familiar Ethiopian colors bring warmth and youth to the palette, keeping the visual language grounded and true to its subject.
                  </LineMaskText>
                </div>
                <div className="relative w-full aspect-[351/388] max-md:aspect-[4/5] max-md:order-1 overflow-hidden">
                  <Fill src={ASSETS.wristbands} alt="Weyra Branded Wristbands" parallax={false} className="bg-[#0b1f14]" />
                </div>
              </div>

              <div className="max-md:order-1 md:col-span-2 lg:col-start-7 lg:col-span-6 flex justify-center lg:justify-start">
                <InViewGif
                  fit="contain"
                  src={ASSETS.color}
                  alt="Weyra colour palette"
                  videoSrcs={VIDEO_SRCS}
                  releasedCount={releasedCount}
                  videoGateEnabled={videoGateEnabled}
                  className="bg-transparent w-full aspect-[602/581] max-md:w-full max-md:max-w-[408px]"
                />
              </div>
            </div>
          </section>

          {/* 5. ONE IDENTITY IN HARMONY */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[72px] md:mb-[48px] lg:mb-[64px]`}>
              One Identity<br /> In Harmony
            </h2>

            <div className={`${FLOW_GRID} lg:items-start`}>
              <div className="relative w-full aspect-[1.07] lg:col-start-1 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.badge} alt="Weyra Event Lanyard" />
              </div>
              <div className="relative w-full aspect-[1.07] lg:col-start-6 lg:col-span-7 overflow-hidden">
                <Fill src={ASSETS.tote} alt="Weyra Branded Tote Bag" />
              </div>
            </div>
          </section>

          {/* 6. WIDE INSET: outdoor banners */}
          <CenteredInset
            aspectClass="aspect-[1212/609]"
            mobileAspect="max-md:!aspect-[1212/609]"
            ratio={1212 / 609}
            frame={{ w: 1212, h: 609 }}
            className="max-md:!py-0 max-md:mt-[144px]"
          >
            <Fill src={ASSETS.banner} alt="Voices That Build Outdoor Banners" imgClassName="max-md:object-[50%_50%]" />
          </CenteredInset>

          {/* 7. SPLIT: magazine + profile */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[12px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-center"
          >
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] items-start">
              <div className="relative w-full aspect-[334/242] lg:col-start-1 lg:col-span-6 overflow-hidden">
                <Fill src={ASSETS.magazine} alt="Empowering Youth For Peace Report" />
              </div>
              <div className="relative w-full aspect-[275/409] lg:col-start-8 lg:col-span-5 overflow-hidden">
                <Fill src={ASSETS.profile} alt="Weyra Social Media Layout" />
              </div>
            </div>
          </section>

          {/* 8. SQUARE INSET: mobile stories */}
          <CenteredInset
            aspectClass="aspect-[1212/700]"
            mobileAspect="max-md:!aspect-[1212/700]"
            ratio={1212 / 700}
            frame={{ w: 1212, h: 700 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill src={ASSETS.phones} alt="Weyra Mobile Stories" className="bg-[#d9f5c8]" imgClassName="object-contain scale-[1.35] will-change-transform" />
          </CenteredInset>

          {/* 9. SPLIT: poster + backboard */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[12px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-center"
          >
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-start">
              <div className="relative w-full aspect-square lg:col-start-1 lg:col-span-4 overflow-hidden">
                <Fill src={ASSETS.poster} alt="Youth holding Weyra Poster" />
              </div>
              <div className="relative w-full aspect-[509/450] lg:col-start-6 lg:col-span-7 overflow-hidden">
                <Fill src={ASSETS.board} alt="Branded Basketball Backboard" />
              </div>
            </div>
          </section>

          {/* 10. CLOSING SHOWCASE: outdoor event flags */}
          <section
            data-header-bg="light"
            className="block w-full pt-0 max-md:mt-[12px] pb-[var(--page-pad)] max-md:!pb-0 md:pt-0 lg:pt-[100px] lg:pb-[20px] lg:min-h-[calc(100dvh-140px)] lg:flex lg:flex-col lg:justify-center"
          >
            <div className="relative w-full aspect-[681/391] lg:mb-[54px] overflow-hidden">
              <Fill src={ASSETS.flags} alt="Weyra Outdoor Event Flags" imgClassName="max-md:object-[50%_50%]" />
            </div>
          </section>

          <div className="max-md:mt-[12px]">
            <NextProject current="weyra" />
          </div>
        </div>
      </main>
    </div>
  )
}