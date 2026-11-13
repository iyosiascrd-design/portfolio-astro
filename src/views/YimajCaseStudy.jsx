// src/pages/YimajCaseStudy.jsx

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
import { Img as BaseImg, SceneVideo, LazyImg, HERO_IMG_PROPS } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.JS"

gsap.registerPlugin(ScrollTrigger)

const FRAME_PB = "pb-0"

const CS_FRAME_MIN_H = "lg:min-h-[max(64.95vw,min(100dvh,75vw))]"
const CS_FRAME_PT = "max-md:pt-[calc(var(--header-h,64px)+var(--page-pad))] md:pt-[96px] lg:pt-[144px]"

const CS_FULL_H = "max-md:min-h-[100svh] max-md:pt-[calc(var(--header-h,64px)+var(--page-pad))] max-md:pb-[var(--page-pad)] md:h-[100svh] md:pt-[calc(var(--header-h,64px)+var(--page-pad))] md:pb-[var(--page-pad)]"

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

const HERO_TEXT =
  "Designing the brand identity and 3D visuals that resulted in 62 Million in sales before a single brick was laid."

const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

const Img = (props) => <BaseImg placeholder={MEDIA_PLACEHOLDER} hideOnError {...props} />

const Video = (props) => (
  <SceneVideo
    name="yimaj"
    placeholder={MEDIA_PLACEHOLDER}
    {...props}
  />
)

const YIMAJ_LETTER_SPACING_EM = -0.02

const R_WIDE = 1472 / 867
const R_POOL = 1476 / 867
const R_PLAN = 1476 / 798
const R_TALL = 726 / 867

const YIMAJ_RUN_1 = [
  { id: "brochure", ratio: R_WIDE, ratioClass: "aspect-[1472/867]", bg: "dark",
    render: (p) => <Img src={ASSETS.brochure} alt="Woman reading the Yimaj Heights brochure" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[65%_50%]" /> },
  { id: "wayfinding", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "dark",
    render: (p) => <Img src={ASSETS.wayfinding} alt="Yimaj Heights wayfinding signs" ratio={p.ratio} className={p.className} /> },
  { id: "iphone", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "dark",
    render: (p) => <Img src={ASSETS.iphone} alt="Yimaj Heights 3D logo on a phone" ratio={p.ratio} className={p.className} /> },
  { id: "billboard", ratio: R_WIDE, ratioClass: "aspect-[1472/867]", bg: "dark",
    render: (p) => <Img src={ASSETS.billboard} alt="Where Luxury Meets Community billboard" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "folder", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "light",
    render: (p) => <Img src={ASSETS.folder} alt="Yimaj Heights sales folder" ratio={p.ratio} className={p.className} /> },
  { id: "envelope", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "light",
    render: (p) => <Img src={ASSETS.envelope} alt="Yimaj Heights envelope on marble" ratio={p.ratio} className={`${p.className} bg-[#e8e1d8]`} /> },
]

const YIMAJ_RUN_2 = [
  { id: "exterior", ratio: R_WIDE, ratioClass: "aspect-[1472/867]", bg: "dark",
    render: (p) => <Img src={ASSETS.exterior} alt="Yimaj Heights towers exterior render" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "bedroom", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "light",
    render: (p) => <Img src={ASSETS.bedroom} alt="Yimaj Heights bedroom render" ratio={p.ratio} className={p.className} /> },
  { id: "kitchen", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "light",
    render: (p) => <Img src={ASSETS.kitchen} alt="Yimaj Heights kitchen and dining render" ratio={p.ratio} className={p.className} /> },
  { id: "sitePlan", ratio: R_WIDE, ratioClass: "aspect-[1472/867]", bg: "light",
    render: (p) => <Img src={ASSETS.sitePlan} alt="Yimaj Heights site plan from above" ratio={p.ratio} parallax={false} imgClassName="!object-contain" className={`${p.className} bg-white`} /> },
  { id: "courtyard", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "light",
    render: (p) => <Img src={ASSETS.courtyard} alt="Yimaj Heights courtyard and amenity block" ratio={p.ratio} className={p.className} /> },
  { id: "football", ratio: R_TALL, ratioClass: "aspect-[726/867]", bg: "light",
    render: (p) => <Img src={ASSETS.football} alt="Yimaj Heights rooftop football court from above" ratio={p.ratio} className={p.className} /> },
  { id: "pool", ratio: R_POOL, ratioClass: "aspect-[1476/867]", bg: "light",
    render: (p) => <Img src={ASSETS.pool} alt="Yimaj Heights indoor swimming pool" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "floorplan", ratio: R_PLAN, ratioClass: "aspect-[1476/798]", bg: "dark",
    render: (p) => <Img src={ASSETS.floorplan} alt="Yimaj Heights isometric apartment floor plan" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
]

export default function YimajCaseStudy() {
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
        Array.from("YIMAJ").reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        5 * YIMAJ_LETTER_SPACING_EM * 100
      if (!w100 || !avail) return
      title.style.letterSpacing = `${YIMAJ_LETTER_SPACING_EM}em`
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
    <div ref={rootRef} className="w-full min-h-screen bg-[var(--bg-light)] text-[var(--text-light-primary)]">
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
          alt="Yimaj Heights lobby interior"
          className="absolute inset-0 w-full h-full object-cover object-[35%_30%] md:object-center z-0 will-change-transform"
        />
        <div className={CS_HERO_SCRIM} aria-hidden="true" />

        <div
          data-hero-meta
          className="absolute inset-x-[var(--page-pad)] top-[22.3%] z-10 flex justify-between max-md:items-start md:relative md:inset-x-auto md:top-auto md:grid md:grid-cols-12 md:max-lg:gap-x-[12px] lg:gap-x-[16px] text-white text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold [font-family:var(--font-display)]"
        >
          <span className="md:col-span-6 inline-flex flex-col items-start gap-[4px]">
            <span>Brand Identity</span>
            <span>3D Visuals</span>
          </span>
          <span className="max-md:hidden md:col-start-7 md:col-span-3">Completed 2025</span>
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
            className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] md:max-w-[40vw] max-md:max-w-none max-w-full"
          >
            Yimaj
          </MaskRevealText>
        </div>
      </section>

      <main style={mobileGap} className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] flex flex-col gap-[var(--page-pad)] md:gap-[16px]">
        <div style={mobileGap} className="flex flex-col gap-[var(--page-pad)] md:gap-[16px] lg:gap-0">
          <section
            data-header-bg="light"
            className={`w-full max-md:flex max-md:flex-col max-md:min-h-[100svh] max-md:pb-0 ${CS_FRAME_PT} lg:pt-[11.9vw] pb-0 lg:pb-[16px] lg:flex lg:flex-col lg:!pt-[calc(144px+1vw)] lg:min-h-[min(64.95vw,100dvh)]`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-[16px] gap-y-[32px] md:gap-y-[80px] lg:items-start max-md:items-stretch mb-[32px] md:mb-[48px] lg:mb-[7vw] max-md:flex max-md:flex-col max-md:flex-1">
              <h2 className={`${CS_HEADING} lg:col-span-7 lg:-mt-[0.12em] max-md:mb-auto max-md:pb-[32px]`}>
                Selling More Than<br className="max-md:hidden" />{" "}Square Metre
              </h2>
              <LineMaskText as="p" className={`${CS_PARA} max-md:w-full max-md:self-stretch md:max-w-[520px] lg:max-w-none lg:col-start-8 lg:col-span-5`}>
                Most developments sell square footage and location. Yimaj Heights sold a way of life focusing on family, luxury, and community. The identity started with two ideas: aspiration and continuity. The star represents the ambition behind owning a home and building a better future. The bridge connects that ambition across generations: what families have built, what they are building now, and what they hope to leave behind.
              </LineMaskText>
            </div>
            <Video
              src={ASSETS.logoAnimation}
              label="Yimaj Heights logo animation"
              ratio="aspect-[1472/581]"
              className="max-md:!aspect-auto max-md:h-[40svh] max-md:min-h-[320px] max-md:shrink-0 md:max-lg:!aspect-[3/2] lg:[flex:1_1_0px] lg:min-h-[26.5vw] lg:w-full"
              videoClassName="absolute inset-0 w-full h-full object-cover"
            />
          </section>

          <section
            data-header-bg="light"
            className="w-full flex flex-col pt-0 pb-0 max-md:h-auto portrait:max-xl:h-auto landscape:md:max-xl:h-[100dvh] xl:pt-0 xl:pb-[16px] xl:min-h-[max(64.95vw,min(100dvh,75vw))]"
          >
            <div style={mobileGap} className="grid grid-cols-[minmax(0,845fr)_minmax(0,619fr)] grid-rows-1 max-md:grid-cols-1 max-md:grid-rows-[auto_auto] portrait:max-xl:grid-cols-1 portrait:max-xl:grid-rows-[auto_auto] gap-[var(--page-pad)] md:gap-[16px] portrait:max-xl:gap-[12px] max-md:!gap-[var(--page-pad)] flex-1 min-h-0">
              <Img
                src={ASSETS.logoConstruction}
                alt="Aspiration plus Generational Bridge equals Yimaj Heights"
                ratio="aspect-auto"
                parallax={false}
                className="bg-[#4b95c0] self-start !aspect-auto [&>div]:!static [&>div]:!h-auto [&_img]:!static [&_img]:!h-auto [&_img]:!transform-none"
              />
              <div className="flex items-center justify-center">
                <Img
                  src={ASSETS.logoPin}
                  alt="Yimaj Heights star logo in brushed metal on a wood wall"
                  ratio="aspect-[546/600]"
                  className="!w-[56%] !aspect-[546/600]"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col pb-0 ${CS_FULL_H}`}>
            <div style={mobileGap} className="cs-f4-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--page-pad)] md:gap-[var(--page-pad)] lg:gap-y-0 md:max-lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:grid-rows-[auto_minmax(min-content,1fr)_minmax(0,32.08vw)] md:flex-1 md:min-h-0 max-md:flex max-md:flex-col max-md:flex-1">
              <div className="max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--page-pad))] md:contents">
              <h2 className={`cs-f4-span ${CS_HEADING} md:col-span-2 lg:col-span-3 lg:row-start-1 md:-mt-[0.125em] max-md:mb-auto max-md:pb-[32px]`}>
                Precision Softened<br className="max-md:hidden" />{" "}By Warmth
              </h2>

              <LineMaskText as="p" className={`cs-f4-span ${CS_PARA} md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-2 lg:self-end md:max-w-[360px] lg:max-w-none md:[text-wrap:wrap] md:max-lg:mt-[10.85vw] lg:mt-0 md:mb-[24px] lg:mb-[64px] max-md:mb-[24px]`}>
                Architectural precision sans serif meets timeless serif typography, creating a refined system that feels premium without feeling sterile.
              </LineMaskText>

              <div className="lg:row-start-3 lg:col-start-1 md:h-full md:min-h-0 flex flex-col max-md:h-auto w-full">
                <Img
                  src={ASSETS.typeSpecimen}
                  alt="Switzer Variable and Snell Roundhand type specimen"
                  ratio="aspect-square"
                  parallax={false}
                  fade
                  className="w-full max-md:h-auto md:h-full" imgClassName="object-cover"
                />
              </div>
              </div>
              <div className="lg:row-start-3 lg:col-start-2 md:h-full md:min-h-0 flex flex-col w-full">
                <Img
                  src={ASSETS.typeApplied}
                  alt="Yimaj Heights welcome signage with serif script"
                  ratio="aspect-square"
                  parallax={false}
                  fade
                  className="w-full h-full" imgClassName="object-cover"
                />
              </div>
              <div className="lg:row-start-3 lg:col-start-3 md:h-full md:min-h-0 flex flex-col tablet-hide w-full">
                <Video
                  src={ASSETS.socials}
                  label="Yimaj Heights social media stories"
                  ratio="aspect-square"
                  className="bg-[#f0e6da] w-full h-full"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col lg:flex lg:flex-col pb-0 ${CS_FULL_H}`}>
            <h2 className={`cs-f5-heading ${CS_HEADING} md:max-lg:mb-[64px] lg:mb-[72px] max-md:hidden`}>
              Luxury Paired<br className="max-md:hidden" />{" "}With Belonging
            </h2>
            <div style={mobileGap} className="cs-f5-grid grid grid-cols-1 md:grid-cols-[60%_minmax(0,1fr)] lg:grid-cols-[602fr_357fr_481fr] md:grid-rows-[minmax(0,1fr)] gap-[var(--page-pad)] md:gap-[var(--page-pad)] lg:items-stretch md:flex-1 lg:flex-1 md:min-h-0 max-md:flex max-md:flex-col">
              <div className="md:contents max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--page-pad))]">
                <h2 className={`${CS_HEADING} md:hidden mb-auto pb-[32px]`}>
                  Luxury Paired With Belonging
                </h2>
                <LineMaskText as="p" className={`${CS_PARA} md:hidden self-start mb-[24px]`}>
                  Instead of following the cold, minimal language common in luxury real estate, Yimaj uses warm mineral tones to make the brand feel more human.
                </LineMaskText>
                
                <div className="lg:col-start-1 lg:row-start-1 md:order-2 flex flex-col h-full max-md:h-auto max-md:shrink-0">
                  <div className="w-full md:h-full isolate overflow-hidden rounded-[12px] md:rounded-[16px] lg:rounded-[24px] bg-transparent">
                    <LazyImg
                      src={ASSETS.color}
                      alt="Yimaj Heights colour palette"
                      className="w-full max-md:h-auto max-md:aspect-[602/581] md:h-full object-cover object-left-top scale-[1.012]"
                    />
                  </div>
                </div>
              </div>

              <div className="cs-f5-wrap flex flex-col justify-between lg:flex-col-reverse lg:col-start-2 lg:row-start-1 md:order-1 h-full max-md:contents">
                <LineMaskText as="p" className={`cs-f5-para ${CS_PARA} md:max-w-[520px] lg:max-w-[360px] mt-0 md:mt-[12px] lg:mt-[var(--page-pad)] max-md:hidden`}>
                  Instead of following the cold, minimal language common in luxury real estate, Yimaj uses warm mineral tones to make the brand feel more human.
                </LineMaskText>
                <Img
                  src={ASSETS.colorCard}
                  alt="Yimaj Heights colour card"
                  ratio="aspect-[357/345]"
                  className="bg-[#8a5a2b] lg:!aspect-[357/345] lg:shrink-0 w-full tablet-hide max-md:order-3"
                />
              </div>

              <div className="lg:col-start-3 lg:row-start-1 md:order-3 flex flex-col h-full max-md:order-4">
                <Img
                  src={ASSETS.colorPoster}
                  alt="Yimaj Heights colour poster"
                  ratio="aspect-[1205/1162]"
                  parallax={false}
                  className="bg-[#f0e6da] w-full lg:h-full object-cover" imgClassName="lg:object-top"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col max-md:min-h-[100svh] max-md:pb-0 ${CS_FRAME_PT} lg:h-[100dvh] lg:pb-0 lg:flex lg:flex-col`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)] gap-[var(--page-pad)] md:gap-[16px] lg:flex-1 lg:min-h-0 max-md:flex max-md:flex-col">
              <div className="max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--page-pad))] md:contents">
                <h2 className={`${CS_HEADING} md:col-span-2 mb-[32px] md:mb-[48px] lg:mb-[72px] max-md:mb-auto max-md:pb-[32px]`}>
                  Bring It To Life With<br className="max-md:hidden" />{" "}Warmth &amp; Legacy
                </h2>
                <Img src={ASSETS.keytag} alt="Yimaj Heights leather key tag" ratio="aspect-[726/700]" className="max-md:h-auto lg:h-[31.7vw] lg:self-end lg:min-h-0 lg:!aspect-auto" imgClassName="object-cover" />
              </div>
              <Img src={ASSETS.businessCard} alt="Yimaj Heights embossed business card" ratio="aspect-[726/700]" className="lg:h-[31.7vw] lg:self-end lg:min-h-0 lg:!aspect-auto" />
            </div>
          </section>
        </div>

        {isMobile && <MobileImageGroups items={YIMAJ_RUN_1} padVar="--page-pad" />}

        {!isMobile && (
        <>
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.brochure}
            alt="Woman reading the Yimaj Heights brochure"
            ratio="aspect-[1472/867]"
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[65%_50%]" />
        </section>

        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px]`}>
          <Img src={ASSETS.wayfinding} alt="Yimaj Heights wayfinding signs" ratio="aspect-[726/867]" />
          <Img src={ASSETS.iphone} alt="Yimaj Heights 3D logo on a phone" ratio="aspect-[726/867]" />
        </section>

        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.billboard}
            alt="Where Luxury Meets Community billboard"
            ratio="aspect-[1472/867]"
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px]`}>
          <Img src={ASSETS.folder} alt="Yimaj Heights sales folder" ratio="aspect-[726/867]" />
          <Img src={ASSETS.envelope} alt="Yimaj Heights envelope on marble" ratio="aspect-[726/867]" className="bg-[#e8e1d8]" />
        </section>
        </>
        )}

        <section data-header-bg="light" className={`sticky top-0 z-0 w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.presentation}
            alt="Yimaj Heights investor presentation on a monitor"
            ratio="aspect-[1476/792]"
            parallax={false}
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        <div className="relative z-10 w-full bg-[var(--bg-light)] flex flex-col gap-[var(--page-pad)] md:gap-[16px]">
        <section
          data-header-bg="light"
          className={`w-full max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--page-pad))] max-md:pb-0 ${CS_FRAME_PT} ${FRAME_PB} lg:h-[100dvh] lg:pb-0 lg:flex lg:flex-col`}
        >
          <div className="max-md:flex max-md:flex-col max-md:flex-1">
            <h2 className={`${CS_HEADING} mb-[32px] md:mb-[48px] lg:mb-[72px] max-md:mb-auto max-md:pb-[32px]`}>
              62 Million In Sale<br className="max-md:hidden" />{" "}Pre-Construction
            </h2>
          </div>
          <Img
            src={ASSETS.living}
            alt="Yimaj Heights living room render"
            ratio="aspect-[1476/867]"
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="object-cover max-md:object-[50%_50%]" />
        </section>

        {isMobile && <MobileImageGroups items={YIMAJ_RUN_2} padVar="--page-pad" />}

        {!isMobile && (
        <>
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.exterior}
            alt="Yimaj Heights towers exterior render"
            ratio="aspect-[1472/867]"
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px]`}>
          <Img src={ASSETS.bedroom} alt="Yimaj Heights bedroom render" ratio="aspect-[726/867]" />
          <Img src={ASSETS.kitchen} alt="Yimaj Heights kitchen and dining render" ratio="aspect-[726/867]" />
        </section>

        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.sitePlan}
            alt="Yimaj Heights site plan from above"
            ratio="aspect-[1472/867]"
            parallax={false}
            imgClassName="!object-contain"
            className="bg-white lg:flex-1 lg:min-h-0"
          />
        </section>

        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[var(--page-pad)] md:gap-[16px]`}>
          <Img src={ASSETS.courtyard} alt="Yimaj Heights courtyard and amenity block" ratio="aspect-[726/867]" />
          <Img src={ASSETS.football} alt="Yimaj Heights rooftop football court from above" ratio="aspect-[726/867]" />
        </section>

        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.pool}
            alt="Yimaj Heights indoor swimming pool"
            ratio="aspect-[1476/867]"
            className="max-md:h-auto lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        <section data-header-bg="dark" className="w-full">
          <Img
            src={ASSETS.floorplan}
            alt="Yimaj Heights isometric apartment floor plan"
            ratio="aspect-[1476/798]"
            className="max-md:h-auto lg:h-[calc(100dvh-24px)]" imgClassName="max-md:object-[50%_50%]" />
        </section>
        </>
        )}

        <NextProject current="yimaj" />
        </div>
      </main>
    </div>
  )
}