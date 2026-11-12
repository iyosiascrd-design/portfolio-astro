// src/lib/heroPrefetch.js
//
// Case-study hero images are the first thing a visitor waits for after clicking a project.
// Starting the download on intent (hover / touch / click) and during idle time means the
// request is already finished (or well underway) when the case study mounts.

const HEROES = {
    weyra: "/weyra-hero.jpg",
    origen: "/origen-hero.jpg",
    yimaj: "/yimaj-hero.jpg",
    zhongshan: "/zhongshan-house.jpg",
}

const warmed = new Map() // src -> decode promise

export const heroSlugFor = (name = "") => {
    const lower = String(name).toLowerCase()
    if (lower.includes("weyra")) return "weyra"
    if (lower.includes("origen")) return "origen"
    if (lower.includes("yimaj")) return "yimaj"
    if (lower.includes("zhongshan")) return "zhongshan"
    return null
}

export function prefetchHero(slug, priority = "high") {
    const src = HEROES[slug]
    if (!src || typeof Image === "undefined") return null
    if (warmed.has(src)) return warmed.get(src)

    const img = new Image()
    img.decoding = "async"
    if ("fetchPriority" in img) img.fetchPriority = priority
    img.src = src
    // The bytes land in the shared HTTP / memory cache, so the real <img> later is instant.
    const done = (img.decode ? img.decode() : Promise.resolve()).catch(() => {})
    warmed.set(src, done)
    return done
}

// Low priority: used once the homepage is idle, never competes with what is on screen.
export const warmAllHeroes = () => {
    Object.keys(HEROES).forEach((slug) => prefetchHero(slug, "low"))
}