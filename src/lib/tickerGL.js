// src/lib/tickerGL.js
//
// WebGL progressive-blur layer for the Home work ticker.
//
// The DOM ticker (createTicker engine, drag, click, captions, a11y, reveal,
// hover lift, zoom) stays exactly as it is. This module:
//   1. draws every on-screen card image into an offscreen scene texture, using
//      each card's live on-screen rect (so reveal / hover / zoom / parallax all
//      carry over),
//   2. runs an Apple-style progressive blur over the whole scene. The scene is
//      downsampled into a pyramid (5 levels, 13-tap filter, each half the size of
//      the last). The blur radius per pixel is zero in the middle of the screen and
//      ramps up along a smootherstep curve toward the left and right edges; the
//      shader picks a fractional pyramid level for that radius and blends the two
//      nearest levels, so the blur is large, smooth and noise free. Toward the
//      edge, content also fades into the page background with a touch of extra
//      saturation (the "scroll edge" look). Ticker speed opens the blur up,
//      stretches it sideways and favours the edge content is entering through.
//
// A slide's DOM image is only hidden (via data-gl-slide="ready") once its
// texture has been drawn, so anything that fails (no WebGL, tainted image,
// context loss) quietly falls back to the plain DOM ticker.
//
// No dependencies besides gsap (for the shared frame loop and getProperty).

import gsap from "gsap"

export const GLASS = {
    zonePx: 220, // width of each blurred edge in CSS px: the centre stays perfectly sharp
    blurPx: 30, // blur radius at the very edge, in CSS px
    curve: 1.0, // ramp exponent (higher = blur starts later and ramps harder)
    fade: 0.5, // how far content dissolves into the page background at the edge (0..1)
    sat: 0.12, // extra saturation at the edge
    motionBlur: 16, // extra horizontal stretch at the edge at full ticker speed, in CSS px
    asym: 0.25, // how much stronger the entering edge gets while flicking (0 = symmetric)
    rest: 1, // share of the blur present when the ticker is only drifting
    speedBoost: 0.4, // extra blur while the ticker is flicked
    fullSpeed: 2000, // px/s at which speedBoost is fully applied
    imgZoom: 1.12, // matches the DOM image's scale-[1.12]
    dim: 0.8, // matches the DOM bg-black/20 overlay
    maxUploadsPerFrame: 2,
    maxDpr: 2,
}

// Narrow screens (< MOBILE_MAX px wide): narrower band, lighter blur.
const MOBILE_MAX = 768
export const GLASS_MOBILE = {
    zonePx: 96,
    blurPx: 16,
    fade: 0.4,
    motionBlur: 8,
    rest: 0.85,
    speedBoost: 0.6,
}

const LEVELS = 5 // pyramid depth: level i is 2^i times smaller than the scene

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

// 13-tap downsample (Jimenez, "Next Generation Post Processing"): soft, alias free
const DOWN_FRAG = `${PRECISION}
uniform sampler2D u_src;
uniform vec2 u_texel; // one source texel in uv
varying vec2 v_uv;
vec4 T(vec2 o) { return texture2D(u_src, v_uv + o * u_texel); }
void main() {
  vec4 a = T(vec2(-2.0, -2.0)); vec4 b = T(vec2(0.0, -2.0)); vec4 c = T(vec2(2.0, -2.0));
  vec4 d = T(vec2(-2.0, 0.0));  vec4 e = T(vec2(0.0, 0.0));  vec4 f = T(vec2(2.0, 0.0));
  vec4 g = T(vec2(-2.0, 2.0));  vec4 h = T(vec2(0.0, 2.0));  vec4 i = T(vec2(2.0, 2.0));
  vec4 j = T(vec2(-1.0, -1.0)); vec4 k = T(vec2(1.0, -1.0));
  vec4 l = T(vec2(-1.0, 1.0));  vec4 m = T(vec2(1.0, 1.0));
  gl_FragColor = e * 0.125
    + (a + c + g + i) * 0.03125
    + (b + d + f + h) * 0.0625
    + (j + k + l + m) * 0.125;
}
`

const POST_FRAG = `${PRECISION}
uniform sampler2D u_l0; // the sharp scene
uniform sampler2D u_l1; // pyramid levels, each half the size of the previous
uniform sampler2D u_l2;
uniform sampler2D u_l3;
uniform sampler2D u_l4;
uniform sampler2D u_l5;
uniform vec2 u_inv;     // 1 / scene size in device px
uniform float u_zone;   // blur band width as a fraction of the screen width
uniform float u_blur;   // blur radius at the very edge (device px)
uniform float u_curve;  // ramp exponent
uniform float u_px;     // one CSS pixel as a fraction of the screen width
uniform float u_mb;     // extra horizontal stretch at the edge (CSS px)
uniform float u_sat;    // extra saturation at the edge
uniform float u_fade;   // dissolve into the background at the edge
uniform vec2 u_gain;    // per-edge strength: (left, right)
varying vec2 v_uv;

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

// reflect samples that would fall past the screen edge
vec2 fold(vec2 p) {
  p.x = abs(p.x);
  p.x = 1.0 - abs(1.0 - p.x);
  return p;
}

vec4 fetchL(int l, vec2 uv) {
  uv = fold(uv);
  if (l <= 1) {
    if (l == 0) return texture2D(u_l0, uv);
    return texture2D(u_l1, uv);
  }
  if (l == 2) return texture2D(u_l2, uv);
  if (l == 3) return texture2D(u_l3, uv);
  if (l == 4) return texture2D(u_l4, uv);
  return texture2D(u_l5, uv);
}

// one pyramid level, softened with four bilinear taps (so the texel grid of the
// small level never shows) and, while the ticker moves, three taps sideways
vec4 blurL(int l, vec2 uv, float mbUv) {
  if (l == 0) return texture2D(u_l0, uv);
  vec2 o = u_inv * exp2(float(l)) * 0.7;
  vec4 s = vec4(0.0);
  for (int k = -1; k <= 1; k++) {
    vec2 c = uv + vec2(float(k) * mbUv, 0.0);
    float w = (k == 0) ? 0.5 : 0.25;
    s += (fetchL(l, c + vec2(o.x, o.y)) + fetchL(l, c + vec2(-o.x, o.y))
        + fetchL(l, c + vec2(o.x, -o.y)) + fetchL(l, c + vec2(-o.x, -o.y))) * (0.25 * w);
  }
  return s;
}

void main() {
  vec2 uv = v_uv;

  float e = min(uv.x, 1.0 - uv.x);
  float x = clamp(e / u_zone, 0.0, 1.0);
  float g = uv.x < 0.5 ? u_gain.x : u_gain.y;

  // 0 in the flat interior, 1 at the screen edge; smootherstep so the blur
  // eases in with no visible start line
  float t = 1.0 - x;
  float p = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  p = pow(p, u_curve);

  float rd = u_blur * p * g;
  // blur radius -> fractional pyramid level (level 1 is about 2.5 px of blur)
  float f = rd < 2.5 ? rd / 2.5 : 1.0 + log2(rd / 2.5);
  f = clamp(f, 0.0, 5.0);

  if (f < 0.003) {
    gl_FragColor = texture2D(u_l0, uv);
    return;
  }

  float mbUv = u_mb * p * g * u_px * 0.6;
  int lo = int(floor(f));
  int hi = lo + 1;
  if (hi > 5) hi = 5;
  float tf = f - float(lo);
  vec4 col = blurL(lo, uv, mbUv);
  if (hi != lo) col = mix(col, blurL(hi, uv, mbUv), tf);

  // a touch more colour under the blur, like Apple's backdrop material
  float luma = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
  col.rgb = max(mix(vec3(luma), col.rgb, 1.0 + u_sat * p), vec3(0.0));

  // dissolve into the page background toward the edge (premultiplied)
  col *= 1.0 - u_fade * pow(p, 1.6) * min(g, 1.0);

  // dither: soft gradients in dark images would otherwise band in 8 bit
  col.rgb = clamp(col.rgb + (ign(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0) * col.a, 0.0, 1.0);

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
    let downProg
    let postProg
    try {
        cardProg = program(gl, CARD_VERT, CARD_FRAG, ["u_rect", "u_res", "u_tex", "u_uv", "u_alpha", "u_dim"])
        downProg = program(gl, POST_VERT, DOWN_FRAG, ["u_src", "u_texel"])
        postProg = program(gl, POST_VERT, POST_FRAG, [
            "u_l0", "u_l1", "u_l2", "u_l3", "u_l4", "u_l5",
            "u_inv",
            "u_zone",
            "u_blur",
            "u_curve",
            "u_px",
            "u_mb",
            "u_sat",
            "u_fade",
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

    // blur pyramid: levels[i] is the scene shrunk 2^i times (index 0 unused, the scene is level 0)
    const levels = []
    const freeLevels = () => {
        levels.forEach((l) => {
            if (!l) return
            gl.deleteTexture(l.tex)
            gl.deleteFramebuffer(l.fbo)
        })
        levels.length = 0
    }

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

        freeLevels()
        for (let i = 1; i <= LEVELS; i++) {
            const lw = Math.max(1, Math.ceil(nw / 2 ** i))
            const lh = Math.max(1, Math.ceil(nh / 2 ** i))
            const tex = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lw, lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            const lf = gl.createFramebuffer()
            gl.bindFramebuffer(gl.FRAMEBUFFER, lf)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
            levels[i] = { tex, fbo: lf, w: lw, h: lh }
        }
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

        const speedTarget = Math.min(1, Math.abs(st.vel || 0) / c.fullSpeed)
        const dt = Math.min(Math.max(deltaMs, 1), 64) / 1000
        const rate = speedTarget > boost ? 9 : 3 // opens quickly, settles slowly
        boost += (speedTarget - boost) * (1 - Math.exp(-rate * dt))
        const dirTarget = Math.max(-1, Math.min(1, (st.vel || 0) / c.fullSpeed))
        dirSm += (dirTarget - dirSm) * (1 - Math.exp(-6 * dt))

        // blur pyramid, only over the edge bands (the middle of the screen stays sharp)
        const dpr = pxW / cssW
        const band = Math.ceil(c.zonePx * dpr + 128)
        gl.disable(gl.BLEND)
        gl.useProgram(downProg.p)
        gl.uniform1i(downProg.loc.u_src, 0)
        gl.activeTexture(gl.TEXTURE0)
        gl.enable(gl.SCISSOR_TEST)
        let srcTex = sceneTex
        let sw = pxW
        let sh = pxH
        for (let i = 1; i <= LEVELS; i++) {
            const L = levels[i]
            gl.bindFramebuffer(gl.FRAMEBUFFER, L.fbo)
            gl.viewport(0, 0, L.w, L.h)
            gl.bindTexture(gl.TEXTURE_2D, srcTex)
            gl.uniform2f(downProg.loc.u_texel, 1 / sw, 1 / sh)
            const b = Math.min(L.w, Math.ceil(band / 2 ** i) + 2)
            if (2 * b >= L.w) {
                gl.scissor(0, 0, L.w, L.h)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            } else {
                gl.scissor(0, 0, b, L.h)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
                gl.scissor(L.w - b, 0, b, L.h)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            }
            srcTex = L.tex
            sw = L.w
            sh = L.h
        }
        gl.disable(gl.SCISSOR_TEST)

        // composite pass: progressive blur from the pyramid
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, pxW, pxH)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(postProg.p)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, sceneTex)
        for (let i = 1; i <= LEVELS; i++) {
            gl.activeTexture(gl.TEXTURE0 + i)
            gl.bindTexture(gl.TEXTURE_2D, levels[i].tex)
        }
        for (let i = 0; i <= LEVELS; i++) gl.uniform1i(postProg.loc["u_l" + i], i)
        const amt = c.rest + c.speedBoost * boost // how much blur is showing now
        gl.uniform2f(postProg.loc.u_inv, 1 / pxW, 1 / pxH)
        gl.uniform1f(postProg.loc.u_zone, Math.min(0.5, c.zonePx / cssW))
        gl.uniform1f(postProg.loc.u_blur, c.blurPx * amt * dpr)
        gl.uniform1f(postProg.loc.u_curve, c.curve)
        gl.uniform1f(postProg.loc.u_px, 1 / cssW)
        gl.uniform1f(postProg.loc.u_mb, reduceMotion ? 0 : c.motionBlur * boost)
        gl.uniform1f(postProg.loc.u_sat, c.sat)
        gl.uniform1f(postProg.loc.u_fade, c.fade)
        const side = reduceMotion ? 0 : c.asym * dirSm
        gl.uniform2f(postProg.loc.u_gain, 1 + side, 1 - side)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        gl.activeTexture(gl.TEXTURE0)

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
            freeLevels()
            gl.deleteTexture(sceneTex)
            gl.deleteFramebuffer(fbo)
            gl.deleteBuffer(quad)
            gl.deleteProgram(cardProg.p)
            gl.deleteProgram(downProg.p)
            gl.deleteProgram(postProg.p)
            gl.getExtension("WEBGL_lose_context")?.loseContext()
            canvas.remove()
            gl = null
        },
    }
}