export const RESPONSIVE_CSS = `
.rwd-balance { text-wrap: balance; }
.rwd-pretty { text-wrap: pretty; }

/* Trim the empty leading above the capitals (and below the baseline) so two text
   blocks of different sizes align by the actual top of their letters.
   Chrome 133+, Safari 18.2+. Unsupported browsers simply ignore it. */
.cap-trim {
    text-box-trim: trim-both;
    text-box-edge: cap alphabetic;
}

html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
.lenis.lenis-stopped { overflow: hidden; }
.lenis.lenis-smooth iframe { pointer-events: none; }

@media (max-width: 1023px) {
    .H1 { font-size: clamp(44px, 11vw, 88px); line-height: 1; }
    .H2 { font-size: clamp(30px, 8.4vw, 56px); line-height: 1.06; }
    .H3 { font-size: clamp(22px, 5.2vw, 32px); line-height: 1.15; }
    .H4 { font-size: clamp(18px, 4.5vw, 22px); line-height: 1.15; }
    .P1 { font-size: clamp(16px, 2.2vw, 20px); line-height: 1.45; }
    .P2 { font-size: clamp(14px, 1.9vw, 16px); line-height: 1.5; }
}

/* Small desktop + large tablet (1024 to 1439px): other H2 headings (unchanged) */
@media (min-width: 1024px) and (max-width: 1439px) {
    :root { --svc-fs: clamp(44px, 4.2vw, 60px); }
    .H2 { font-size: var(--svc-fs); line-height: 1.06; }
}

/* ============================================================
   SERVICES LIST
   One layout, driven by the width of the list itself (container
   queries), not by guesses about the viewport. The list's width
   changes with the right preview column, page padding and the
   accordion, so every size below is derived from it.

   Columns:  number | title | description | +/- icon (icon < 1024px only)
   ============================================================ */
.svc-list { container: svc / inline-size; }

.svc-row {
    --svc-title: clamp(26px, 5.2cqi, 44px);
    --svc-num: 44px;
    --svc-gap: 16px;
    --svc-icon: 14px;
    display: grid;
    grid-template-columns: var(--svc-num) minmax(0, 1.1fr) minmax(0, 1fr) var(--svc-icon);
    column-gap: var(--svc-gap);
    align-items: center;
    padding-block: clamp(14px, 2.6svh, 28px);
}

.svc-num { white-space: nowrap; }
.svc-title { min-width: 0; }
.svc-title-text {
    font-size: var(--svc-title);
    line-height: 1.05;
    white-space: nowrap;
}
.svc-keywords {
    font-family: var(--font-body);
    font-size: var(--svc-desc-size);
    line-height: 1.35;
    letter-spacing: 0;
    font-weight: 400;
}
.svc-icon { justify-self: end; }

/* Description size (also used by the right-hand caption paragraph) */
:root { --svc-desc-size: 16px; }
@media (min-width: 1024px) and (max-width: 1439px) { :root { --svc-desc-size: clamp(14px, 1.5vw, 18px); } }
@media (min-width: 1440px) { :root { --svc-desc-size: var(--type-body-size); } }
@media (min-width: 1024px) { .svc-desc { font-size: var(--svc-desc-size) !important; } }
/* Size-only match for other supporting paragraphs (hero text, expertise descriptions and tools) */
.svc-size { font-size: var(--svc-desc-size) !important; }

/* Desktop: no accordion icon */
@media (min-width: 1024px) {
    .svc-icon { display: none; }
    .svc-row { grid-template-columns: var(--svc-num) minmax(0, 1.1fr) minmax(0, 1fr); }
}

/* Wide list: title takes 5/8, description 3/8 (the original desktop proportions) */
@container svc (min-width: 1000px) {
    .svc-row { grid-template-columns: var(--svc-num) minmax(0, 5fr) minmax(0, 3fr); }
    @media (max-width: 1023px) {
        .svc-row { grid-template-columns: var(--svc-num) minmax(0, 5fr) minmax(0, 3fr) var(--svc-icon); }
    }
}

/* Narrow list (phones): description drops under the title, aligned with it */
@container svc (max-width: 579px) {
    .svc-row {
        --svc-title: clamp(24px, 8.5cqi, 34px);
        --svc-num: 36px;
        --svc-gap: 12px;
        grid-template-columns: var(--svc-num) minmax(0, 1fr) var(--svc-icon);
        row-gap: 6px;
        align-items: start;
    }
    .svc-num { grid-column: 1; grid-row: 1; padding-top: 0.5em; }
    .svc-title { grid-column: 2; grid-row: 1; }
    .svc-keywords-cell { grid-column: 2; grid-row: 2; }
    .svc-icon { grid-column: 3; grid-row: 1 / span 2; align-self: center; }
    .svc-keywords { font-size: 16px; }
}

/* Accordion panel (below 1024px) */
.svc-panel {
    display: grid;
    gap: 16px;
    padding-bottom: 28px;
}
.svc-panel-text {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
}

/* Wide enough for columns: image = title column, caption = description column,
   both indented to the title's left edge (number column + gap). */
@container svc (min-width: 580px) {
    .svc-panel {
        padding-left: calc(44px + 16px);
        padding-bottom: 32px;
        grid-template-columns: calc((100cqi - 44px - 14px - 48px) * 1.1 / 2.1) minmax(0, 1fr);
        column-gap: 16px;
    }
    .svc-panel-text { gap: 0; }
}
@container svc (min-width: 1000px) {
    .svc-panel { grid-template-columns: calc((100cqi - 44px - 14px - 48px) * 5 / 8) minmax(0, 1fr); }
}

/* Tablet only: Section 1 hero heading */
@media (min-width: 768px) and (max-width: 1023px) {
    .hero-title { font-size: clamp(30px, 8.4vw, 56px); line-height: 1.06; }
}

/* Mobile only: Section 1 hero heading */
@media (max-width: 767px) {
    .hero-title { font-size: 48px; line-height: 1.05; }
}

/* Tablet + small desktop (768 to 1439px): footer meta */
@media (min-width: 768px) and (max-width: 1439px) {
    .H6.footer-meta { font-size: 14px; line-height: 1.2; }
}

/* Desktop only (1440px and up): footer meta */
@media (min-width: 1440px) {
    .H6.footer-meta { font-size: 14px; line-height: 1.2; }
}

/* Mobile only: footer meta */
@media (max-width: 767px) {
    .H6.footer-meta { font-size: 12px; line-height: 1.2; }
}

/* Mobile only: About Me paragraphs */
@media (max-width: 767px) {
    .H3.about-text { font-size: 24px; line-height: 1.15; }
}

/* Mobile only: Expertise row titles */
@media (max-width: 767px) {
    .H3.expertise-title { font-size: 24px; line-height: 1.15; }
}
`