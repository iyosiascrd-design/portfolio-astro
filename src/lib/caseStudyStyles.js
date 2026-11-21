// src/lib/caseStudyStyles.js
// Shared type + scrim styles for every case study page.
// Change a value here and all four case studies update together.

// Chapter headings (Borscha, uppercase). They are the H1 step of the heading scale in index.css
// (54px desktop / 48px tablet / 40px mobile), so size, line-height and tracking all come from the tokens.
export const CS_HEADING =
  "[font-family:var(--font-display)] font-medium uppercase text-[length:var(--type-h1-size)] leading-[var(--type-h1-line-height)] tracking-[var(--type-h1-letter-spacing)] [text-wrap:balance] lg:[text-wrap:wrap]"

// Body paragraphs (BDO Grotesk): fixed 16px at every width
export const CS_PARA =
  "[font-family:var(--font-body)] font-normal text-[var(--text-light-body)] text-[16px] leading-[1.35] tracking-[-0.005em] [text-wrap:pretty]"

// Frame 1 hero paragraph (white): 20px at 375px wide scaling to 24px at 1440px wide
export const CS_HERO_PARA =
  "[font-family:var(--font-body)] font-normal !text-white text-[clamp(20px,calc(18.59px+0.3756vw),24px)] leading-[1.35] tracking-[-0.005em] [text-wrap:pretty]"

// Hero image scrims. Use CS_HERO_SCRIM_DIM for projects with bright hero photos.
export const CS_HERO_SCRIM =
  "absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/50 via-black/10 to-transparent"
export const CS_HERO_SCRIM_DIM =
  "absolute inset-0 z-[1] pointer-events-none bg-black/20 bg-gradient-to-t from-black/60 via-black/10 to-transparent"