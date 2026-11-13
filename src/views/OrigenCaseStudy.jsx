// src/pages/OrigenCaseStudy.jsx

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
import MobileImageGroups, { useIsMobile } from "../components/MobileImageGroups"
import { Img, Media, isVideo, HERO_IMG_PROPS } from "../components/CaseStudyMedia"
import { FETCH_PRIORITY_KEY } from "../lib/loadingHints"
import { useIdlePreload } from "../lib/mediaPreload"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

import { CS_HEADING, CS_PARA, CS_HERO_PARA, CS_HERO_SCRIM } from "../lib/caseStudyStyles.JS"

gsap.registerPlugin(ScrollTrigger)

const FRAME_PB = "pb-0"

const CS_FRAME_MIN_H = "lg:min-h-[max(64.95vw,min(100dvh,75vw))]"
const CS_FRAME_PT = "pt-[96px] lg:pt-[144px]"

const CS_FULL_H = "max-md:min-h-[100svh] max-md:pt-[calc(var(--header-h,64px)+var(--cs-gap))] max-md:pb-[var(--cs-gap)] md:h-[100svh] md:pt-[calc(var(--header-h,64px)+var(--cs-gap))] md:pb-[var(--cs-gap)]"

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
  color: "/origen-color.webm",
  emboss: "/origen-emboss.jpeg",
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

const R_WIDE = 686 / 438
const R_SQ = 340 / 325

const ORIGEN_RUN = [
  { id: "pouchWood", ratio: 340 / 308, ratioClass: "aspect-[340/308]", bg: "light",
    render: (p) => <Img src={ASSETS.pouchWood} alt="Hand holding an Origen coffee pouch on a wooden shelf" ratio={p.ratio} className={p.className} /> },
  { id: "box", ratio: R_WIDE, ratioClass: "aspect-[686/438]", bg: "light",
    render: (p) => <Img src={ASSETS.box} alt="Origen drip coffee box: Where coffee began" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "wax", ratio: R_SQ, ratioClass: "aspect-[340/325]", bg: "light",
    render: (p) => <Img src={ASSETS.wax} alt="Origen wax seal" ratio={p.ratio} className={p.className} /> },
  { id: "cup", ratio: R_SQ, ratioClass: "aspect-[340/325]", bg: "light",
    render: (p) => <Img src={ASSETS.cup} alt="Origen paper cup under an espresso machine" ratio={p.ratio} className={p.className} /> },
  { id: "wallposter", ratio: R_WIDE, ratioClass: "aspect-[686/438]", bg: "light",
    render: (p) => <Img src={ASSETS.wallposter} alt="Three Origen wall posters" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
  { id: "barista", ratio: R_SQ, ratioClass: "aspect-[340/325]", bg: "light",
    render: (p) => <Img src={ASSETS.barista} alt="Barista wearing an Origen t-shirt" ratio={p.ratio} className={p.className} /> },
  { id: "tote", ratio: R_SQ, ratioClass: "aspect-[340/325]", bg: "light",
    render: (p) => <Img src={ASSETS.tote} alt="Origen tote bag on grass" ratio={p.ratio} className={p.className} /> },
  { id: "mountain", ratio: R_WIDE, ratioClass: "aspect-[686/438]", bg: "light",
    render: (p) => <Img src={ASSETS.mountain} alt="Origen stamp cards over the Ethiopian highlands" ratio={p.ratio} className={p.className} imgClassName="max-md:object-[50%_50%]" /> },
]

const PRELOAD_SRCS = Object.entries(ASSETS).filter(([k]) => k !== "hero").map(([, v]) => v)

const HERO_TEXT =
  "Designing Origen’s brand identity and packaging to stand out with a distinctive, premium look in Spain’s sea of minimalist coffee brands."

function InViewGif({ src, alt, className = "", threshold = 0.35, rounded = true }) {
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
      { threshold }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      warmIo?.disconnect()
    }
  }, [src, threshold])

  const roundingClass = rounded ? "rounded-lg md:rounded-[12px]" : ""
  return (
    <div data-reveal ref={boxRef} className={`relative isolate w-full overflow-hidden ${roundingClass} ${className}`}>
      {started && <Media src={src} alt={alt} lazy={false} className="absolute inset-0 w-full h-full object-cover rounded-[inherit]" />}
    </div>
  )
}

const TITLE_LETTER_SPACING_EM = -0.02
const TITLE = "ORIGEN"

export default function OrigenCaseStudy() {
  const outletCtx = useOutletContext()
  const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  const heroFade = outletCtx?.heroFade

  const isMobile = useIsMobile()
  // inline so no stylesheet rule can override it on phones
  const mobileGap = isMobile ? { gap: "var(--cs-gap)" } : undefined
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
        Array.from(TITLE).reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        TITLE.length * TITLE_LETTER_SPACING_EM * 100
      if (!w100 || !avail) return
      title.style.letterSpacing = `${TITLE_LETTER_SPACING_EM}em`
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
    <div ref={rootRef} data-page-transition="" className="w-full min-h-screen bg-[var(--bg-light)] text-[var(--text-light-primary)]">
      <section
        data-header-bg="dark"
        ref={heroRef}
        style={{ "--hero-pos-m": HERO_POS_MOBILE, "--hero-pos-d": HERO_POS_DESKTOP }}
        className="sticky top-0 z-0 w-full h-[100lvh] bg-[var(--bg-surface-dark)] overflow-hidden flex flex-col justify-end px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] pb-[calc(40px_+_100lvh_-_100dvh)] md:pb-[calc(var(--cs-gap)_+_100lvh_-_100dvh)] lg:pb-[calc(64px_+_100lvh_-_100dvh)]"
      >
        <Media
          src={ASSETS.hero}
          alt="Origen latte in a ceramic cup"
          mediaProps={{ "data-hero-img": "", ...HERO_IMG_PROPS, [FETCH_PRIORITY_KEY]: "high" }}
          className="absolute inset-0 w-full h-full object-cover [object-position:var(--hero-pos-m)] md:[object-position:var(--hero-pos-d)] z-0 will-change-transform"
        />
        <div className={CS_HERO_SCRIM} aria-hidden="true" />

        <div
          data-hero-meta
          className="absolute inset-x-[var(--page-pad)] top-[22.3%] z-10 flex justify-between md:relative md:inset-x-auto md:top-auto md:grid md:grid-cols-12 md:gap-x-[12px] md:gap-x-[16px] text-white text-[16px] sm:max-md:portrait:text-[20px] md:text-[18px] uppercase font-semibold [font-family:var(--font-display)]"
        >
          <span className="md:col-span-6">Brand Identity</span>
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
            className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] max-w-full"
          >
            Origen
          </MaskRevealText>
        </div>
      </section>

      <main style={mobileGap} className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--cs-gap)] md:px-[var(--cs-gap)] lg:px-[var(--cs-gap)] flex flex-col gap-[var(--cs-gap)] md:gap-[16px]">
        <div style={mobileGap} className="flex flex-col gap-[var(--cs-gap)] md:gap-[16px] lg:gap-0 lg:-mb-[16px]">
          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--cs-gap))] max-md:pb-0 ${CS_FRAME_PT} pb-0 lg:max-xl:pb-[16px] xl:pb-[16px] ${CS_FRAME_MIN_H}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-[16px] gap-y-[64px] md:gap-y-[80px] items-end mb-[32px] md:mb-[48px] lg:mb-[4.23vw] max-md:flex max-md:flex-col max-md:flex-1">
              <h2 className={`${CS_HEADING} lg:col-span-7 max-md:mb-auto max-md:pb-[32px]`}>
                Born in the<br className="max-md:hidden" />{" "}Highlands
              </h2>
              <LineMaskText as="p" className={`${CS_PARA} max-md:w-full max-md:self-stretch md:max-w-[520px] lg:max-w-none lg:col-start-8 lg:col-span-5`}>
                Premium coffee shelves are full of the same quiet minimalism and no emphasis on origin. But Origen’s coffee comes from Ethiopia, coffee’s birthplace. So the identity had to look Ethiopian, not generic, and still hold its own on a Spanish specialty shelf.
              </LineMaskText>
            </div>
            <Img
              src={ASSETS.beans}
              alt="Origen logo over roasted coffee beans"
              ratio="aspect-[1472/581]"
              parallax={false}
              imgClassName="scale-[1.08] max-md:object-cover"
              className="max-md:!aspect-auto max-md:h-[40svh] max-md:min-h-[320px] max-md:shrink-0 md:max-lg:!aspect-[3/2] lg:flex-1 lg:min-h-[26.5vw]"
            />
          </section>

          <section
            data-header-bg="light"
            className="w-full flex flex-col pt-0 pb-0 max-md:h-auto portrait:max-xl:h-auto landscape:md:max-xl:h-[100dvh] xl:pb-[16px] xl:min-h-[max(64.95vw,min(100dvh,75vw))]"
          >
            <div style={mobileGap} className="grid grid-cols-[minmax(0,845fr)_minmax(0,607fr)] grid-rows-1 max-md:grid-cols-1 max-md:grid-rows-[auto_auto] portrait:max-xl:grid-cols-1 portrait:max-xl:grid-rows-[auto_auto] gap-[var(--cs-gap)] md:gap-[16px] portrait:max-xl:gap-[12px] max-md:!gap-[var(--cs-gap)] flex-1 min-h-0">
              <Img
                src={ASSETS.construction1}
                alt="Kaldi’s goat + Origen + coffee bean"
                ratio="aspect-auto"
                parallax={false}
                className="bg-[#2a1810] self-start !aspect-auto [&>div]:!static [&>div]:!h-auto [&_img]:!static [&_img]:!h-auto [&_img]:!transform-none"
              />
              <div className="flex items-center justify-center">
                <Img
                  src={ASSETS.construction2}
                  alt="Origen logo over coffee crema"
                  ratio="aspect-[546/600]"
                  className="!w-[57.6%] !aspect-[546/600]"
                />
              </div>
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col pb-0 ${CS_FULL_H}`}>
            <div style={mobileGap} className="cs-f4-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--cs-gap)] md:gap-[16px] lg:gap-y-0 lg:grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,calc((100vw-64px)*0.321))] md:flex-1 md:min-h-0 max-md:flex max-md:flex-col max-md:flex-1">
              <div className="max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--cs-gap))] md:contents">
                <h2 className={`cs-f4-span ${CS_HEADING} md:col-span-2 lg:col-span-3 lg:row-start-1 md:-mt-[0.234em] max-md:mb-auto max-md:pb-[32px]`}>
                  Heritage Meets<br className="max-md:hidden" />{" "}Modernity
                </h2>

                <LineMaskText as="p" className={`cs-f4-span ${CS_PARA} md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-3 md:max-w-[490px] lg:max-w-none md:[text-wrap:wrap] md:max-lg:mt-[10.85vw] lg:mt-[24px] md:mb-[24px] lg:mb-[3.7vw] max-md:mb-[24px]`}>
                  Cormorant Garamond brings historical weight and editorial elegance, anchoring the identity in craft and origin storytelling through its high-contrast serif structure. DM Sans provides a clean, modern counterweight, delivering geometric precision and sharp legibility across product labels, origin specs, and roasting profiles.
                </LineMaskText>

                <div className="lg:row-start-4 max-md:h-auto max-md:shrink-0 w-full aspect-[405/417] md:aspect-auto">
                  <Img
                    src={ASSETS.typeTreatment}
                    alt="Taste the difference typography treatment over pouring coffee"
                    ratio="aspect-[405/417] md:aspect-[755/727]"
                    parallax={false}
                    fade
                    className="w-full h-full" imgClassName="object-cover"
                  />
                </div>
              </div>

              <Img
                src={ASSETS.packaging}
                alt="Hands holding two Origen coffee pouches"
                ratio="aspect-[404/391] md:aspect-[755/727]"
                parallax={false}
                className="lg:row-start-4 tablet-hide"
              />
              <Img
                src={ASSETS.type}
                alt="Cormorant Garamond and DM Sans type specimen over coffee beans"
                ratio="aspect-[549/664] md:aspect-[755/727]"
                parallax={false}
                fade
                className="lg:row-start-4 spec-natural"
              />
            </div>
          </section>

          <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col lg:flex lg:flex-col pb-0 ${CS_FULL_H}`}>
            <div style={mobileGap} className="cs-f5-grid grid grid-cols-1 md:grid-cols-[60%_minmax(0,1fr)] lg:grid-cols-[602fr_357fr_481fr] lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,calc((100vw-64px)*0.4035))] gap-x-[var(--cs-gap)] md:gap-x-[16px] gap-y-[var(--cs-gap)] md:gap-y-[16px] lg:gap-y-0 md:flex-1 lg:flex-1 md:min-h-0 max-md:flex max-md:flex-col">
              <div className="md:contents max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--cs-gap))]">
                <h2 className={`cs-f5-heading ${CS_HEADING} md:col-span-2 lg:col-span-3 md:-mt-[0.234em] max-lg:order-1 max-md:mb-auto max-md:pb-[32px] md:max-lg:mb-[64px]`}>
                  Highland<br className="max-md:hidden" />{" "}Inspired Color
                </h2>
                
                <LineMaskText as="p" className={`cs-f5-para ${CS_PARA} md:hidden self-start mb-[24px] max-lg:order-2`}>
                  While competitors defaulted to sterile minimalism, we rooted the brand in the warmth and history of its original landscape.
                </LineMaskText>

                <div className="lg:col-start-1 lg:row-start-3 max-lg:order-3 flex flex-col h-full max-md:h-auto max-md:shrink-0">
                  <InViewGif
                    src={ASSETS.color}
                    alt="Origen colour palette"
                    className="cs-f5-gif bg-[#262511] w-full max-md:h-auto md:h-full aspect-[1205/1162] lg:aspect-auto"
                  />
                </div>
              </div>

              <div className="cs-f5-wrap contents">
                <Img
                  src={ASSETS.emboss}
                  alt="Embossed Origen goat on cream leather"
                  ratio="aspect-[549/580]"
                  className="bg-[#c6b984] lg:col-start-2 lg:row-start-3 lg:self-start lg:!aspect-[357/345] lg:max-h-[400px] max-lg:order-4 tablet-hide"
                />
                <LineMaskText as="p" className={`cs-f5-para ${CS_PARA} md:max-w-[520px] lg:max-w-[360px] lg:col-start-2 lg:row-start-3 lg:self-end max-lg:order-2 max-lg:mb-[16px] md:max-lg:col-span-2 max-md:hidden`}>
                  While competitors defaulted to sterile minimalism, we rooted the brand in the warmth and history of its original landscape.
                </LineMaskText>
                <Img
                  src={ASSETS.billboard}
                  alt="Origen billboard in a wildflower meadow: Coffee from the source"
                  ratio="aspect-[356/236]"
                  parallax={false}
                  className="max-md:h-auto bg-[#26301c] lg:col-start-3 lg:row-start-3 lg:self-stretch max-lg:order-5 tablet-hide" imgClassName="max-md:object-[50%_50%] lg:object-top" />
              </div>
            </div>
          </section>
        </div>

        <section data-header-bg="light" className={`w-full max-md:flex max-md:flex-col max-md:min-h-[100svh] max-md:pb-0 max-md:mb-[calc(16px-var(--cs-gap))] ${CS_FRAME_PT} pb-0`}>
          {isMobile && (
            <div className="flex flex-col gap-[var(--cs-gap)] flex-1">
              <div className="flex flex-col min-h-[calc(100svh-var(--header-h,64px)-2*var(--cs-gap))]">
                <h2 className={`${CS_HEADING} mb-auto pb-[32px]`}>
                  A Premium Presence
                </h2>
                <Img src={ASSETS.iced} alt="Origen iced coffee on a branded coaster" ratio="aspect-[340/308]" className="h-auto" />
              </div>
              <MobileImageGroups items={ORIGEN_RUN} padVar="--cs-gap" />
            </div>
          )}

          {!isMobile && (
          <div className="flex flex-col gap-[var(--cs-gap)] md:gap-[16px] max-md:flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--cs-gap)] md:gap-[16px] max-md:flex max-md:flex-col">
              <div className="max-md:flex max-md:flex-col max-md:min-h-[calc(100svh-var(--header-h,64px)-2*var(--cs-gap))] md:contents">
                <h2 className={`${CS_HEADING} md:col-span-2 md:-mt-[0.234em] mb-[12px] md:mb-[16px] lg:mb-[10.8vw] max-md:mb-auto max-md:pb-[32px]`}>
                  A Premium<br className="max-md:hidden" />{" "}Presence
                </h2>
                <Img src={ASSETS.iced} alt="Origen iced coffee on a branded coaster" ratio="aspect-[340/308]" className="max-md:h-auto lg:!h-[clamp(30vw,calc(100dvh-376px),38.75vw)]" />
              </div>
              <Img src={ASSETS.pouchWood} alt="Hand holding an Origen coffee pouch on a wooden shelf" ratio="aspect-[340/308]" className="lg:!h-[clamp(30vw,calc(100dvh-376px),38.75vw)]" />
            </div>

            <Img src={ASSETS.box} alt="Origen drip coffee box: Where coffee began" ratio="aspect-[686/438]" className="max-md:h-auto lg:!h-[clamp(36vw,calc(100dvh-112px),57.5vw)]" imgClassName="max-md:object-[50%_50%]" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--cs-gap)] md:gap-[16px]">
              <Img src={ASSETS.wax} alt="Origen wax seal" ratio="aspect-[340/325]" className="lg:!h-[clamp(36vw,calc(100dvh-112px),57.5vw)]" />
              <Img src={ASSETS.cup} alt="Origen paper cup under an espresso machine" ratio="aspect-[340/325]" className="lg:!h-[clamp(36vw,calc(100dvh-112px),57.5vw)]" />
            </div>

            <Img src={ASSETS.wallposter} alt="Three Origen wall posters" ratio="aspect-[686/438]" className="max-md:h-auto lg:!h-[clamp(36vw,calc(100dvh-112px),57.5vw)]" imgClassName="max-md:object-[50%_50%]" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--cs-gap)] md:gap-[16px]">
              <Img src={ASSETS.barista} alt="Barista wearing an Origen t-shirt" ratio="aspect-[340/325]" className="lg:!h-[clamp(36vw,calc(100dvh-112px),57.5vw)]" />
              <Img src={ASSETS.tote} alt="Origen tote bag on grass" ratio="aspect-[340/325]" className="lg:!h-[clamp(36vw,calc(100dvh-112px),57.5vw)]" />
            </div>

            <Img src={ASSETS.mountain} alt="Origen stamp cards over the Ethiopian highlands" ratio="aspect-[686/438]" className="max-md:h-auto lg:!h-[clamp(30vw,calc(100dvh-236px),49.3vw)]" imgClassName="max-md:object-[50%_50%]" />
          </div>
          )}
        </section>

        <div className="w-full h-[48px] lg:h-[144px] max-md:hidden" aria-hidden="true" />
        <NextProject current="origen" />
      </main>
    </div>
  )
}