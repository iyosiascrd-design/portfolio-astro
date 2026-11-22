// src/lib/tickerGL.js
//
// WebGL "glass edge" layer for the Home work ticker.
//
// The DOM ticker (createTicker engine, drag, click, captions, a11y, reveal,
// hover lift, zoom) stays exactly as it is. This module:
//   1. draws every on-screen card image into an offscreen scene texture, using
//      each card's live on-screen rect (so reveal / hover / zoom / parallax all
//      carry over),
//   2. runs a lens pass over the whole scene so the left and right screen
//      edges behave like a thick curved glass bezel: content is refracted
//      toward the edge along a squircle profile, lightly frosted, given a
//      touch of vibrancy and a directional specular rim. The lens reacts to
//      the ticker's motion: it opens up, smears horizontally and favours the
//      edge that content is entering through.
//
// A slide's DOM image is only hidden (via data-gl-slide="ready") once its
// texture has been drawn, so anything that fails (no WebGL, tainted image,
// context loss) quietly falls back to the plain DOM ticker.
//
// No dependencies besides gsap (for the shared frame loop and getProperty).

import gsap from "gsap"

export const GLASS = {
    zonePx: 110, // width of each glass edge in CSS px: nothing happens inside it
    strengthPx: 52, // how far the very edge pulls from inside it (px)
    chroma: 0.04, // colour fringe: a whisper, only visible on hard edges
    frost: 3, // resting frost at the rim, in CSS px (0 = clear glass)
    vBend: 0.06, // almost no vertical curve, card tops and bottoms stay straight
    rim: 0.5, // specular line at the very edge (lit from the upper left)
    tint: 0, // no edge darkening
    sat: 0.22, // extra saturation under the glass (liquid-glass vibrancy)
    lift: 0.05, // slight brightening under the glass
    motionBlur: 12, // horizontal smear at the rim at full speed, in CSS px
    asym: 0.25, // how much stronger the entering edge gets while flicking (0 = symmetric)
    rest: 1, // share of the effect present when the ticker is only drifting
    speedBoost: 0.5, // extra opening of the lens while the ticker is flicked
    curve: 2.5, // edge falloff exponent (higher = fades in later)
    fullSpeed: 2000, // px/s at which speedBoost is fully applied
    imgZoom: 1.12, // matches the DOM image's scale-[1.12]
    dim: 0.8, // matches the DOM bg-black/20 overlay
    maxUploadsPerFrame: 2,
    maxDpr: 2,
}

// Narrow screens (< MOBILE_MAX px wide): even slimmer and quieter at rest,
// opening up a little when you flick.
const MOBILE_MAX = 768
export const GLASS_MOBILE = {
    zonePx: 56,
    strengthPx: 28,
    chroma: 0.03,
    frost: 2,
    rim: 0.35,
    sat: 0.15,
    motionBlur: 6,
    rest: 0.6,
    speedBoost: 1.0,
    curve: 3,
}

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`

const CARD_VERT = `
attribute vec2 a_pos;
uniform vec4 u_rect;
uniform vec2 u_res;
varying vec2 v_local;
void main() {
  vec2 px = u_rect.xy + a_pos * u_rect.zw;
  gl_Position = vec4(px.x / u_res.x * 2.0 - 1.0, 1.0 - px.y / u_res.y * 2.0, 0.0, 1.0);
  v_local = a_pos;
}
`

const CARD_FRAG = `${PRECISION}
uniform sampler2D u_tex;
uniform vec4 u_uv;
uniform float u_alpha;
uniform float u_dim;
varying vec2 v_local;
void main() {
  vec2 uv = (v_local - 0.5) * u_uv.xy + 0.5 + u_uv.zw;
  vec3 c = texture2D(u_tex, uv).rgb * u_dim;
  gl_FragColor = vec4(c * u_alpha, u_alpha);
}
`

const POST_VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos;
  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);
}
`

const POST_FRAG = `${PRECISION}
uniform sampler2D u_scene;
uniform float u_zone;   // glass width as a fraction of the screen width
uniform float u_k;      // refraction reach at the rim (fraction of the screen width)
uniform float u_ca;     // dispersion
uniform float u_vb;     // vertical magnification at the rim
uniform float u_rim;
uniform float u_tint;
uniform float u_curve;
uniform float u_px;     // one CSS pixel as a fraction of the screen width
uniform float u_py;     // one CSS pixel as a fraction of the screen height
uniform float u_frost;  // resting frost radius at the rim (CSS px)
uniform float u_mb;     // extra horizontal smear at the rim, from ticker speed (CSS px)
uniform float u_sat;    // extra saturation under the glass
uniform float u_lift;   // extra brightness under the glass
uniform vec2 u_gain;    // per-edge strength: (left, right)
varying vec2 v_uv;

void main() {
  vec2 uv = v_uv;

  // 0 at the screen edge, 1 where the glass ends. Inside that, the pane is flat
  // and the page is untouched.
  float e = min(uv.x, 1.0 - uv.x);
  float x = clamp(e / u_zone, 0.0, 1.0);
  float isLeft = uv.x < 0.5 ? 1.0 : 0.0;
  float dir = isLeft > 0.5 ? 1.0 : -1.0;
  float g = isLeft > 0.5 ? u_gain.x : u_gain.y;

  // Bezel profile: a squircle (the continuous-corner curve Apple uses for its
  // shapes) rather than a circle. Its slope starts out cubic, so the glass eases
  // in with no visible start line, and it steepens sharply only at the rim.
  // Refraction follows the surface slope, so the bend hugs the edge.
  float q = 1.0 - x;
  float q2 = q * q;
  float d0 = max(1.0 - q2 * q2, 0.15);
  float slope = q2 * q / pow(d0, 0.75);
  float bend = pow(clamp(slope / 4.0, 0.0, 1.0), u_curve / 3.0);

  float off = dir * u_k * bend * g;
  float yv = 0.5 + (uv.y - 0.5) * (1.0 - u_vb * bend);

  // dispersion: each channel refracts slightly differently
  vec2 pr = vec2(uv.x + off * (1.0 + u_ca), yv);
  vec2 pg = vec2(uv.x + off, yv);
  vec2 pb = vec2(uv.x + off * (1.0 - u_ca), yv);

  vec4 sr;
  vec4 sg;
  vec4 sb;
  // frost + motion smear: both grow with the bezel's steepness, so the rim is
  // satin at rest and streaks sideways when the ticker moves, while the flat
  // interior stays perfectly sharp (and takes the cheap path)
  float fr = u_frost * bend;
  float mb = u_mb * bend * g;
  if (fr + mb > 0.05) {
    vec2 rad = vec2((fr + mb) * u_px, fr * u_py);
    vec4 ar = vec4(0.0);
    vec4 ag = vec4(0.0);
    vec4 ab = vec4(0.0);
    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      float a = fi * 2.39996323;
      float r = sqrt((fi + 0.5) / 10.0);
      vec2 d = vec2(cos(a), sin(a)) * r * rad;
      ar += texture2D(u_scene, pr + d);
      ag += texture2D(u_scene, pg + d);
      ab += texture2D(u_scene, pb + d);
    }
    sr = ar / 10.0;
    sg = ag / 10.0;
    sb = ab / 10.0;
  } else {
    sr = texture2D(u_scene, pr);
    sg = texture2D(u_scene, pg);
    sb = texture2D(u_scene, pb);
  }
  vec4 col = vec4(sr.r, sg.g, sb.b, (sr.a + sg.a + sb.a) / 3.0);

  // vibrancy: glass makes what is behind it a little richer and brighter
  float luma = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
  col.rgb = max(mix(vec3(luma), col.rgb, 1.0 + u_sat * bend), vec3(0.0));
  col.rgb *= 1.0 + u_lift * bend;
  col.rgb *= 1.0 - u_tint * bend;

  // light catching the bezel. The light sits to the upper left: the left rim
  // glints near the top, the right rim near the bottom, so the two edges are not
  // mirror images (that asymmetry is what makes it read as a real object).
  float line = 1.0 - smoothstep(0.0, 2.0 * u_px, e);
  float lightY = isLeft > 0.5 ? uv.y : 1.0 - uv.y;
  float sheen = 0.3 + 0.7 * smoothstep(0.0, 1.0, lightY);
  float spec = (line * 0.9 + bend * bend * 0.45) * u_rim * sheen * g;
  col.rgb += vec3(spec) * col.a;

  gl_FragColor = col;
}
`

function compile(gl, type, src) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error(`tickerGL shader: ${log}`)
    }
    return sh
}

function program(gl, vs, fs, uniforms) {
    const p = gl.createProgram()
    const v = compile(gl, gl.VERTEX_SHADER, vs)
    const f = compile(gl, gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.bindAttribLocation(p, 0, "a_pos")
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(p)
        gl.deleteProgram(p)
        throw new Error(`tickerGL program: ${log}`)
    }
    const loc = {}
    uniforms.forEach((name) => {
        loc[name] = gl.getUniformLocation(p, name)
    })
    return { p, loc }
}

/**
 * @param {object} o
 * @param {HTMLElement} o.wrap    ticker wrapper (canvas is inserted as its first child)
 * @param {HTMLElement} o.track   flex track whose children are the slides
 * @param {object} o.engine       createTicker() engine, needs getState()
 * @param {object} [o.config]     overrides for GLASS
 * @returns {{ destroy: () => void } | null}  null when WebGL is unavailable
 */
export function createTickerGL({ wrap, track, engine, config }) {
    if (typeof window === "undefined" || !wrap || !track || !engine) return null
    const cfg = { ...GLASS, ...config }
    // the motion-driven parts (smear, entering-edge bias) are off for reduced motion
    const reduceMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const cfgMobile = { ...GLASS, ...GLASS_MOBILE, ...config }

    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    canvas.setAttribute("data-ticker-gl", "")
    Object.assign(canvas.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    })

    const attrs = {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
    }
    let gl = canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)
    if (!gl) return null
    const isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext

    let cardProg
    let postProg
    try {
        cardProg = program(gl, CARD_VERT, CARD_FRAG, ["u_rect", "u_res", "u_tex", "u_uv", "u_alpha", "u_dim"])
        postProg = program(gl, POST_VERT, POST_FRAG, [
            "u_scene",
            "u_zone",
            "u_k",
            "u_ca",
            "u_vb",
            "u_rim",
            "u_tint",
            "u_curve",
            "u_px",
            "u_py",
            "u_frost",
            "u_mb",
            "u_sat",
            "u_lift",
            "u_gain",
        ])
    } catch (err) {
        console.warn(err)
        return null
    }

    // unit quad (two triangles), shared by both passes
    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    // offscreen scene
    const sceneTex = gl.createTexture()
    const fbo = gl.createFramebuffer()
    gl.bindTexture(gl.TEXTURE_2D, sceneTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    let cssW = 0
    let cssH = 0
    let pxW = 0
    let pxH = 0
    let dead = false
    let ready = false

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr)
        const w = wrap.clientWidth
        const h = wrap.clientHeight
        if (!w || !h) return
        const nw = Math.round(w * dpr)
        const nh = Math.round(h * dpr)
        if (nw === pxW && nh === pxH) return
        cssW = w
        cssH = h
        pxW = nw
        pxH = nh
        canvas.width = nw
        canvas.height = nh
        gl.bindTexture(gl.TEXTURE_2D, sceneTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nw, nh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    // ---- textures ---------------------------------------------------------
    const textures = new Map() // src -> { tex, aspect }
    const failed = new Set()
    let uploads = 0

    const getTexture = (img) => {
        if (!img || !img.complete || !img.naturalWidth) return null
        const key = img.currentSrc || img.src
        const hit = textures.get(key)
        if (hit) return hit
        if (failed.has(key) || uploads >= cfg.maxUploadsPerFrame) return null
        uploads += 1
        try {
            const tex = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            if (isGL2) {
                gl.generateMipmap(gl.TEXTURE_2D)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            }
            if (gl.getError() !== gl.NO_ERROR) throw new Error("texture upload failed")
            const entry = { tex, aspect: img.naturalWidth / img.naturalHeight }
            textures.set(key, entry)
            return entry
        } catch (err) {
            failed.add(key) // tainted / too large: this slide stays on the DOM image
            return null
        }
    }

    // ---- per-slide cache --------------------------------------------------
    const cache = new WeakMap()
    const infoFor = (slide) => {
        let info = cache.get(slide)
        if (info) return info
        const card = slide.querySelector("[data-zoom-card]")
        info = {
            card,
            img: card?.querySelector("img") || null,
            par: card?.querySelector("[data-parallax]") || null,
            padR: parseFloat(getComputedStyle(slide).paddingRight) || 0,
            alpha: 0,
            opaque: false,
            ready: false,
        }
        cache.set(slide, info)
        return info
    }

    let boost = 0
    let dirSm = 0 // smoothed signed velocity, -1..1

    const render = (_time, deltaMs = 16.7) => {
        if (dead) return
        const st = engine.getState()
        if (!st || !st.visible || !st.vpW || !st.lefts?.length) return
        if (!cssW || !cssH) {
            resize()
            if (!cssW) return
        }

        const c = cssW < MOBILE_MAX ? cfgMobile : cfg
        uploads = 0
        const cr = canvas.getBoundingClientRect()
        if (cr.width < 2 || cr.height < 2) return

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.viewport(0, 0, pxW, pxH)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

        gl.useProgram(cardProg.p)
        gl.uniform2f(cardProg.loc.u_res, cssW, cssH)
        gl.uniform1i(cardProg.loc.u_tex, 0)
        gl.uniform1f(cardProg.loc.u_dim, c.dim)
        gl.activeTexture(gl.TEXTURE0)

        const n = st.lefts.length
        const slides = track.children
        let drawn = 0

        for (let i = 0; i < n; i++) {
            const left = st.lefts[i] + st.x
            const w = st.widths[i]
            if (left + w < -24 || left > st.vpW + 24) continue

            const slide = slides[i]
            if (!slide) continue
            const info = infoFor(slide)
            if (!info.card || !info.img) continue

            const rect = info.card.getBoundingClientRect()
            if (rect.width < 1 || rect.height < 1) continue

            // follow the DOM reveal (opacity animation) until the card is fully shown
            if (!info.opaque) {
                const o = parseFloat(getComputedStyle(info.card).opacity)
                info.alpha = Number.isFinite(o) ? o : 1
                if (info.alpha >= 0.999) info.opaque = true
            }
            const alpha = info.opaque ? 1 : info.alpha

            const t = getTexture(info.img)
            if (!t) continue

            // object-cover + the DOM image's scale-[1.12] + parallax shift
            const ra = rect.width / rect.height
            let sx = 1
            let sy = 1
            if (ra > t.aspect) sy = t.aspect / ra
            else sx = ra / t.aspect
            sx /= c.imgZoom
            sy /= c.imgZoom
            const localW = Math.max(1, w - info.padR)
            const px = info.par ? Number(gsap.getProperty(info.par, "x")) || 0 : 0
            const offU = -(px / localW) * sx

            gl.bindTexture(gl.TEXTURE_2D, t.tex)
            gl.uniform4f(cardProg.loc.u_rect, rect.left - cr.left, rect.top - cr.top, rect.width, rect.height)
            gl.uniform4f(cardProg.loc.u_uv, sx, sy, offU, 0)
            gl.uniform1f(cardProg.loc.u_alpha, alpha)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            drawn += 1

            if (!info.ready) {
                info.ready = true
                slide.setAttribute("data-gl-slide", "ready")
            }
        }

        // lens pass
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, pxW, pxH)
        gl.disable(gl.BLEND)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        const speedTarget = Math.min(1, Math.abs(st.vel || 0) / c.fullSpeed)
        const dt = Math.min(Math.max(deltaMs, 1), 64) / 1000
        const rate = speedTarget > boost ? 9 : 3 // opens quickly, settles slowly
        boost += (speedTarget - boost) * (1 - Math.exp(-rate * dt))
        const dirTarget = Math.max(-1, Math.min(1, (st.vel || 0) / c.fullSpeed))
        dirSm += (dirTarget - dirSm) * (1 - Math.exp(-6 * dt))

        gl.useProgram(postProg.p)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, sceneTex)
        gl.uniform1i(postProg.loc.u_scene, 0)
        const amt = c.rest + c.speedBoost * boost // 0..~2: how much glass is showing now
        const shown = Math.min(1, amt)
        gl.uniform1f(postProg.loc.u_zone, Math.min(0.5, c.zonePx / cssW))
        gl.uniform1f(postProg.loc.u_k, (c.strengthPx / cssW) * amt)
        gl.uniform1f(postProg.loc.u_ca, c.chroma)
        gl.uniform1f(postProg.loc.u_vb, c.vBend * shown)
        gl.uniform1f(postProg.loc.u_rim, c.rim * shown)
        gl.uniform1f(postProg.loc.u_tint, c.tint * shown)
        gl.uniform1f(postProg.loc.u_curve, c.curve)
        gl.uniform1f(postProg.loc.u_px, 1 / cssW)
        gl.uniform1f(postProg.loc.u_py, 1 / cssH)
        gl.uniform1f(postProg.loc.u_frost, c.frost * shown)
        gl.uniform1f(postProg.loc.u_mb, reduceMotion ? 0 : c.motionBlur * boost)
        gl.uniform1f(postProg.loc.u_sat, c.sat * shown)
        gl.uniform1f(postProg.loc.u_lift, c.lift * shown)
        const side = reduceMotion ? 0 : c.asym * dirSm
        gl.uniform2f(postProg.loc.u_gain, 1 + side, 1 - side)
        gl.drawArrays(gl.TRIANGLES, 0, 6)

        if (!ready && drawn) {
            ready = true
            wrap.setAttribute("data-gl", "true")
        }
    }

    // ---- lifecycle --------------------------------------------------------
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const hardFallback = () => {
        dead = true
        gsap.ticker.remove(render)
        wrap.removeAttribute("data-gl")
        Array.from(track.children).forEach((s) => s.removeAttribute("data-gl-slide"))
        canvas.remove()
    }
    const onLost = (e) => {
        e.preventDefault()
        hardFallback()
    }
    canvas.addEventListener("webglcontextlost", onLost)

    wrap.insertBefore(canvas, wrap.firstChild)
    resize()
    // after the ticker's own onTick (registered earlier) so rects are current
    gsap.ticker.add(render)

    return {
        destroy() {
            if (dead && !canvas.isConnected) return
            dead = true
            gsap.ticker.remove(render)
            ro.disconnect()
            canvas.removeEventListener("webglcontextlost", onLost)
            wrap.removeAttribute("data-gl")
            Array.from(track.children).forEach((s) => s.removeAttribute("data-gl-slide"))
            textures.forEach(({ tex }) => gl.deleteTexture(tex))
            textures.clear()
            gl.deleteTexture(sceneTex)
            gl.deleteFramebuffer(fbo)
            gl.deleteBuffer(quad)
            gl.deleteProgram(cardProg.p)
            gl.deleteProgram(postProg.p)
            gl.getExtension("WEBGL_lose_context")?.loseContext()
            canvas.remove()
            gl = null
        },
    }
}