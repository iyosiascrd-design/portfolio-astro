// src/lib/caseStudyStyles.js
// Shared type + scrim styles for every case study page.
// Change a value here and all four case studies update together.

// Section headings (Borscha, uppercase, tight)
export const CS_HEADING =
  "[font-family:var(--font-display)] font-medium uppercase text-[clamp(40px,calc(6.04px+5.66vw),64px)] lg:text-[clamp(44px,4.233vw,80px)] leading-[1] tracking-[-0.04em] [text-wrap:balance] lg:[text-wrap:wrap]"

// Body paragraphs (BDO Grotesk): fixed 18px at every width
export const CS_PARA =
  "[font-family:var(--font-body)] font-normal text-[var(--text-light-body)] text-[18px] leading-[1.35] tracking-[-0.005em] [text-wrap:pretty]"

// Frame 1 hero paragraph (white): 20px at 375px wide scaling to 24px at 1440px wide
export const CS_HERO_PARA =
  "[font-family:var(--font-body)] font-normal !text-white text-[clamp(20px,calc(18.59px+0.3756vw),24px)] leading-[1.35] tracking-[-0.005em] [text-wrap:pretty]"

// Hero image scrims. Use CS_HERO_SCRIM_DIM for projects with bright hero photos.
export const CS_HERO_SCRIM =
  "absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/50 via-black/10 to-transparent"
export const CS_HERO_SCRIM_DIM =
  "absolute inset-0 z-[1] pointer-events-none bg-black/20 bg-gradient-to-t from-black/60 via-black/10 to-transparent"