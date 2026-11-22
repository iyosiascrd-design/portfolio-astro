// src/pages/OrigenCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
import { useQueuedVideoIndices, useVideoShouldLoad } from "../lib/useCaseStudyVideoLoad"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.js"

gsap.registerPlugin(ScrollTrigger)

/*
  EDITORIAL LAYOUT SYSTEM (12-col desktop grid, 20px gutters, 1680px ceiling)
  Calibrated to the 1512 x 982 desktop spec (1472px inner width with 20px side padding).
*/

const HERO_POS_MOBILE = "50% 30%"
const HERO_POS_DESKTOP = "50% 50%"

const ASSETS = {
  hero: "/origen-hero.jpg",
  beans: "/origen-hero.webm",
  construction1: "/origen-logo-constuction%201.jpg",
  construction2: "/origen-logo-constuction%202.jpg",
  type: "/origen-type.webm",
  typeTreatment: "/origen-type-treatment.webm",
  packaging: "/origen-packaging.jpg",
  color: "/origen-color.mp4",
  iced: "/orgien-icedcoffee.jpg",
  pouchWood: "/origen-pouch-wood.jpg",
  box: "/origen-box.jpg",
  cup: "/origen-cup-mockup.jpg",
  wax: "/origen-wax.jpg",
  wallposter: "/origen-wallposter.jpg",
  tote: "/origen-totebag.jpg",
  barista: "/origen-barista.jpg",
  mountain: "/origen-mountain.jpg",
  billboard: "/origen-billboard.jpg",
}

const ALL_ASSET_SRCS = Object.entries(ASSETS)
  .filter(([k]) => k !== "hero")
  .map(([, v]) => v)

const IMAGE_PRELOAD_SRCS = ALL_ASSET_SRCS.filter((src) => !isVideo(src))
const VIDEO_SRCS = [ASSETS.beans, ASSETS.type, ASSETS.typeTreatment, ASSETS.color].filter((src) => isVideo(src))

const HERO_TEXT =
  "Designing Origen’s brand identity and packaging to stand out with a distinctive, premium look in Spain’s sea of minimalist coffee brands."

const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

// Shared editorial layout tokens
const CONTAINER = "w-full max-w-[1680px] mx-auto"
const HEADING_CLS = `${CS_HEADING} [text-wrap:balance] max-md:![font-size:var(--type-h2-size)] md:![font-size:var(--type-case-h2-size)] max-md:leading-none max-md:tracking-[-0.03em] lg:-mt-[0.12em]`
const PARA_CLS = `${CS_PARA} [text-wrap:pretty] ![font-size:var(--type-case-body-size)] max-md:leading-[1.45] max-md:tracking-[-0.02em]`

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
  imgClassName = undefined,
  mediaProps = undefined,
  parallax = true,
  fade = false,
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
    <div ref={slotRef} className={`relative w-full h-full ${className}`}>
      {shouldLoad && (
        <Media
          src={src}
          alt={alt}
          lazy={false}
          parallax={parallax}
          fade={fade}
          imgClassName={imgClassName}
          mediaProps={mediaProps}
          className={`!absolute !inset-0 !w-full !h-full !aspect-auto ${mediaClassName}`}
        />
      )}
    </div>
  )
}

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

function InViewGif({
  src,
  alt,
  videoSrcs,
  releasedCount,
  videoGateEnabled,
  className = "",
  mediaClassName = "",
  threshold = 0.35,
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
      { threshold, rootMargin: isVideo(src) ? "250px 0px" : "0px" }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      warmIo?.disconnect()
    }
  }, [src, threshold])

  const canRender = isVideo(src) ? Boolean(eager || nearVideoLoad || started) : Boolean(started || eager)

  return (
    <div data-reveal ref={boxRef} className={`relative isolate w-full overflow-hidden ${className}`}>
      {canRender && (
        <Media
          src={src}
          alt={alt}
          lazy={false}
          className={`absolute -inset-px w-[calc(100%+2px)] h-[calc(100%+2px)] max-w-none object-cover scale-[1.012] ${mediaClassName}`}
        />
      )}
    </div>
  )
}

export default function OrigenCaseStudy() {
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

  const videoGateEnabled = Boolean(ready && heroLoaded)
  const imagesToPreload = useMemo(
    () => (isMobile ? IMAGE_PRELOAD_SRCS.slice(0, 2) : IMAGE_PRELOAD_SRCS),
    [isMobile]
  )

  useIdlePreload(imagesToPreload, videoGateEnabled)
  useCaseStudyReveal(rootRef)
  const releasedCount = useQueuedVideoIndices(VIDEO_SRCS, videoGateEnabled)

  const renderVideoFill = (
    src,
    alt,
    { parallax = true, fade = false, imgClassName = undefined, mediaClassName = "", rootMargin = "500px 0px" } = {}
  ) => (
    <NearViewportVideoSlot
      src={src}
      alt={alt}
      videoSrcs={VIDEO_SRCS}
      releasedCount={releasedCount}
      enabled={videoGateEnabled}
      rootMargin={rootMargin}
      parallax={parallax}
      fade={fade}
      imgClassName={imgClassName}
      mediaClassName={mediaClassName}
    />
  )

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
          alt="Origen latte in a ceramic cup"
          mediaProps={{ "data-hero-img": "", ...HERO_IMG_PROPS, [FETCH_PRIORITY_KEY]: "high" }}
          className="absolute inset-0 w-full h-full object-cover [object-position:var(--hero-pos-m)] md:[object-position:var(--hero-pos-d)] z-0 will-change-transform"
        />
        <div className={CS_HERO_SCRIM} aria-hidden="true" />

        <div className={`${CONTAINER} relative z-10`}>
          <div
            data-hero-meta
            className="max-md:fixed max-md:inset-x-[var(--page-pad)] max-md:top-[max(22.3%,calc(env(safe-area-inset-top)+88px))] md:relative flex justify-between max-md:items-start md:grid md:grid-cols-12 md:max-lg:gap-x-[12px] lg:gap-x-[16px] text-white text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold [font-family:var(--font-display)]"
          >
            <span className="md:col-span-6">Brand Identity</span>
            <span className="max-md:hidden md:col-start-7 md:col-span-3">Completed 2025</span>
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
              className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] whitespace-nowrap max-lg:tracking-[-0.02em] max-lg:text-[clamp(2.5rem,18cqw,7.5rem)]"
            >
              Origen
            </MaskRevealText>
          </div>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] max-md:overflow-x-clip">
        <div className={`${CONTAINER} flex flex-col gap-0 md:gap-[16px] lg:gap-0`}>
          {/* 1. SPLIT INTRO: heading top-left, copy bottom-left (cols 1-5); construction1 (723 x 862) right (cols 7-12) */}
          <section
            data-header-bg="light"
            className="w-full pt-[80px] max-md:pt-[117px] lg:pt-[calc(var(--header-h,64px)+20px)] lg:pb-[20px] lg:h-[100dvh] lg:min-h-[640px] lg:flex lg:flex-col"
          >
            <div
              className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:flex-1 lg:min-h-0"
            >
              <div className="lg:col-start-1 lg:col-span-5 flex flex-col gap-[20px] lg:justify-between lg:-mb-[4.5px]">
                <h2 className={HEADING_CLS}>
                  Born in the<br /> Highlands
                </h2>
                <p className={`${PARA_CLS}`}>
                  Premium coffee shelves are full of the same quiet minimalism and no emphasis on origin. But Origen’s coffee comes from Ethiopia, coffee’s birthplace. So the identity had to look Ethiopian, not generic, and still hold its own on a Spanish specialty shelf.
                </p>
              </div>

              <div className="relative w-full aspect-[4/5] max-md:aspect-[816/1038.6] lg:aspect-auto lg:h-full lg:min-h-0 lg:col-start-7 lg:col-span-6">
                <Fill
                  src={ASSETS.construction1}
                  alt="Kaldi’s goat + Origen + coffee bean"
                  parallax={false}
                  className="bg-[#2a1810]"
                />
              </div>
            </div>
          </section>

          {/* 2. BEANS LOGO ANIMATION INSET (1224 x 581) */}
          <CenteredInset
            aspectClass="aspect-[1224/581]"
            mobileAspect="max-md:!aspect-[816/502]"
            ratio={1224 / 581}
            frame={{ w: 1224, h: 581 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            {renderVideoFill(ASSETS.beans, "Origen logo over roasted coffee beans", {
              rootMargin: "650px 0px",
              mediaClassName: "object-cover",
            })}
          </CenteredInset>

          {/* 3. HERITAGE MEETS MODERNITY */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[64px]`}>
              Heritage Meets<br /> Modernity
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Cormorant Garamond brings historical weight and editorial elegance, while DM Sans anchors origin specs with crisp clarity.
            </p>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-start max-md:!grid-cols-1"
            >
              {/* Left: Cormorant Garamond & DM Sans specimen (cols 1-5) */}
              <div className="relative w-full aspect-[7/8] max-md:aspect-[816/744] max-md:order-1 lg:aspect-[600.45/547.5] lg:col-start-1 lg:col-span-5 lg:row-start-1">
                {renderVideoFill(
                  ASSETS.type,
                  "Cormorant Garamond and DM Sans type specimen over coffee beans",
                  {
                    parallax: false,
                    fade: true,
                    imgClassName: "object-cover",
                  }
                )}
              </div>

              {/* Center: typography treatment over pouring coffee (cols 6-9) */}
              <div className="relative w-full aspect-[7/8] max-md:aspect-[816/748] max-md:order-3 md:col-span-2 md:order-last lg:order-none lg:col-start-6 lg:col-span-4 lg:aspect-[476/548] lg:row-start-1">
                {renderVideoFill(
                  ASSETS.typeTreatment,
                  "Taste the difference typography treatment over pouring coffee",
                  {
                    parallax: false,
                    fade: true,
                    imgClassName: "object-cover",
                    mediaClassName: "!object-cover",
                  }
                )}
              </div>

              {/* Right: wax seal + caption (cols 10-12) */}
              <div className="flex flex-col gap-[16px] max-md:hidden lg:col-start-10 lg:col-span-3 lg:row-start-1 lg:gap-[32px]">
                <div className="relative w-full aspect-square lg:aspect-[353/356]">
                  <Fill src={ASSETS.wax} alt="Origen wax seal" parallax={false} />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  Cormorant Garamond brings historical weight and editorial elegance, while DM Sans provides a clean, modern counterweight across labels and origin specs.
                </p>
              </div>
            </div>
          </section>

          {/* 4. HIGHLAND INSPIRED COLOR */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[186px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-between"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[54px]`}>
              Highland<br /> Inspired Color
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              Rooted in the warmth and character of its highland origin rather than sterile minimalism.
            </p>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] max-md:!gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-start"
            >
              {/* Left (cols 1-6): colour palette */}
              <div className="w-full isolate overflow-hidden bg-transparent max-md:order-1 md:col-span-2 lg:col-start-1 lg:col-span-6">
                <InViewGif
                  src={ASSETS.color}
                  alt="Origen colour palette"
                  videoSrcs={VIDEO_SRCS}
                  releasedCount={releasedCount}
                  videoGateEnabled={videoGateEnabled}
                  className="bg-transparent w-full aspect-[725/597] max-md:!w-[408px] max-md:!h-[393.77px] max-md:!aspect-auto lg:aspect-auto lg:h-[722px]"
                  mediaClassName="max-md:!object-cover max-md:scale-100"
                />
              </div>

              {/* Right (cols 7-12): landscape billboard + caption */}
              <div className="flex flex-col gap-[24px] max-md:gap-[12px] max-md:order-2 md:col-span-2 lg:col-start-7 lg:col-span-6 lg:gap-[32px] lg:self-stretch">
                <div className="relative w-full aspect-[4/3] max-md:aspect-[816/502] lg:aspect-[721/460]">
                  <Fill
                    src={ASSETS.billboard}
                    alt="Origen billboard in a wildflower meadow: Coffee from the source"
                    parallax={false}
                    className="bg-[#26301c]"
                  />
                </div>
                <p className={`${PARA_CLS} max-md:hidden`}>
                  While competitors defaulted to sterile minimalism, we rooted the brand in the warmth and history of its original landscape.
                </p>
              </div>
            </div>
          </section>

          {/* 5. A PREMIUM PRESENCE:
              Mobile: heading -> full-width iced -> full-width pouchWood (matches screenshot 10)
              Desktop: iced (left) | pouchWood (right) at ~555px height */}
          <section
            data-header-bg="light"
            className="w-full pt-[105px] max-md:!pt-0 max-md:mt-[144px] md:pt-[80px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col lg:justify-end"
          >
            <h2 className={`${HEADING_CLS} mb-[32px] md:mb-[48px] lg:mb-[54px]`}>
              A Premium<br /> Presence
            </h2>

            <p className={`${PARA_CLS} md:hidden mb-[12px]`}>
              In a Spanish coffee market full of quiet minimalism, Origen stands out with rich texture, deep greens and a confident mark, so it feels premium on the shelf, in the cup and in the hand.
            </p>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] lg:gap-x-[20px] lg:items-end"
            >
              <div className="relative w-full aspect-[340/308] max-md:aspect-[816/648] max-md:order-1 md:aspect-auto md:h-[555px] lg:col-start-1 lg:col-span-6">
                <Fill src={ASSETS.iced} alt="Origen iced coffee on a branded coaster" />
              </div>
              <div className="relative w-full aspect-[340/308] max-md:aspect-[816/543] max-md:order-2 md:aspect-auto md:h-[555px] lg:col-start-7 lg:col-span-6">
                <Fill src={ASSETS.pouchWood} alt="Hand holding an Origen coffee pouch on a wooden shelf" />
              </div>
            </div>
          </section>

          {/* 6. SINGLE CENTERED BARISTA SHOWCASE:
              Mobile: portrait barista (matches screenshot 11 top)
              Desktop: 478 x 632 centered */}
          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:hidden lg:py-[150px] lg:min-h-[100dvh] flex flex-col items-center justify-center"
          >
            <div className="relative w-full max-w-[478px] max-md:!max-w-[56%] max-md:mx-auto aspect-[478/632] max-md:aspect-[348/503]">
              <Fill src={ASSETS.barista} alt="Barista wearing an Origen t-shirt" />
            </div>
          </section>

          {/* 7. WALL POSTERS INSET:
              Mobile: square/slightly wide posters frame below barista (matches screenshot 11 bottom)
              Desktop: 1182 x 724 inset */}
          <CenteredInset
            aspectClass="aspect-[1182/724]"
            mobileAspect="max-md:!aspect-[816/760]"
            ratio={1182 / 724}
            frame={{ w: 1182, h: 724 }}
            className="max-md:!py-0 max-md:mt-[12px]"
          >
            <Fill
              src={ASSETS.wallposter}
              alt="Three Origen wall posters"
              imgClassName="max-md:object-[50%_50%]"
            />
          </CenteredInset>

          {/* 8. PACKAGING + DRIP BOX + CUP SEQUENCE:
              Mobile: portrait packaging -> full-width drip box -> portrait cup (matches screenshot 12)
              Desktop: drip box inset (1182 x 782) followed by cup (left) | packaging (right) */}
          <CenteredInset
            aspectClass="aspect-[1182/782]"
            mobileAspect="max-md:!aspect-[816/560]"
            ratio={1182 / 782}
            frame={{ w: 1182, h: 782 }}
            className="max-md:hidden"
          >
            <Fill src={ASSETS.box} alt="Origen drip coffee box: Where coffee began" />
          </CenteredInset>

          <section
            data-header-bg="light"
            className="w-full pt-[88px] max-md:!pt-0 max-md:mt-[12px] lg:pt-[100px] lg:pb-[20px] lg:min-h-[100dvh] lg:flex lg:flex-col"
          >
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-[12px] md:gap-[16px] max-md:grid-cols-2 lg:gap-x-[20px] lg:flex-1 lg:items-start"
            >
              {/* Mobile-only beat 1: portrait packaging */}
              <div className="md:hidden relative w-full aspect-[275/432] max-md:order-1">
                <Fill src={ASSETS.packaging} alt="Hands holding two Origen coffee pouches" />
              </div>

              {/* Mobile-only beat 1b: barista beside packaging */}
              <div className="md:hidden relative w-full aspect-[275/432] max-md:order-2">
                <Fill src={ASSETS.barista} alt="Barista wearing an Origen t-shirt" />
              </div>

              {/* Mobile-only beat 2: full-width drip box */}
              <div className="md:hidden col-span-2 relative w-full aspect-[575/520] max-md:order-3">
                <Fill src={ASSETS.box} alt="Origen drip coffee box: Where coffee began" />
              </div>

              {/* Desktop / Tablet left: cup */}
              <div className="max-md:hidden relative w-full aspect-[4/3] lg:aspect-[726/486] lg:self-start lg:col-start-1 lg:col-span-6">
                <Fill src={ASSETS.cup} alt="Origen paper cup under an espresso machine" />
              </div>

              {/* Desktop / Tablet right: packaging */}
              <div className="max-md:hidden relative w-full aspect-[4/5] lg:aspect-[602/862] lg:self-start lg:col-start-8 lg:col-span-5">
                <Fill src={ASSETS.packaging} alt="Hands holding two Origen coffee pouches" />
              </div>
            </div>
          </section>

          {/* 9. CLOSING MOUNTAIN SHOWCASE (1472 x 724, 54px gap above NextProject) */}
          <section
            data-header-bg="light"
            className="w-full pb-[var(--page-pad)] max-md:mt-[12px] max-md:!pb-0 lg:pt-[100px] lg:pb-[20px] lg:min-h-[calc(100dvh-140px)] lg:flex lg:flex-col lg:justify-center"
          >
            <div className="relative w-full aspect-[1472/724] max-md:aspect-[575/612] lg:mb-[54px]">
              <Fill
                src={ASSETS.mountain}
                alt="Origen coffee sachets over Ethiopian highland mountains"
                imgClassName="max-md:object-[50%_50%]"
              />
            </div>
          </section>

          <div className="max-md:mt-[12px]">
            <NextProject current="origen" />
          </div>
        </div>
      </main>
    </div>
  )
}