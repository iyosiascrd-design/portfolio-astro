// src/pages/ZhongshanCaseStudy.jsx

import React, { useEffect, useLayoutEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useOutletContext } from "react-router-dom"
import { ArrowDown } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import MaskRevealText from "../components/MaskRevealText"
import LineMaskText from "../components/LineMaskText"
import { usePageReady, usePageTransition } from "../components/PageTransitionOverlay"
import NextProject from "../components/NextProject"
import { Img as BaseImg, SceneVideo, LazyImg, HERO_IMG_PROPS, Media } from "../components/CaseStudyMedia"
import { useCaseStudyReveal, prefersReducedMotion } from "../lib/useCaseStudyReveal"

gsap.registerPlugin(ScrollTrigger)

const FRAME_PB = "pb-0"

const CS_HEADING =
  "[font-family:var(--font-display)] font-medium uppercase text-[clamp(40px,calc(6.04px+5.66vw),64px)] lg:text-[clamp(44px,4.233vw,80px)] leading-[1] tracking-[-0.04em] [text-wrap:balance] lg:[text-wrap:wrap]"
const CS_PARA =
  "[font-family:var(--font-heading)] font-normal text-[var(--text-light-body)] text-[18px] lg:text-[clamp(15px,1.19vw,22px)] leading-[1.265] tracking-[-0.01em] [text-wrap:pretty]"
const CS_FRAME_MIN_H = "lg:min-h-[max(64.95vw,min(100dvh,75vw))]"
const CS_FRAME_PT = "pt-[96px] lg:pt-[144px]"

// File names in /public. Swap any name here if an image lands in the wrong frame.
const ASSETS = {
  hero: "/zhongshan-house.jpg",
  suppliers: "/zhongshan-logo-animation.webm",
  logoConstruction: "/zhongshan-logo-construction.jpg",
  logoBrass: "/zhongshan-brass.jpg",
  typeSpecimen: "/zhongshan-type.jpg",
  typeCard: "/zhongshan-sticker.jpg",
  typeTablet: "/zhongshan-type-tablet.webm",
  color: "/zhongshan-color.webm",
  colorTexture: "/zhongshan-color-texture.jpg",
  hardhat: "/zhongshan-hardhat.jpg",
  flyer: "/zhongshan-flyer.jpg",
  cardboard: "/zhongshan-cardboard.jpg",
  screen: "/zhongshan-screen.jpg",
  poster: "/zhongshan-poster.jpg",
  signage: "/zhongshan-sign.jpg",
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

const HERO_TEXT =
  "Zhongshan needed an identity that made sourcing from China feel like a confident investment."

// Shared media primitives live in components/CaseStudyMedia.jsx
const MEDIA_PLACEHOLDER = "bg-[#ece7df]"

const Img = (props) => <BaseImg placeholder={MEDIA_PLACEHOLDER} hideOnError {...props} />

const Video = (props) => (
  <SceneVideo
    name="zhongshan"
    placeholder={MEDIA_PLACEHOLDER}
    videoClassName="absolute inset-y-0 -left-[3%] w-[106%] max-w-none h-full"
    {...props}
  />
)

const ZHONGSHAN_LETTER_SPACING_EM = -0.02

export default function ZhongshanCaseStudy() {
  const outletCtx = useOutletContext()
  const setHeaderLight = outletCtx?.setHeaderLight || (() => {})
  const heroFade = outletCtx?.heroFade
  const lenisRef = outletCtx?.lenisRef

  const ready = usePageReady()
  const pageTransition = usePageTransition()

  const rootRef = useRef(null)
  const heroRef = useRef(null)

  useLayoutEffect(() => {
    const hero = heroRef.current
    const title = hero?.querySelector("h1")
    if (!hero || !title) return

    const mq = window.matchMedia("(max-width: 1023px)")
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
        Array.from("ZHONGSHAN").reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        9 * ZHONGSHAN_LETTER_SPACING_EM * 100
      if (!w100 || !avail) return
      title.style.letterSpacing = `${ZHONGSHAN_LETTER_SPACING_EM}em`
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
    lenisRef?.current?.scrollTo(0, { immediate: true })
    if (heroFade) {
      heroFade.set(1)
    }
  }, [setHeaderLight, heroFade, lenisRef])

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    if (!pageTransition?.isSharedEntry?.()) gsap.set("[data-hero-img]", { scale: 1.25 })
    gsap.set("[data-hero-meta]", { opacity: 0 })
  }, [])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to("[data-hero-img]", { scale: 1, duration: 2, ease: "power3.out" })
    }, heroRef)
    return () => ctx.revert()
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

  useCaseStudyReveal(rootRef, lenisRef)

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
          src={ASSETS.hero}
          alt="Zhongshan villa with travertine cantilever roof and olive tree"
          className="absolute inset-0 w-full h-full object-cover object-[35%_30%] md:object-center z-0 will-change-transform"
        />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/50 via-black/10 to-transparent" aria-hidden="true" />

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

        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-end w-full text-white pt-0 md:pt-[100px] lg:pt-[180px]">
          <div className="max-w-[min(540px,36vw)] max-lg:max-w-none md:max-lg:max-w-[60vw] max-lg:mb-[64px]">
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
              className="CaseHero !text-white ![font-family:var(--font-heading)] max-md:!text-[20px] sm:max-md:portrait:!text-[25px] md:!text-[clamp(24px,2.7vw,28px)] lg:!text-[clamp(24px,1.8vw,34px)]"
            >
              {HERO_TEXT}
            </MaskRevealText>
          </div>

          <MaskRevealText
            as="h1"
            mode="letters"
            active={ready}
            delay={0.4}
            stagger={0.08}
            className="CaseH1 uppercase !leading-[1.1] -my-[0.125em] whitespace-nowrap"
          >
            Zhongshan
          </MaskRevealText>
        </div>
      </section>

      <main className="relative z-10 w-full bg-[var(--bg-light)] px-[var(--page-pad)] md:px-[var(--page-pad)] lg:px-[var(--page-pad)] flex flex-col gap-[12px] md:gap-[16px]">

        <div className="flex flex-col gap-[12px] md:gap-[16px] lg:gap-0 lg:-mb-[16px]">

          {/* Frame 2 — Beyond Finding Suppliers */}
          <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} lg:pt-[11.9vw] pb-0 lg:pb-[16px] ${CS_FRAME_MIN_H}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-[16px] gap-y-[64px] md:gap-y-[80px] items-end mb-[32px] md:mb-[48px] lg:mb-[72px]">
              <h2 className={`${CS_HEADING} lg:col-span-7`}>
                Beyond Finding<br className="max-md:hidden" />{" "}Suppliers
              </h2>
              <LineMaskText as="p" className={`${CS_PARA} md:max-w-[520px] lg:max-w-none lg:col-start-8 lg:col-span-5`}>
                From cluttered freight catalogs to a refined architectural identity, supported by editorial print and photorealistic 3D interiors that made sourcing entire buildings feel more tangible and trustworthy.
              </LineMaskText>
            </div>
            <Media
              src={ASSETS.suppliers}
              alt="Curved balconies and timber fins on a modern residential facade"
              className="max-md:!aspect-[361/364] md:max-lg:!aspect-[3/2] lg:flex-1 lg:min-h-[26.5vw] w-full h-full object-cover"
            />
          </section>

          {/* Frame 3 — logo construction + brass emboss */}
          <section
            data-header-bg="light"
            className="w-full flex flex-col pt-0 pb-0 max-md:h-auto portrait:max-xl:h-auto landscape:md:max-xl:h-[100dvh] xl:pt-0 xl:pb-[16px] xl:min-h-[max(64.95vw,min(100dvh,75vw))]"
          >
            <div className="grid grid-cols-[minmax(0,845fr)_minmax(0,619fr)] grid-rows-1 max-md:grid-cols-1 max-md:grid-rows-[auto_auto] portrait:max-xl:grid-cols-1 portrait:max-xl:grid-rows-[auto_auto] gap-[12px] md:gap-[16px] portrait:max-xl:gap-[12px] flex-1 min-h-0">
              <Img
                src={ASSETS.logoConstruction}
                alt="Letter Z plus modern building equals the Zhongshan mark, over a cargo ship"
                ratio="aspect-auto"
                parallax={false}
                className="bg-[#0e5f78] self-start !aspect-auto [&>div]:!static [&>div]:!h-auto [&_img]:!static [&_img]:!h-auto [&_img]:!transform-none"
              />
              <div className="flex items-center justify-center">
                <Img
                  src={ASSETS.logoBrass}
                  alt="Zhongshan logo embossed in brushed brass"
                  ratio="aspect-[546/600]"
                  className="!w-[56%] !aspect-[546/600]"
                />
              </div>
            </div>
          </section>

          {/* Frame 4 — typography */}
          <section data-header-bg="light" className="w-full flex flex-col pt-[48px] lg:pt-[144px] pb-0 lg:pb-[16px]">
            <div className="cs-f4-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[16px] lg:gap-y-0 lg:grid-rows-[auto_auto_auto] lg:flex-1 lg:min-h-0">
              <h2 className={`cs-f4-span ${CS_HEADING} md:col-span-2 lg:col-span-3 lg:row-start-1 md:-mt-[0.125em] max-md:mb-[48px]`}>
                Technical By Nature<br className="max-md:hidden" />{" "}Editorial By Design
              </h2>

              <LineMaskText as="p" className={`cs-f4-span ${CS_PARA} md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-2 lg:self-start md:max-w-[290px] lg:max-w-none md:[text-wrap:wrap] md:max-lg:mt-[10.85vw] lg:mt-[12.5vw] md:mb-[24px] lg:mb-[64px] max-md:mb-[16px] md:!text-[clamp(14px,0.992vw,19px)] lg:!text-[clamp(15px,1.19vw,22px)]`}>
                Inter balances bold editorial headlines with crisp, legible numbers across technical spec tables.
              </LineMaskText>

              <div className="lg:row-start-3 lg:col-start-1 lg:h-[462px] flex flex-col">
                <Media
                  src={ASSETS.color}
                  alt="Zhongshan colour palette"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:row-start-3 lg:col-start-2 lg:h-[462px] flex flex-col">
                <Img
                  src={ASSETS.typeCard}
                  alt="Zhongshan Sourcing Technology folded navy card"
                  ratio="aspect-square"
                  parallax={false}
                  fade
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:row-start-3 lg:col-start-3 lg:h-[462px] flex flex-col tablet-hide">
                <Media
                  src={ASSETS.typeTablet}
                  alt="Zhongshan product catalogue on a tablet over perforated metal"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </section>

          {/* Frame 5 — colour */}
          <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} pb-0 lg:pb-[16px]`}>
            <h2 className={`cs-f5-heading ${CS_HEADING} max-lg:mb-[48px] md:max-lg:mb-[64px] lg:mb-[72px]`}>
              Contrast With<br className="max-md:hidden" />{" "}Purpose
            </h2>
            <div className="cs-f5-grid grid grid-cols-1 md:grid-cols-[60%_minmax(0,1fr)] lg:grid-cols-[602fr_357fr_481fr] gap-[12px] md:gap-[16px] lg:items-stretch lg:flex-1">
              <div className="lg:col-start-1 flex flex-col h-full">
                <div className="w-full lg:h-[581px] overflow-hidden rounded-lg md:rounded-[12px] bg-[#eff5f5]">
                  <Media
                    src={ASSETS.color}
                    alt="Zhongshan colour palette: Platinum, Pacific Blue, Prussian Blue, Dusty Grey and Shadow Grey"
                    className="w-full h-full object-contain object-left-top"
                  />
                </div>
              </div>

              <div className="cs-f5-wrap flex flex-col justify-between lg:col-start-2 h-full lg:h-[581px]">
                <Img
                  src={ASSETS.colorTexture}
                  alt="Grey and blue fabric and timber material samples"
                  ratio="aspect-[357/345]"
                  className="bg-[#d9d4cb] lg:!aspect-[357/345] w-full tablet-hide"
                />
                <LineMaskText as="p" className={`cs-f5-para ${CS_PARA} md:max-w-[520px] lg:max-w-[290px] md:!text-[clamp(14px,0.992vw,19px)] mt-[12px] lg:mt-auto`}>
                  A restrained grey palette puts the materials first, while deep blue and turquoise bring contrast and character.
                </LineMaskText>
              </div>

              <div className="lg:col-start-3 flex flex-col h-full">
                <Img
                  src={ASSETS.hardhat}
                  alt="Worker in a teal Zhongshan Sourcing Technology hard hat"
                  ratio="aspect-none"
                  parallax={false}
                  className="bg-[#0b3b4a] w-full lg:h-[581px] object-cover"
                />
              </div>
            </div>
          </section>

          {/* Frame 6 — warmth & legacy */}
          <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} pb-0 lg:pb-[16px] ${CS_FRAME_MIN_H}`}>
            <h2 className={`${CS_HEADING} mb-[32px] md:mb-[48px] lg:mb-[72px]`}>
              Bring It To Life With<br className="max-md:hidden" />{" "}Warmth &amp; Legacy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] md:gap-[16px] lg:flex-1 lg:min-h-0">
              <Img src={ASSETS.flyer} alt="Finishing Materials, Sourced from China flyer on stone samples" ratio="aspect-[726/700]" className="lg:min-h-[31.7vw]" />
              <Img src={ASSETS.cardboard} alt="Courier in a teal uniform carrying a Zhongshan porcelain tile sample box" ratio="aspect-[726/700]" className="lg:min-h-[31.7vw]" />
            </div>
          </section>

        </div>

        {/* Frame 7 */}
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.screen}
            alt="Seamless Sourcing exhibition screen with a glass shipping container"
            ratio="aspect-[1472/867]"
            className="bg-black max-md:!aspect-[3/2] lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 7b — poster + signage */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.poster} alt="Zhongshan poster in a timber-panelled lobby: A home is only as good as its details" ratio="aspect-[726/867]" />
          <Img src={ASSETS.signage} alt="Zhongshan teal logo signage on a dark panel against a blue sky" ratio="aspect-[726/867]" />
        </section>

        {/* Frame 8 */}
        <section data-header-bg="dark" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.folder}
            alt="Zhongshan One Stop Sourcing brochure and 2026 Collection catalogue"
            ratio="aspect-[1472/867]"
            className="bg-black max-md:!aspect-[3/2] lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 9 */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.boxes} alt="Navy Zhongshan packaging boxes on a warehouse cart" ratio="aspect-[726/867]" />
          <Img src={ASSETS.cargo} alt="Zhongshan branded shipping container on a truck" ratio="aspect-[726/867]" />
        </section>

        {/* Frame 10 — pinned, following frames scroll over it */}
        <section data-header-bg="light" className={`sticky top-0 z-0 w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.construction}
            alt="Zhongshan construction site hoarding: One Stop Shop For All Your Sourcing"
            ratio="aspect-[1476/867]"
            parallax={false}
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frames 11 to 13 scroll over the pinned Frame 10 */}
        <div className="relative z-10 w-full bg-[var(--bg-light)] flex flex-col gap-[12px] md:gap-[16px]">

        {/* Frame 11 — 3D renders */}
        <section data-header-bg="light" className={`w-full flex flex-col ${CS_FRAME_PT} ${FRAME_PB} lg:h-[100dvh]`}>
          <h2 className={`${CS_HEADING} mb-[32px] md:mb-[48px] lg:mb-[72px]`}>
            3D Renders<br className="max-md:hidden" />{" "}That Feel Real
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] md:gap-[16px] lg:flex-1 lg:min-h-0">
            <Video
              src={ASSETS.tiles}
              label="Fan of timber floor tiles"
              ratio="aspect-[726/867]"
              className="bg-[#cfcfcf] lg:min-h-[31.7vw]"
            />
            <Img
              src={ASSETS.wallPanel}
              alt="Timber and stone wall panels with an armchair on a dark stage"
              ratio="aspect-[726/867]"
              className="bg-[#111111] lg:min-h-[31.7vw]"
            />
          </div>
        </section>

        {/* Frame 11b — isometric floorplan video */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Video
            src={ASSETS.floorplan}
            label="Isometric 3D floorplan of the apartment"
            ratio="aspect-[1476/867]"
            className="bg-[#aeaaa9] max-md:!aspect-[3/2] lg:flex-1 lg:min-h-0"
          />
        </section>

        {/* Frame 12 */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] flex flex-col`}>
          <Img
            src={ASSETS.doors}
            alt="Three interior doors in grey, walnut and oak finishes"
            ratio="aspect-[1476/867]"
            className="max-md:!aspect-square lg:flex-1 lg:min-h-0" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Frame 12b — bathroom vanity + kitchen */}
        <section data-header-bg="light" className={`w-full ${FRAME_PB} lg:h-[100dvh] grid grid-cols-1 md:grid-cols-2 lg:grid-rows-1 gap-[12px] md:gap-[16px]`}>
          <Img src={ASSETS.bathroom} alt="Floating timber and marble bathroom vanity with backlit mirrors and brass sconces" ratio="aspect-[726/867]" />
          <Img src={ASSETS.kitchen} alt="Oak kitchen with stainless island, burr wood stool and amber pendant light" ratio="aspect-[726/867]" />
        </section>

        {/* Frame 13 */}
        <section data-header-bg="dark" className="w-full">
          <Img
            src={ASSETS.living}
            alt="Furniture vignette with a curved sofa, lounge chairs and timber screens on a navy stage"
            ratio="aspect-[1476/798]"
            className="max-md:!aspect-[3/2] lg:h-[calc(100dvh-24px)]" imgClassName="max-md:object-[50%_50%]" />
        </section>

        {/* Closing frame: preview of the next project */}
        <NextProject current="zhongshan" />

        </div>

      </main>
    </div>
  )
}