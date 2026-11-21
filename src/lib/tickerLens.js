// src/lib/tickerLens.js
//
// WebGL wide-angle lens for the work ticker (works in Safari, Chrome, Firefox).
//
// Pass 1 draws every visible card image, flat, into an offscreen texture (at the exact rectangles the
// DOM cards occupy). Pass 2 resamples that texture through a lens: content is magnified more and more
// toward the left / right edges (so card edges bend and the cards swell), and the colour channels are
// sampled across a continuous spread of strengths (7 taps with overlapping channel weights), which
// turns the rim into a soft spectral fringe instead of hard red / cyan ghost edges. A touch of light
// falloff and dithering at the rim keeps it feeling physical rather than like a filter.
//
// The canvas is transparent wherever there is no card, so the page shows through.

export const TICKER_LENS = {
    rest: 0.7,        // share of full strength shown at rest (flicking raises it to 1)
    reduced: 0.35,    // strength ceiling when the user prefers reduced motion
    start: 0.72,      // distance from the centre (0..1 of half the width) where the lens begins; the middle stays flat
    kx: 0.05,         // sideways magnification at the very edge (0 = none)
    ky: 0.07,         // vertical magnification at the very edge: this is what bends the top / bottom edges
    curve: 2.4,       // how the warp ramps up toward the edge (2 = quadratic; higher = later, softer onset)
    aberration: 0.14, // channel strength spread: edge fringe is about kx * aberration * width px (~10px at 1440 wide, full strength)
    falloff: 0.05,    // light lost at the very rim (0.04 - 0.07 is subtle; above ~0.08 reads as a vignette)
    pad: 200,         // px the canvas extends above and below the ticker so bent edges are not cut off
    maxTexture: 1536, // hard ceiling (px) for the longest side of an uploaded card image
    headroom: 1.5,    // texture resolution vs. the size the card is actually drawn at (avoids shimmer + wasted memory)
    maxCached: 16,    // textures kept alive; least recently used are evicted
    disableOnMobile: true, // skip the lens entirely on phones / touch tablets (plain DOM cards are used)
}

// True on phones and touch tablets (touch-first devices or narrow screens). The lens is skipped there.
export function isMobileDevice() {
    if (typeof window === "undefined" || !window.matchMedia) return false
    const touchFirst = window.matchMedia("(hover: none) and (pointer: coarse)").matches
    const narrow = window.matchMedia("(max-width: 820px)").matches
    return touchFirst || narrow
}

const VERT_CARD = `
attribute vec2 aPos;
uniform vec4 uRect;   // x, y, w, h in css px, y down
uniform vec2 uRes;    // canvas size in css px
varying vec2 vLocal;
void main() {
    vec2 px = uRect.xy + aPos * uRect.zw;
    vLocal = aPos * uRect.zw;
    gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}
`

const FRAG_CARD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec2 uImg;      // image size px (as uploaded)
uniform vec2 uSize;     // card size px
uniform float uShift;   // horizontal image parallax in px
uniform float uZoom;    // image scale inside the card (object-cover + zoom)
uniform float uOpacity;
uniform float uDim;
uniform vec2 uNat;      // natural image size px (the texture may be a downscaled copy)
varying vec2 vLocal;
void main() {
    vec2 c = vLocal - uSize * 0.5;
    // scale is computed from the natural size so a downscaled texture still covers the card identically
    float s = max(uSize.x / uNat.x, uSize.y / uNat.y) * uZoom;
    vec2 uv = (c - vec2(uShift, 0.0)) / (uNat * s) + 0.5;
    vec3 col = texture2D(uTex, uv).rgb * (1.0 - uDim);
    gl_FragColor = vec4(col, 1.0) * uOpacity;
}
`

const VERT_POST = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}
`

const FRAG_POST = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define TAPS 7
uniform sampler2D uScene;
uniform vec2 uRes;      // framebuffer size px
uniform float uCy;      // lens centre height, 0 = bottom, 1 = top
uniform float uKx;      // sideways strength at the edge
uniform float uKy;      // vertical strength at the edge
uniform float uAb;      // channel spread (chromatic aberration)
uniform float uStart;   // where the lens begins, 0..1 from the centre
uniform float uCurve;   // warp ramp exponent
uniform float uFalloff; // rim light falloff

vec4 lensSample(vec2 uv, float px, float p2, float kx, float ky) {
    vec2 src = vec2((px * (1.0 - kx * p2)) * 0.5 + 0.5, uCy + (uv.y - uCy) * (1.0 - ky * p2));
    if (src.x < 0.0 || src.x > 1.0 || src.y < 0.0 || src.y > 1.0) return vec4(0.0);
    return texture2D(uScene, src);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float px = uv.x * 2.0 - 1.0;
    float e = max(abs(px) - uStart, 0.0) / (1.0 - uStart);
    float p2 = e > 0.0 ? pow(e, uCurve) : 0.0;

    // Spectral sampling: R peaks at the weakest strength, B at the strongest, G in between,
    // with overlapping weights so the fringe blends into a gradient.
    vec3 acc = vec3(0.0);
    vec3 accA = vec3(0.0);
    vec3 wsum = vec3(0.0);
    for (int i = 0; i < TAPS; i++) {
        float s = float(i) / float(TAPS - 1);
        vec3 w = max(vec3(0.0), 1.0 - abs(vec3(s) - vec3(0.0, 0.5, 1.0)) * 2.0);
        float spread = (s - 0.5) * 2.0 * uAb;
        vec4 c = lensSample(uv, px, p2, uKx * (1.0 + spread), uKy * (1.0 + spread));
        acc += c.rgb * w;
        accA += c.a * w;
        wsum += w;
    }
    vec3 col = acc / wsum;
    vec3 al = accA / wsum;
    float a = max(al.r, max(al.g, al.b));

    // rim light falloff (premultiplied, so scale rgb only)
    col *= 1.0 - uFalloff * p2;

    // dither to prevent banding on dark / dimmed cards
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) / 255.0 * a;

    col = clamp(col, 0.0, a); // keep the premultiplied output valid
    gl_FragColor = vec4(col, a);
}
`

function compile(gl, type, src) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error(log || "shader compile failed")
    }
    return sh
}

function program(gl, vs, fs) {
    const p = gl.createProgram()
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, "aPos")
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link failed")
    return p
}

const uniforms = (gl, p, names) => {
    const out = {}
    names.forEach((n) => {
        out[n] = gl.getUniformLocation(p, n)
    })
    return out
}

/**
 * Returns null when WebGL is unavailable (the caller keeps the plain DOM cards).
 *
 * options = {
 *   onRestored,   // called after a lost context has been rebuilt (draw again on your next frame)
 *   fadeIn,       // fade the canvas in once the first card has been drawn (default false)
 * }
 *
 * frame = {
 *   width, height,      // canvas size in css px
 *   centerY,            // lens centre, css px from the canvas top
 *   strength,           // 0..1, 1 = full lens
 *   cards: [{ img, x, y, w, h, opacity, dim, shift, zoom }]   // css px in canvas coordinates
 * }
 */
export function createTickerLens(canvas, onLost, options = {}) {
    const { onRestored, fadeIn = false } = options

    // Mobile: no lens. Returning null makes the caller keep the plain DOM cards.
    if (TICKER_LENS.disableOnMobile && isMobileDevice()) return null

    let gl = null
    try {
        gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })
    } catch (e) {
        gl = null
    }
    if (!gl) return null

    let cardProg
    let postProg
    let U1
    let U2
    let quad
    let fbo
    let sceneTex
    let maxTex = 1024
    let fbW = 0
    let fbH = 0
    let cssW = 0
    let cssH = 0
    let dprUsed = 1
    let lastSize = null
    let lost = false
    let shown = !fadeIn

    // ---- card textures, cached per image source, least recently used evicted ----
    // key -> { tex, w, h, nw, nh }   (w/h = uploaded size, nw/nh = natural size)
    const textures = new Map()

    const reduceMotion = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

    if (fadeIn) {
        canvas.style.opacity = "0"
        canvas.style.transition = "opacity 450ms ease"
    }

    // Builds every GL resource. Used on creation and again after a context restore.
    const init = () => {
        cardProg = program(gl, VERT_CARD, FRAG_CARD)
        postProg = program(gl, VERT_POST, FRAG_POST)
        U1 = uniforms(gl, cardProg, ["uRect", "uRes", "uTex", "uImg", "uSize", "uShift", "uZoom", "uOpacity", "uDim", "uNat"])
        U2 = uniforms(gl, postProg, ["uScene", "uRes", "uCy", "uKx", "uKy", "uAb", "uStart", "uCurve", "uFalloff"])

        quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        maxTex = Math.min(TICKER_LENS.maxTexture, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 1024)

        fbo = gl.createFramebuffer()
        sceneTex = gl.createTexture()
        fbW = 0
        fbH = 0
    }

    try {
        init()
    } catch (e) {
        console.warn("Ticker lens disabled:", e)
        return null
    }

    // ---- scene framebuffer ----
    const allocScene = () => {
        gl.bindTexture(gl.TEXTURE_2D, sceneTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fbW, fbH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    const resize = (w, h, dpr) => {
        lastSize = { w, h, dpr }
        if (lost) return
        const d = Math.min(2, Math.max(1, dpr || 1))
        dprUsed = d
        cssW = w
        cssH = h
        const nw = Math.max(2, Math.round(w * d))
        const nh = Math.max(2, Math.round(h * d))
        if (nw === fbW && nh === fbH && canvas.width === nw) return
        fbW = nw
        fbH = nh
        canvas.width = nw
        canvas.height = nh
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        allocScene()
    }

    // Downscale in halving steps so the browser's smoothing never skips pixels (keeps fine detail clean).
    const downscale = (img, tw, th) => {
        let src = img
        let cw = img.naturalWidth
        let ch = img.naturalHeight
        while (cw / 2 >= tw && ch / 2 >= th) {
            const nw = Math.max(1, Math.round(cw / 2))
            const nh = Math.max(1, Math.round(ch / 2))
            const c = document.createElement("canvas")
            c.width = nw
            c.height = nh
            const ctx = c.getContext("2d")
            ctx.imageSmoothingQuality = "high"
            ctx.drawImage(src, 0, 0, nw, nh)
            src = c
            cw = nw
            ch = nh
        }
        if (cw !== tw || ch !== th) {
            const c = document.createElement("canvas")
            c.width = tw
            c.height = th
            const ctx = c.getContext("2d")
            ctx.imageSmoothingQuality = "high"
            ctx.drawImage(src, 0, 0, tw, th)
            src = c
        }
        return src
    }

    // Longest side the texture should have, given how large this card actually draws the image.
    const wantedLongest = (img, card) => {
        const nw = img.naturalWidth
        const nh = img.naturalHeight
        const s = Math.max(card.w / nw, card.h / nh) * (card.zoom || 1) // css px per image px
        const k = Math.min(1, s * dprUsed * TICKER_LENS.headroom)
        return Math.min(maxTex, Math.max(64, Math.round(Math.max(nw, nh) * k)))
    }

    const textureFor = (card) => {
        const img = card.img
        if (!img || !img.complete || !img.naturalWidth) return null
        const key = img.currentSrc || img.src
        const hit = textures.get(key)
        const nw = img.naturalWidth
        const nh = img.naturalHeight
        const want = wantedLongest(img, card)

        if (hit) {
            const have = Math.max(hit.w, hit.h)
            const cap = Math.min(maxTex, Math.max(nw, nh))
            // refresh recency; rebuild only if the card now needs noticeably more resolution than we hold
            textures.delete(key)
            textures.set(key, hit)
            if (!hit.tex || want <= have * 1.3 || have >= cap) return hit
            gl.deleteTexture(hit.tex)
            textures.delete(key)
        }

        let tw = nw
        let th = nh
        const longest = Math.max(nw, nh)
        if (want < longest) {
            const k = want / longest
            tw = Math.max(1, Math.round(nw * k))
            th = Math.max(1, Math.round(nh * k))
        }
        const source = tw !== nw || th !== nh ? downscale(img, tw, th) : img

        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
        } catch (e) {
            // cross-origin image without CORS headers: WebGL cannot read it
            gl.deleteTexture(tex)
            const dead = { tex: null, w: 0, h: 0, nw, nh }
            textures.set(key, dead)
            return dead
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const entry = { tex, w: tw, h: th, nw, nh }
        textures.set(key, entry)
        return entry
    }

    // Called after a frame, never mid-frame, so nothing in use is deleted. Map order = recency.
    const trimTextures = () => {
        const max = Math.max(4, TICKER_LENS.maxCached)
        if (textures.size <= max) return
        for (const [key, t] of textures) {
            if (textures.size <= max) break
            if (t.tex) gl.deleteTexture(t.tex)
            textures.delete(key)
        }
    }

    // ---- context loss / restore ----
    const onContextLost = (e) => {
        e.preventDefault() // allows the browser to restore the context
        lost = true
        textures.clear() // GL objects are already gone
        onLost?.()
    }
    const onContextRestored = () => {
        try {
            init()
            lost = false
            if (lastSize) resize(lastSize.w, lastSize.h, lastSize.dpr)
            onRestored?.()
        } catch (err) {
            console.warn("Ticker lens could not be restored:", err)
        }
    }
    canvas.addEventListener("webglcontextlost", onContextLost)
    canvas.addEventListener("webglcontextrestored", onContextRestored)

    // Returns the cards that were actually drawn (their texture was ready), by index.
    const drawn = []
    const draw = (frame) => {
        drawn.length = 0
        if (lost || !fbW) return drawn
        const { cards, centerY } = frame
        let strength = frame.strength
        if (reduceMotion && reduceMotion.matches) strength = Math.min(strength, TICKER_LENS.reduced)

        // pass 1: cards, flat, into the scene texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.viewport(0, 0, fbW, fbH)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.useProgram(cardProg)
        gl.uniform2f(U1.uRes, cssW, cssH)
        gl.uniform1i(U1.uTex, 0)
        gl.activeTexture(gl.TEXTURE0)

        for (let i = 0; i < cards.length; i++) {
            const c = cards[i]
            if (!(c.w > 0) || !(c.h > 0)) continue
            const t = textureFor(c)
            if (!t || !t.tex) continue
            drawn.push(i)
            if (!(c.opacity > 0.001)) continue
            gl.bindTexture(gl.TEXTURE_2D, t.tex)
            gl.uniform4f(U1.uRect, c.x, c.y, c.w, c.h)
            gl.uniform2f(U1.uImg, t.w, t.h)
            gl.uniform2f(U1.uNat, t.nw, t.nh)
            gl.uniform2f(U1.uSize, c.w, c.h)
            gl.uniform1f(U1.uShift, c.shift || 0)
            gl.uniform1f(U1.uZoom, c.zoom || 1)
            gl.uniform1f(U1.uOpacity, c.opacity)
            gl.uniform1f(U1.uDim, c.dim || 0)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }

        // pass 2: lens + spectral aberration onto the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, fbW, fbH)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.disable(gl.BLEND)
        gl.useProgram(postProg)
        gl.bindTexture(gl.TEXTURE_2D, sceneTex)
        gl.uniform1i(U2.uScene, 0)
        gl.uniform2f(U2.uRes, fbW, fbH)
        gl.uniform1f(U2.uCy, 1 - centerY / cssH)
        gl.uniform1f(U2.uStart, TICKER_LENS.start)
        gl.uniform1f(U2.uCurve, TICKER_LENS.curve)
        gl.uniform1f(U2.uKx, TICKER_LENS.kx * strength)
        gl.uniform1f(U2.uKy, TICKER_LENS.ky * strength)
        gl.uniform1f(U2.uAb, TICKER_LENS.aberration)
        gl.uniform1f(U2.uFalloff, TICKER_LENS.falloff * strength)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        trimTextures()

        if (!shown && drawn.length) {
            shown = true
            requestAnimationFrame(() => {
                canvas.style.opacity = "1"
            })
        }
        return drawn
    }

    const clear = () => {
        if (lost) return
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
    }

    const destroy = () => {
        canvas.removeEventListener("webglcontextlost", onContextLost)
        canvas.removeEventListener("webglcontextrestored", onContextRestored)
        if (!lost && gl) {
            textures.forEach((t) => t.tex && gl.deleteTexture(t.tex))
            gl.deleteTexture(sceneTex)
            gl.deleteFramebuffer(fbo)
            gl.deleteBuffer(quad)
            gl.deleteProgram(cardProg)
            gl.deleteProgram(postProg)
        }
        textures.clear()
        gl = null
    }

    return { resize, draw, clear, destroy }
}