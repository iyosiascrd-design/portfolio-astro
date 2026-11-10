// src/data/pageContent.ts
//
// Plain-text copy of every page, rendered as real HTML by SeoContent.astro
// (inside <noscript>) and used for the JSON-LD structured data.
//
// KEEP IN SYNC with the React pages: when you change a heading or paragraph on a
// page, change it here too. This file does not affect how the site looks.

export type Section = { heading: string; text?: string }

export type PageContent = {
  h1: string
  intro?: string
  /** e.g. ["Brand Identity", "Completed 2025"] */
  meta?: string[]
  sections: Section[]
  /** Case studies only */
  year?: string
  services?: string[]
}

export const PROJECT_LINKS = [
  { href: "/work/weyra", label: "Weyra: Brand Identity" },
  { href: "/work/yimaj", label: "Yimaj Heights: Brand Identity and 3D Visuals" },
  { href: "/work/origen", label: "Origen: Brand Identity" },
  { href: "/work/zhongshan", label: "Zhongshan: Brand Identity and 3D Visuals" },
]

export const PAGE_CONTENT: Record<string, PageContent> = {
  "": {
    h1: "What if your brand matched what you have built?",
    intro: "Based in Addis Ababa, Ethiopia",
    sections: [
      {
        heading: "Brand Identity",
        text: "Strategy, positioning, identity systems and guidelines. Every business has an edge. I sharpen yours into a brand people recognize.",
      },
      {
        heading: "Digital Design",
        text: "Websites, landing pages and digital experiences. Create digital experiences people enjoy, turning curious visitors into customers.",
      },
      {
        heading: "Communication",
        text: "Pitch decks, presentations and campaign design. From pitch decks to campaigns, turn complex ideas into clear visuals that get people to act.",
      },
      {
        heading: "3D Visuals",
        text: "Product visualization, arch visualization and motion. High-fidelity renders that build desire and make the future instantly tangible.",
      },
      {
        heading: "About me",
        text: "Industries change; the standard doesn't. Over eight years, I have shaped brands across real estate, coffee, technology, consumer products, and social impact. Great brands win on distinction, not volume. I turn complex ideas into identities that define their category.",
      },
      {
        heading: "Expertise",
        text: "Brand Identity: complete positioning, visual systems, and brand guideline (Adobe Illustrator, Adobe Photoshop, Adobe InDesign). Web & UI Design: high-converting landing pages and responsive Framer sites (Figma, Framer, Webflow). Pitch & Presentation: decks that win clients, funding, and board approval (Canva, PowerPoint, Keynote). 3D & Motion: high-impact 3D visuals, product renders, and video motion (Blender, After Effects, DaVinci).",
      },
    ],
  },

  work: {
    h1: "Work",
    intro: "How I can help: Brand Identity, Digital Design, Communication, 3D Visuals.",
    sections: [],
  },

  "work/weyra": {
    h1: "Weyra",
    intro:
      "I shaped Weyra’s identity to challenge outdated narratives about Ethiopian youth, uniting 100+ participants across government, media, civil society, and youth organizations.",
    meta: ["Brand Identity", "Completed 2023"],
    year: "2023",
    services: ["Brand Identity"],
    sections: [
      {
        heading: "An Olive Branch Reimagined",
        text: "Weyra needed an identity that presented peacebuilding as something young people could actively shape, not just a response to conflict. I built a contemporary visual identity around the olive branch, giving the organization a clear, recognizable voice without relying on the familiar visual language of NGOs.",
      },
      {
        heading: "A Clear Voice Everywhere",
        text: "Acumin Variable Concept suits signage, social media, and editorial layouts. It is geometric, clear, and approachable.",
      },
      {
        heading: "Familiarly Ethiopian",
        text: "Familiar Ethiopian colors bring warmth and youth to the palette, keeping the visual language grounded and true to its subject.",
      },
      { heading: "One Identity In Harmony" },
    ],
  },

  "work/origen": {
    h1: "Origen",
    intro:
      "Designing Origen’s brand identity and packaging to stand out with a distinctive, premium look in Spain’s sea of minimalist coffee brands.",
    meta: ["Brand Identity", "Completed 2025"],
    year: "2025",
    services: ["Brand Identity"],
    sections: [
      {
        heading: "Born in the Highlands",
        text: "Premium coffee shelves are full of the same quiet minimalism and no emphasis on origin. But Origen’s coffee comes from Ethiopia, coffee’s birthplace. So the identity had to look Ethiopian, not generic, and still hold its own on a Spanish specialty shelf.",
      },
      {
        heading: "Heritage Meets Modernity",
        text: "Cormorant Garamond brings historical weight and editorial elegance, anchoring the identity in craft and origin storytelling through its high-contrast serif structure. DM Sans provides a clean, modern counterweight, delivering geometric precision and sharp legibility across product labels, origin specs, and roasting profiles.",
      },
      {
        heading: "Highland Inspired Color",
        text: "While competitors defaulted to sterile minimalism, we rooted the brand in the warmth and history of its original landscape.",
      },
      { heading: "A Premium Presence" },
    ],
  },

  "work/yimaj": {
    h1: "Yimaj Heights",
    intro:
      "Designing the brand identity and 3D visuals that resulted in 62 Million in sales before a single brick was laid.",
    meta: ["Brand Identity", "3D Visuals", "Completed 2025"],
    year: "2025",
    services: ["Brand Identity", "3D Visuals"],
    sections: [
      {
        heading: "Selling More Than Square Metres",
        text: "Most developments sell square footage and location. Yimaj Heights sold a way of life focusing on family, luxury, and community. The identity started with two ideas: aspiration and continuity. The star represents the ambition behind owning a home and building a better future. The bridge connects that ambition across generations: what families have built, what they are building now, and what they hope to leave behind.",
      },
      {
        heading: "Precision Softened By Warmth",
        text: "Architectural precision sans serif meets timeless serif typography, creating a refined system that feels premium without feeling sterile.",
      },
      {
        heading: "Luxury Paired With Belonging",
        text: "Instead of following the cold, minimal language common in luxury real estate, Yimaj uses warm mineral tones to make the brand feel more human.",
      },
      { heading: "Bring It To Life With Warmth & Legacy" },
      { heading: "62 Million In Sales Pre-Construction" },
    ],
  },

  "work/zhongshan": {
    h1: "Zhongshan",
    intro:
      "Zhongshan needed an identity that made sourcing from China feel like a confident investment.",
    meta: ["Brand Identity", "3D Visuals", "Completed 2025"],
    year: "2025",
    services: ["Brand Identity", "3D Visuals"],
    sections: [
      {
        heading: "Beyond Finding Suppliers",
        text: "From cluttered freight catalogs to a refined architectural identity, supported by editorial print and photorealistic 3D interiors that made sourcing entire buildings feel more tangible and trustworthy.",
      },
      {
        heading: "Technical By Nature Editorial By Design",
        text: "Inter balances bold editorial headlines with crisp, legible numbers across technical spec tables.",
      },
      {
        heading: "Contrast With Purpose",
        text: "A restrained grey palette puts the materials first, while deep blue and turquoise bring contrast and character.",
      },
      { heading: "Bring It To Life With Warmth & Legacy" },
      { heading: "3D Renders That Feel Real" },
    ],
  },
}