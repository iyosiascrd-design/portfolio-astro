// src/pages/YimajCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { useOutletContext } from "react-router-dom"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import MaskRevealText from "../components/MaskRevealText"
import LineMaskText from "../components/LineMaskText"
import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"
import NextProject from "../components/NextProject"
import { Img as BaseImg, SceneVideo, LazyImg, HERO_IMG_PROPS } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.JS"

gsap.registerPlugin(ScrollTrigger)

const FRAME_PB = "pb-0"

const CS_FRAME_MIN_H = "lg:min-h-[max(64.95vw,min(100dvh,75vw))]"
const CS_FRAME_PT = "pt-[96px] lg:pt-[144px]"

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

// Shared media primitives live in components/CaseStudyMedia.jsx
const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

const Img = (props) => <BaseImg placeholder={MEDIA_PLACEHOLDER} hideOnError {...props} />

const Video = (props) => (
  <SceneVideo
    name="yimaj"
    placeholder={MEDIA_PLACEHOLDER}
    videoClassName="absolute inset-0 w-full h-full"
    {...props}
  />
)

const YIMAJ_LETTER_SPACING_EM = -0.02

export default function YimajCaseStudy() {
  const outletCtx = useOutletContext()
  const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  const heroFade = outletCtx?.heroFade

  const ready = usePageReady()
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
      // Changed multiplier from 0.99 to 0.90 to respect padding
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
    // The zoom waits for the hero to be decoded, so it never plays on an empty frame. Once the
    // hero has arrived (or 4s have passed) the idle preload of the remaining media is released.
    const img = heroRef.current?.querySelector("[data-hero-img]")
    let cancelled = false
    let tween = null
    const settled = () => {
      if (cancelled) return
      setHeroLoaded(true)
      if (img && !prefersReducedMotion()) {
        tween = gsap.to(img, { scale: 1, duration: 2, ease: "power3.out" })
      }
    }
    const decoded = img?.decode ? img.decode() : Promise.resolve()
    decoded.then(settled, settled)
    const fallback = setTimeout(() => { if (!cancelled) setHeroLoaded(true) }, 4000)
    return () => {
      cancelled = true
      clearTimeout(fallback)
      tween?.kill()
    }
  }, [])

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

  useIdlePreload(PRELOAD_SRCS, ready && heroLoaded)
  useCaseStudyReveal(rootRef)

  return (
    <div ref={rootRef} className="w-full min-h-screen bg-[var(--bg-light)] text-[var(--text-light-primary)]">

      {/* Frame 1 — hero */}
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
            mode="letters"
            active={ready}
            delay={0.4}
            stagger={0.1}
            className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] md:max-w-[40vw] max-md:max-w-none max-w-full"
          >
            Yimaj
          </MaskRevealText>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] flex flex-col gap-[12px] md:gap-[16px]">

        <div className="flex flex-col gap-[12px] md:gap-[16px] lg:gap-0 lg:-mb-[16px]">

          {/* Frame 2 */}
          <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} lg:pt-[11.9vw] pb-0 lg:pb-[16px] ${CS_FRAME_MIN_H}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-[16px] gap-y-[64px] md:gap-y-[80px] items-end mb-[32px] md:mb-[48px] lg:mb-[72px]">
              <h2 className={`${CS_HEADING} lg:col-span-7`}>
                Selling More Than<br className="max-md:hidden" />{" "}Square Metre
              </h2>
              <LineMaskText as="p" className={`${CS_PARA} md:max-w-[520px] lg:max-w-none lg:col-start-8 lg:col-span-5`}>
                Most developments sell square footage and location. Yimaj Heights sold a way of life focusing on family, luxury, and community. The identity started with two ideas: aspiration and continuity. The star represents the ambition behind owning a home and building a better future. The bridge connects that ambition across generations: what families have built, what they are building now, and what they hope to leave behind.
              </LineMaskText>
            </div>
            <Video
              src={ASSETS.logoAnimation}
              label="Yimaj Heights logo animation"
              ratio="aspect-[1472/581]"
              className="max-md:!aspect-[361/364] md:max-lg:!aspect-[3/2] lg:flex-1 lg:min-h-[26.5vw]"
            />
          </section>

          {/* Frame 3 */}
          <section
            data-header-bg="light"
            className="w-full flex flex-col pt-0 pb-0 max-md:h-auto portrait:max-xl:h-auto landscape:md:max-xl:h-[100dvh] xl:pt-0 xl:pb-[16px] xl:min-h-[max(64.95vw,min(100dvh,75vw))]"
          >
            <div className="grid grid-cols-[minmax(0,845fr)_minmax(0,619fr)] grid-rows-1 max-md:grid-cols-1 max-md:grid-rows-[auto_auto] portrait:max-xl:grid-cols-1 portrait:max-xl:grid-rows-[auto_auto] gap-[12px] md:gap-[16px] portrait:max-xl:gap-[12px] flex-1 min-h-0">
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

          {/* Frame 4 */}
          <section data-header-bg="light" className="w-full flex flex-col pt-[48px] lg:pt-[144px] pb-0 lg:pb-[16px]">
            <div className="cs-f4-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[16px] lg:gap-y-0 lg:grid-rows-[auto_auto_auto] lg:flex-1 lg:min-h-0">
              <h2 className={`cs-f4-span ${CS_HEADING} md:col-span-2 lg:col-span-3 lg:row-start-1 md:-mt-[0.125em] max-md:mb-[48px]`}>
                Precision Softened<br className="max-md:hidden" />{" "}By Warmth
              </h2>

              <LineMaskText as="p" className={`cs-f4-span ${CS_PARA} md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-2 lg:self-start md:max-w-[360px] lg:max-w-none md:[text-wrap:wrap] md:max-lg:mt-[10.85vw] lg:mt-[12.5vw] md:mb-[24px] lg:mb-[64px] max-md:mb-[16px]`}>
                Architectural precision sans serif meets timeless serif typography, creating a refined system that feels premium without feeling sterile.
              </LineMaskText>

              <div className="lg:row-start-3 lg:col-start-1 lg:h-[32.08vw] flex flex-col">
                <Img
                  src={ASSETS.typeSpecimen}
                  alt="Switzer Variable and Snell Roundhand type specimen"
                  ratio="aspect-square"
                  parallax={false}
                  fade
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:row-start-3 lg:col-start-2 lg:h-[32.08vw] flex flex-col">
                <Img
                  src={ASSETS.typeApplied}
                  alt="Yimaj Heights welcome signage with serif script"
                  ratio="aspect-square"
                  parallax={false}
                  fade
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:row-start-3 lg:col-start-3 lg:h-[32.08vw] flex flex-col tablet-hide">
                <Video
                  src={ASSETS.socials}
                  label="Yimaj Heights social media stories"
                  ratio="aspect-square"
                  className="bg-[#f0e6da] w-full h-full"
                />
              </div>
            </div>
          </section>

          {/* Frame 5 */}
          <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} pb-0 lg:pb-[16px]`}>
            <h2 className={`cs-f5-heading ${CS_HEADING} max-lg:mb-[48px] md:max-lg:mb-[64px] lg:mb-[72px]`}>
              Luxury Paired<br className="max-md:hidden" />{" "}With Belonging
            </h2>
            <div className="cs-f5-grid grid grid-cols-1 md:grid-cols-[60%_minmax(0,1fr)] lg:grid-cols-[602fr_357fr_481fr] gap-[12px] md:gap-[16px] lg:items-stretch lg:flex-1">
              <div className="lg:col-start-1 flex flex-col h-full max-md:order-2">
                <div className="w-full max-md:aspect-[1205/1162] lg:h-[40.35vw] overflow-hidden rounded-lg md:rounded-[12px] bg-[#f2ede4]">
                  <LazyImg
                    src={ASSETS.color}
                    alt="Yimaj Heights colour palette"
                    className="w-full h-full object-contain object-left-top"
                  />
                </div>
              </div>
              
              <div className="cs-f5-wrap flex flex-col justify-between lg:col-start-2 h-full lg:h-[40.35vw] max-md:contents">
                <Img
                  src={ASSETS.colorCard}
                  alt="Yimaj Heights colour card"
                  ratio="aspect-[357/345]"
                  className="bg-[#8a5a2b] lg:!aspect-[357/345] w-full tablet-hide max-md:order-3"
                />
                <LineMaskText as="p" className={`cs-f5-para ${CS_PARA} md:max-w-[520px] lg:max-w-[360px] mt-0 md:mt-[12px] lg:mt-auto max-md:order-1 max-md:mb-[16px]`}>
                  Instead of following the cold, minimal language common in luxury real estate, Yimaj uses warm mineral tones to make the brand feel more human.
                </LineMaskText>
              </div>
              
              <div className="lg:col-start-3 flex flex-col h-full max-md:order-4">
                <Img
                  src={ASSETS.colorPoster}
                  alt="Yimaj Heights colour poster"
                  ratio="aspect-[1205/1162]"
                  parallax={false}
                  className="bg-[#f0e6da] w-full lg:h-[40.35vw] object-cover"
                />
              </div>
            </div>
          </section>

          {/* Frame 6 */}
          <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} pb-0 lg:pb-[16px] ${CS_FRAME_MIN_H}`}>
            <h2 className={`${CS_HEADING} mb-[32px] md:mb-[48px] lg:mb-[72px]`}>
              Bring It To Life With<br className="max-md:hidden" />{" "}Warmth &amp; Legacy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] md:gap-[16px] lg:flex-1 lg:min-h-0">
              <Img src={ASSETS.keytag} alt="Yimaj Heights leather key tag" ratio="aspect-[726/700]" className="lg:min-h-[31.7vw]" />
              <Img src={ASSETS.businessCard} alt="Yimaj Heights embossed business card" ratio="aspect-[726/700]" className="lg:min-h-[31.7vw]" />
            </div>
          </section>

        </div>

        {/* Frame 7 */}
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.brochure}
            alt="Woman reading the Yimaj Heights brochure"
            ratio="aspect-[1472/867]"
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[65%_50%]" />
        </section>

        {/* Frame 8 */}
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.wayfinding} alt="Yimaj Heights wayfinding signs" ratio="aspect-[726/867]" />
          <Img src={ASSETS.iphone} alt="Yimaj Heights 3D logo on a phone" ratio="aspect-[726/867]" />
        </section>

        {/* Frame 9 */}
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.billboard}
            alt="Where Luxury Meets Community billboard"
            ratio="aspect-[1472/867]"
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 10 */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.folder} alt="Yimaj Heights sales folder" ratio="aspect-[726/867]" />
          <Img src={ASSETS.envelope} alt="Yimaj Heights envelope on marble" ratio="aspect-[726/867]" className="bg-[#e8e1d8]" />
        </section>

        {/* Frame 11 */}
        <section data-header-bg="light" className={`sticky top-0 z-0 w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.presentation}
            alt="Yimaj Heights investor presentation on a monitor"
            ratio="aspect-[1476/792]"
            parallax={false}
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frames 12 to 18 scroll over the pinned Frame 11 */}
        <div className="relative z-10 w-full bg-[var(--bg-light)] flex flex-col gap-[12px] md:gap-[16px]">

        {/* Frame 12 */}
        <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} ${FRAME_PB} lg:h-[100dvh]`}>
          <h2 className={`${CS_HEADING} mb-[32px] md:mb-[48px] lg:mb-[72px]`}>
            62 Million In Sale<br className="max-md:hidden" />{" "}Pre-Construction
          </h2>
          <Img
            src={ASSETS.living}
            alt="Yimaj Heights living room render"
            ratio="aspect-[1476/867]"
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 13 */}
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.exterior}
            alt="Yimaj Heights towers exterior render"
            ratio="aspect-[1472/867]"
            className="max-md:!aspect-[3/2] lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 14 */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.bedroom} alt="Yimaj Heights bedroom render" ratio="aspect-[726/867]" />
          <Img src={ASSETS.kitchen} alt="Yimaj Heights kitchen and dining render" ratio="aspect-[726/867]" />
        </section>

        {/* Frame 15 */}
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

        {/* Frame 16 */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.courtyard} alt="Yimaj Heights courtyard and amenity block" ratio="aspect-[726/867]" />
          <Img src={ASSETS.football} alt="Yimaj Heights rooftop football court from above" ratio="aspect-[726/867]" />
        </section>

        {/* Frame 17 */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.pool}
            alt="Yimaj Heights indoor swimming pool"
            ratio="aspect-[1476/867]"
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 18 */}
        <section data-header-bg="dark" className="w-full">
          <Img
            src={ASSETS.floorplan}
            alt="Yimaj Heights isometric apartment floor plan"
            ratio="aspect-[1476/798]"
            className="max-md:!aspect-[3/2] lg:h-[calc(100dvh-24px)]" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Closing frame: preview of the next project */}
        <NextProject current="yimaj" />

        </div>

      </main>
    </div>
  )
}