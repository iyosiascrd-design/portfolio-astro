export const RESPONSIVE_CSS = `
.rwd-balance { text-wrap: balance; }
.rwd-pretty { text-wrap: pretty; }

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

/* Small desktop + large tablet (1024 to 1439px): Services grid column alignment */
@media (min-width: 1024px) and (max-width: 1439px) {
    :root { --svc-fs: clamp(44px, 4.2vw, 60px); }
    .H2 { font-size: var(--svc-fs); line-height: 1.06; }
    .svc-row {
        grid-template-columns: minmax(0, 1fr) calc(var(--svc-fs) * 9) !important;
        column-gap: 16px !important;
        row-gap: 6px !important;
    }
    .svc-title-cell { display: contents !important; }
    .svc-title-cell > span { grid-column: 1; grid-row: 1; align-self: baseline; justify-self: start; }
    .svc-title-cell > div { grid-column: 2; grid-row: 1; align-self: baseline; justify-self: start; }
    .svc-keywords-cell { grid-column: 2 !important; grid-row: 2; justify-self: start; text-align: left; }
}

/* Tablet only (768 to 1023px): Services accordion indent */
@media (min-width: 768px) and (max-width: 1023px) {
    .svc-num { display: inline-block; width: 40px; flex-shrink: 0; }
    .svc-panel { padding-left: 60px; }
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