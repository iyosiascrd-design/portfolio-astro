// src/layouts/SiteLayout.jsx

import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { motion, useMotionValue, useTransform, useSpring, useReducedMotion, cubicBezier } from "framer-motion"
import Lenis from "lenis"
import { ArrowUp } from "lucide-react"

import Header from "../components/Header"
import Logo from "../components/Logo"
import RollingLink from "../components/RollingLink"
import FitText from "../components/FitText"
import { PageTransitionProvider, TransitionMain, usePageTransition } from "../components/PageTransitionOverlay"
import Preloader from "../components/Preloader"

import { useViewport, ViewportContext } from "../lib/viewport"
import { RESPONSIVE_CSS } from "../lib/responsiveCss"

// --- ERROR BOUNDARY TO PREVENT WHITE SCREENS ---
class LayoutErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Layout Crash Caught:", error, errorInfo);
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', backgroundColor: 'white', color: 'red', fontFamily: 'monospace', zIndex: 9999, position: 'relative', minHeight: '100vh' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>SiteLayout Crashed!</h2>
                    <p style={{ fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
                    <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap', background: '#ffe6e6', padding: '16px' }}>
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const LIQUID_GRADIENT_CONFIG = {
    scale: 0.6, speed: 0.006, contrast: 1.9, mouseInfluence: 0.8, textureScale: 0.5,
    blackHeight: 0.30, blackSoftness: 0.18, blackWave: 0.07, blackWaveFreq: 1.2,
    blackSpeed: 0.08, blackBreathe: 0.03,
}

const RECT_FLUTED_CONFIG = {
    fluteCount: 30.0, refractionOffset: 0.02, bevelWidth: 0.1, bevelShadow: 0.02,
    specularBevel: 0.002, chromaticDispersion: 0.004, roughness: 0.005, verticalSmear: 4,
}

const FOOTER_THEMES = {
    default: {
        palette: [[0.02, 0.02, 0.02], [0.14, 0.14, 0.14], [0.45, 0.45, 0.45], [0.75, 0.75, 0.75]],
        scrimRgb: "0,0,0",
        bg: "#050505",
    },
}

const FULLSCREEN_VS = `#version 300 es\nin vec2 aPosition;\nout vec2 vUv;\nvoid main() {\n    vUv = (aPosition + 1.0) * 0.5;\n    gl_Position = vec4(aPosition, 0.0, 1.0);\n}`

const LIQUID_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse; uniform float uScale; uniform float uSpeed; uniform float uContrast; uniform float uMouseInfluence; uniform float uBlackHeight; uniform float uBlackSoftness; uniform float uBlackWave; uniform float uBlackWaveFreq; uniform float uBlackSpeed; uniform float uBlackBreathe; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix( mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x), mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y ); }
float fbm(vec2 p) { float v = 0.0; float a = 0.5; mat2 rot = mat2(0.8, -0.6, 0.6, 0.8); for (int i = 0; i < 4; i++) { v += a * noise(p); p = rot * p * 2.0; a *= 0.5; } return v; }
void main() { float aspect = uResolution.x / uResolution.y; vec2 p = vUv; p.x *= aspect; vec2 pBase = p; p *= uScale; float t = uTime * uSpeed * 10.0; vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0) * uMouseInfluence; vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.8, 0.0))); vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.5)); float f = fbm(p + 3.0 * r + m); float v = clamp(f * 1.4 + 0.5, 0.0, 1.0); v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0); v = smoothstep(0.0, 1.0, v); float bt = uTime * uBlackSpeed; float bw1 = fbm(vec2(pBase.x * uBlackWaveFreq + bt, bt * 0.5)); float bw2 = fbm(vec2(pBase.x * uBlackWaveFreq * 2.1 - bt * 1.3, 5.3 + bt * 0.3)); float edge = uBlackHeight + bw1 * uBlackWave + bw2 * uBlackWave * 0.4 + uBlackBreathe * sin(uTime * 0.25); float mask = smoothstep(edge - uBlackSoftness, edge + uBlackSoftness, vUv.y); v *= mask; vec3 col = mix(uC0, uC1, smoothstep(0.00, 0.35, v)); col = mix(col, uC2, smoothstep(0.30, 0.70, v)); col = mix(col, uC3, smoothstep(0.65, 1.00, v)); fragColor = vec4(col, 1.0); }`

const RECT_FLUTED_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture; uniform vec2 uMouse; uniform float uTime; uniform vec2 uResolution; uniform float uFluteCount; uniform float uRefractionOffset; uniform float uBevelWidth; uniform float uBevelShadow; uniform float uSpecularBevel; uniform float uChromaticDispersion; uniform float uRoughness; uniform float uVerticalSmear;
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() { vec2 uv = vUv; float flutes = uFluteCount; float slatIndex = floor(vUv.x * flutes); float localX = fract(vUv.x * flutes); vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0); vec2 distVec = (vUv - uMouse) * aspect; float dist = length(distVec); float mouseWave = smoothstep(0.45, 0.0, dist); float stepSign = mod(slatIndex, 2.0) == 0.0 ? 1.0 : -1.0; float slatDisplacement = stepSign * (uRefractionOffset + mouseWave * 0.02); float b = uBevelWidth; float bevelLeft = smoothstep(0.0, b, localX); float bevelRight = smoothstep(1.0, 1.0 - b, localX); float bevelMask = bevelLeft * bevelRight; float edgeFacet = 0.0; if (localX < b) { edgeFacet = (localX / b - 1.0); } else if (localX > (1.0 - b)) { edgeFacet = (localX - (1.0 - b)) / b; } float totalDisplacement = slatDisplacement + edgeFacet * uRefractionOffset * 2.2; vec2 baseUv = vec2(uv.x + totalDisplacement, uv.y); float edgeIntensity = abs(edgeFacet); float ca = uChromaticDispersion * (edgeIntensity * 2.0 + mouseWave * 0.35); float totalBlur = uRoughness * (1.0 + edgeIntensity * 1.5 + mouseWave * 0.4); const int SAMPLES = 12; vec3 accumColor = vec3(0.0); float totalWeight = 0.0; float seed = hash21(gl_FragCoord.xy); float goldenAngle = 2.39996323; for (int k = 0; k < SAMPLES; k++) { float r = sqrt(float(k) + 0.5) / sqrt(float(SAMPLES)); float theta = float(k) * goldenAngle + seed * 6.2831853; vec2 offset = vec2(cos(theta), sin(theta) * uVerticalSmear) * (r * totalBlur); vec2 sampleUv = baseUv + offset; float rCol = texture(uTexture, sampleUv - vec2(ca, 0.0)).r; float gCol = texture(uTexture, sampleUv).g; float bCol = texture(uTexture, sampleUv + vec2(ca, 0.0)).b; float weight = exp(-2.0 * r * r); accumColor += vec3(rCol, gCol, bCol) * weight; totalWeight += weight; } vec3 color = accumColor / totalWeight; float edgeGroove = 1.0 - (1.0 - bevelMask) * uBevelShadow; float lightDelta = (vUv.x - uMouse.x) * 1.5; float gleamIntensity = pow(edgeIntensity, 6.0) * max(0.0, 1.0 - abs(edgeFacet - lightDelta)) * uSpecularBevel * (0.4 + mouseWave * 0.6); vec3 gleam = vec3(1.0) * gleamIntensity; float ambient = sin(vUv.y * 2.5 - uTime * 0.6 + slatIndex * 0.5) * 0.5 + 0.5; vec3 ambientWash = vec3(1.0) * pow(ambient, 8.0) * 0.08 * bevelMask; vec3 finalColor = (color * edgeGroove) + gleam + ambientWash; finalColor += (hash21(gl_FragCoord.xy + uTime) - 0.5) * (1.5 / 255.0); fragColor = vec4(finalColor, 1.0); }`

function FooterBlackGradient({ rgb = "0,0,0" }) {
    const c = { baseOpacity: 0.92, blobOpacity: 0.55, breatheDuration: 9, driftDuration: 14 }
    return (
        <div aria-hidden="true" className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
            <motion.div
                className="absolute inset-0"
                style={{
                    transformOrigin: "50% 100%",
                    background: `linear-gradient(to top, rgba(${rgb},${c.baseOpacity}) 0%, rgba(${rgb},${c.baseOpacity * 0.75}) 30%, rgba(${rgb},${c.baseOpacity * 0.35}) 60%, rgba(${rgb},0) 100%)`,
                }}
                animate={{ scaleY: [1, 1.18, 1], opacity: [0.9, 1, 0.9] }}
                transition={{ duration: c.breatheDuration, ease: "easeInOut", repeat: Infinity }}
            />
            <motion.div
                className="absolute top-0 bottom-0 -left-[10%] w-[120%]"
                style={{
                    background: `radial-gradient(ellipse 45% 55% at 25% 85%, rgba(${rgb},${c.blobOpacity}) 0%, rgba(${rgb},0) 70%), radial-gradient(ellipse 40% 50% at 75% 70%, rgba(${rgb},${c.blobOpacity}) 0%, rgba(${rgb},0) 70%)`,
                }}
                animate={{ x: ["-5%", "5%", "-5%"] }}
                transition={{ duration: c.driftDuration, ease: "easeInOut", repeat: Infinity }}
            />
        </div>
    )
}

function RectangularFlutedGlassFooter({ className = "", palette }) {
    const paletteRef = useRef(palette)
    paletteRef.current = palette
    const canvasRef = useRef(null)
    const containerRef = useRef(null)
    const animIdRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        let gl;
        try {
            gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" })
        } catch(e) {
            console.warn("WebGL init failed", e)
            return
        }
        if (!gl) return

        const compile = (type, src) => {
            const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
            return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (gl.deleteShader(s), null)
        }

        const makeProgram = (fsSrc) => {
            const vs = compile(gl.VERTEX_SHADER, FULLSCREEN_VS)
            const fs = compile(gl.FRAGMENT_SHADER, fsSrc)
            if (!vs || !fs) return null
            const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs);
            gl.bindAttribLocation(program, 0, "aPosition"); gl.linkProgram(program);
            return gl.getProgramParameter(program, gl.LINK_STATUS) ? { program, vs, fs } : (gl.deleteProgram(program), null)
        }

        const liquid = makeProgram(LIQUID_FS)
        const glass = makeProgram(RECT_FLUTED_FS)
        if (!liquid || !glass) return

        const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
        const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        const getLocs = (prog) => {
            const res = {}; const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(prog, i); res[info.name] = gl.getUniformLocation(prog, info.name); }
            return res;
        }

        const L = getLocs(liquid.program)
        const G = getLocs(glass.program)
        const gradTexture = gl.createTexture()
        const fbo = gl.createFramebuffer()
        let gradW = 2, gradH = 2, fluteCount = RECT_FLUTED_CONFIG.fluteCount

        const allocGradientTarget = (w, h) => {
            gradW = Math.max(2, Math.round(w)); gradH = Math.max(2, Math.round(h));
            gl.bindTexture(gl.TEXTURE_2D, gradTexture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gradW, gradH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gradTexture, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        const resize = () => {
            if (!container || !canvas) return
            const w = container.clientWidth; const h = container.clientHeight;
            if (!w || !h) return; // Wait for non-zero dimensions
            const maxDpr = w < 768 ? 1.5 : 2; const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            fluteCount = Math.max(10, Math.min(RECT_FLUTED_CONFIG.fluteCount, Math.round(w / 43)));
            allocGradientTarget(canvas.width * LIQUID_GRADIENT_CONFIG.textureScale, canvas.height * LIQUID_GRADIENT_CONFIG.textureScale)
        }
        resize(); window.addEventListener("resize", resize);

        const resizeObserver = new ResizeObserver(() => { resize(); });
        resizeObserver.observe(container);

        const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 }

        const onPointerMove = (e) => {
            if (!container) return
            const rect = container.getBoundingClientRect()
            if (!rect.width || !rect.height) return
            pointer.targetX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            pointer.targetY = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height))
        }
        window.addEventListener("pointermove", onPointerMove)

        let footerActive = false; let footerObserver = null;
        const spacer = document.getElementById("get-in-touch")
        if (spacer && "IntersectionObserver" in window) {
            footerObserver = new IntersectionObserver(([entry]) => { footerActive = entry.isIntersecting }, { rootMargin: "0px 0px 20% 0px" })
            footerObserver.observe(spacer)
        } else { footerActive = true }

        const startTime = performance.now()
        const render = (now) => {
            animIdRef.current = requestAnimationFrame(render)
            if (!footerActive) return
            const elapsed = (now - startTime) * 0.001; const c = LIQUID_GRADIENT_CONFIG;
            pointer.x += (pointer.targetX - pointer.x) * 0.09; pointer.y += (pointer.targetY - pointer.y) * 0.09;

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, gradW, gradH); gl.useProgram(liquid.program);
            gl.uniform1f(L.uTime, elapsed); gl.uniform2f(L.uResolution, gradW, gradH); gl.uniform2f(L.uMouse, pointer.x, pointer.y);
            gl.uniform1f(L.uScale, c.scale); gl.uniform1f(L.uSpeed, c.speed); gl.uniform1f(L.uContrast, c.contrast);
            gl.uniform1f(L.uMouseInfluence, c.mouseInfluence); gl.uniform1f(L.uBlackHeight, c.blackHeight); gl.uniform1f(L.uBlackSoftness, c.blackSoftness);
            gl.uniform1f(L.uBlackWave, c.blackWave); gl.uniform1f(L.uBlackWaveFreq, c.blackWaveFreq); gl.uniform1f(L.uBlackSpeed, c.blackSpeed); gl.uniform1f(L.uBlackBreathe, c.blackBreathe);
            const pal = paletteRef.current; gl.uniform3fv(L.uC0, pal[0]); gl.uniform3fv(L.uC1, pal[1]); gl.uniform3fv(L.uC2, pal[2]); gl.uniform3fv(L.uC3, pal[3]);
            gl.drawArrays(gl.TRIANGLES, 0, 6); gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(glass.program);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gradTexture); gl.uniform1i(G.uTexture, 0);
            gl.uniform2f(G.uResolution, canvas.width, canvas.height); gl.uniform2f(G.uMouse, pointer.x, pointer.y); gl.uniform1f(G.uTime, elapsed);
            gl.uniform1f(G.uFluteCount, fluteCount); gl.uniform1f(G.uRefractionOffset, RECT_FLUTED_CONFIG.refractionOffset); gl.uniform1f(G.uBevelWidth, RECT_FLUTED_CONFIG.bevelWidth);
            gl.uniform1f(G.uBevelShadow, RECT_FLUTED_CONFIG.bevelShadow); gl.uniform1f(G.uSpecularBevel, RECT_FLUTED_CONFIG.specularBevel);
            gl.uniform1f(G.uChromaticDispersion, RECT_FLUTED_CONFIG.chromaticDispersion); gl.uniform1f(G.uRoughness, RECT_FLUTED_CONFIG.roughness); gl.uniform1f(G.uVerticalSmear, RECT_FLUTED_CONFIG.verticalSmear);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        animIdRef.current = requestAnimationFrame(render)

        return () => {
            try {
                cancelAnimationFrame(animIdRef.current)
                footerObserver?.disconnect()
                resizeObserver?.disconnect()
                window.removeEventListener("resize", resize)
                window.removeEventListener("pointermove", onPointerMove)
                if (gl) {
                    gl.deleteProgram(liquid.program); gl.deleteShader(liquid.vs); gl.deleteShader(liquid.fs);
                    gl.deleteProgram(glass.program); gl.deleteShader(glass.vs); gl.deleteShader(glass.fs);
                    gl.deleteTexture(gradTexture); gl.deleteFramebuffer(fbo); gl.deleteBuffer(vbo);
                }
            } catch(e) {
                console.warn("WebGL cleanup error", e)
            }
        }
    }, [])

    return (
        <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    )
}

const FOOTER_EASE = cubicBezier(0.33, 1, 0.68, 1)
const FOOTER_MOBILE = {
    listFontSize: 24,
    labelFontSize: 11,
    listsToHeadlineGap: 96,
}

function NudgeArrowUp() {
    const reduce = useReducedMotion()
    return (
        <motion.span
            aria-hidden="true"
            className="inline-flex items-center"
            animate={reduce ? undefined : { y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        >
            <ArrowUp className="w-[1.1em] h-[1.1em]" strokeWidth={2.2} />
        </motion.span>
    )
}

const FOOTER_RANGES = {
    bar: [0.04, 0.5], headlineStart: 0.08, headlineStep: 0.1, headlineLength: 0.46,
    linksStart: 0.32, linkStep: 0.05, linkLength: 0.46, labels: [0.48, 0.92],
    taglineStart: 0.52, taglineStep: 0.06, taglineLength: 0.4, logo: [0.58, 1],
}

function RiseMask({ progress, range, from = "115%", className = "", children }) {
    const reduce = useReducedMotion()
    const y = useTransform(progress, range, [from, "0%"], { ease: FOOTER_EASE, clamp: true })
    return (
        <span className={`block overflow-hidden ${className}`}>
            <motion.span className="block" style={{ y: reduce ? "0%" : y }}>{children}</motion.span>
        </span>
    )
}

function RiseWord({ progress, range, children }) {
    const reduce = useReducedMotion()
    const y = useTransform(progress, range, ["135%", "0%"], { ease: FOOTER_EASE, clamp: true })
    return (
        <motion.span className="inline-block" style={{ y: reduce ? "0%" : y }}>{children}</motion.span>
    )
}

const FOOTER_HEADLINE = "Get in Touch"
const FOOTER_TAGLINE_LINES = ["Building a brand or launching something new?", "Let's make sure it looks the part."]
const FOOTER_NAV = [{ label: "HOME", href: "/" }, { label: "SERVICES", href: "/#services" }, { label: "ABOUT", href: "/#about" }, { label: "WORK", href: "/#work" }]
const FOOTER_SOCIALS = [{ label: "INSTAGRAM", href: "https://www.instagram.com/iyosias.t/" }, { label: "LINKEDIN", href: "https://www.linkedin.com/in/iyosias-tekezeshoa-3524031ba/" }, { label: "X(TWITTER)", href: "https://x.com/IyosiasTeke" }]

function FooterLogoLink({ scrollToTarget }) {
    const { pathname } = useLocation()
    const pageTransition = usePageTransition()
    const navigate = useNavigate()

    const handleClick = () => {
        if (pathname === "/") {
            scrollToTarget(0, { duration: 1.6 })
        } else if (pageTransition?.triggerTransition) {
            pageTransition.triggerTransition("/")
        } else {
            navigate("/")
        }
    }

    return (
        <Logo 
            className="h-[36px] md:h-[44px] mb-[28px] md:mb-[48px] self-start cursor-pointer" 
            onClick={handleClick} 
        />
    )
}

function SiteLayoutInternal() {
    const vp = useViewport()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const footerTheme = FOOTER_THEMES[pathname] || FOOTER_THEMES.default
    const lenisRef = useRef(null)

    const [headerLight, setHeaderLight] = useState(false)
    const [headerOnFooter, setHeaderOnFooter] = useState(false)

    const isCaseStudy = pathname.startsWith("/work/")
    const heroFade = useMotionValue(isCaseStudy ? 0 : 1)
    const headerFade = useMotionValue(1)

    const footerReveal = useMotionValue(0)
    const footerRevealSmooth = useSpring(footerReveal, { stiffness: 70, damping: 16, mass: 0.6, restDelta: 0.0005 })
    const glassScale = useTransform(footerRevealSmooth, [0, 1], [1.15, 1])
    const footerVisibility = useTransform(footerReveal, (v) => (v > 0 ? "visible" : "hidden"))
    const smoothHeaderFade = useSpring(headerFade, { stiffness: 320, damping: 32, mass: 0.45, restDelta: 0.001 })

    useLayoutEffect(() => {
        const startHeroFade = pathname.startsWith("/work/") ? 0 : 1
        try {
            if (heroFade && typeof heroFade.jump === 'function') heroFade.jump(startHeroFade);
            else if (heroFade && typeof heroFade.set === 'function') heroFade.set(startHeroFade);

            if (headerFade && typeof headerFade.jump === 'function') headerFade.jump(1);
            else if (headerFade && typeof headerFade.set === 'function') headerFade.set(1);

            if (smoothHeaderFade && typeof smoothHeaderFade.jump === 'function') smoothHeaderFade.jump(1);
            else if (smoothHeaderFade && typeof smoothHeaderFade.set === 'function') smoothHeaderFade.set(1);
        } catch (e) {
            console.error("Framer motion animation jump failed", e);
        }
    }, [pathname, heroFade, headerFade, smoothHeaderFade])

    useEffect(() => {
        window.scrollTo(0, 0)
        lenisRef.current?.scrollTo(0, { immediate: true })
        const t = setTimeout(() => { lenisRef.current?.resize() }, 150)
        return () => clearTimeout(t)
    }, [pathname])

    useEffect(() => {
        if (typeof window === 'undefined' || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
        try {
            const lenis = new Lenis({ duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
            lenisRef.current = lenis
            let rafId = requestAnimationFrame(function raf(time) { lenis.raf(time); rafId = requestAnimationFrame(raf); })
            return () => { cancelAnimationFrame(rafId); lenis.destroy(); lenisRef.current = null; }
        } catch(e) {
            console.error("Lenis initialization failed:", e)
        }
    }, [])

    useEffect(() => {
        let raf = null
        const resize = () => {
            if (raf !== null) return
            raf = requestAnimationFrame(() => { raf = null; lenisRef.current?.resize(); })
        }
        const ro = new ResizeObserver(resize)
        ro.observe(document.documentElement); ro.observe(document.body);
        window.addEventListener("load", resize); window.addEventListener("resize", resize);
        const t = setTimeout(resize, 600)
        return () => {
            if (raf !== null) cancelAnimationFrame(raf)
            clearTimeout(t); ro.disconnect(); window.removeEventListener("load", resize); window.removeEventListener("resize", resize);
        }
    }, [])

    const scrollToTarget = useCallback((target, options = {}) => {
        const lenis = lenisRef.current
        if (lenis) { lenis.scrollTo(target, { duration: 1.4, ...options }); return; }
        if (target === 0) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
        const el = typeof target === "string" ? document.querySelector(target) : target
        el?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(() => {
        let frame = null
        const update = () => {
            frame = null
            const target = document.getElementById("get-in-touch")
            if (!target) return
            const vh = window.innerHeight || 800; const top = target.getBoundingClientRect().top
            footerReveal.set(Math.min(1, Math.max(0, (vh - top) / vh)))
            setHeaderOnFooter(top <= (window.innerWidth < 768 ? 36 : 47))
        }
        const onScroll = () => { if (frame === null) frame = requestAnimationFrame(update) }
        update()
        window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll)
        return () => {
            if (frame !== null) cancelAnimationFrame(frame)
            window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll)
        }
    }, [footerReveal])

    const headlineWords = FOOTER_HEADLINE.split(" ").map((word, i) => {
        const start = FOOTER_RANGES.headlineStart + i * FOOTER_RANGES.headlineStep
        return (
            <React.Fragment key={i}>
                {i > 0 ? " " : null}
                <RiseWord progress={footerRevealSmooth} range={[start, start + FOOTER_RANGES.headlineLength]}>{word}</RiseWord>
            </React.Fragment>
        )
    })

    const headerDark = headerLight && !headerOnFooter

    return (
        <ViewportContext.Provider value={vp}>
            <PageTransitionProvider>
                <Preloader lenisRef={lenisRef} />
                <div className="relative w-full overflow-x-clip bg-[var(--bg-dark)] selection:bg-black selection:text-white">
                    <style>{RESPONSIVE_CSS}</style>

                    <Header dark={headerDark} opacity={smoothHeaderFade} scrollToTarget={scrollToTarget} />

                    <TransitionMain className="relative z-10 bg-[var(--bg-dark)] overflow-clip">
                        <Outlet context={{ setHeaderLight, scrollToTarget, heroFade, headerFade, lenisRef }} />
                    </TransitionMain>

                    <div id="get-in-touch" aria-hidden="true" className="relative z-0 w-full h-[100svh] pointer-events-none" />

                    <motion.footer
                        className="fixed bottom-0 left-0 z-0 flex flex-col justify-between w-full h-[100svh] px-[var(--page-pad)] pt-[88px] md:pt-[96px] pb-[24px] md:pb-[136px] lg:pb-[24px] text-white overflow-hidden"
                        style={{
                            visibility: footerVisibility,
                            backgroundColor: footerTheme.bg,
                            "--fm-list-size": `${FOOTER_MOBILE.listFontSize}px`,
                            "--fm-label-size": `${FOOTER_MOBILE.labelFontSize}px`,
                            "--fm-gap": `${FOOTER_MOBILE.listsToHeadlineGap}px`,
                        }}
                    >
                        <motion.div style={{ scale: glassScale }} className="absolute inset-0 z-0 will-change-transform">
                            <RectangularFlutedGlassFooter palette={footerTheme.palette} />
                        </motion.div>
                        <FooterBlackGradient rgb={footerTheme.scrimRgb} />

                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-12 gap-x-[16px] gap-y-[128px] md:gap-y-[48px] lg:gap-y-0 mt-auto items-stretch">
                            <div className="col-span-2 md:col-span-12 lg:col-span-6 flex flex-col items-start justify-between text-left">
                                <RiseMask progress={footerRevealSmooth} range={FOOTER_RANGES.logo} className="self-start">
                                    <FooterLogoLink scrollToTarget={scrollToTarget} />
                                </RiseMask>
                                <p className="P1 rwd-balance !text-white/80 max-w-[520px] lg:max-w-none m-0">
                                    {FOOTER_TAGLINE_LINES.map((line, i) => {
                                        const k = FOOTER_TAGLINE_LINES.length - 1 - i
                                        const start = FOOTER_RANGES.taglineStart + k * FOOTER_RANGES.taglineStep
                                        return <RiseMask key={line} progress={footerRevealSmooth} range={[start, start + FOOTER_RANGES.taglineLength]}>{line}</RiseMask>
                                    })}
                                </p>
                            </div>

                            <div className="col-span-1 md:col-span-6 lg:col-start-8 lg:col-span-3">
                                <RiseMask progress={footerRevealSmooth} range={FOOTER_RANGES.labels}>
                                    <p className="Label max-md:!text-[length:var(--fm-label-size)] text-[var(--text-dark-secondary)] mb-[16px] md:mb-[24px]">NAVIGATION</p>
                                </RiseMask>
                                <nav className="flex flex-col gap-[6px] md:gap-0">
                                    {FOOTER_NAV.map(({ label, href }, i) => (
                                        <RiseMask key={label} progress={footerRevealSmooth} range={[FOOTER_RANGES.linksStart + i * FOOTER_RANGES.linkStep, FOOTER_RANGES.linksStart + i * FOOTER_RANGES.linkStep + FOOTER_RANGES.linkLength]}>
                                            <RollingLink 
                                                href={href} 
                                                className="H5 max-md:!text-[length:var(--fm-list-size)] text-white transition-colors duration-200 hover:text-white/80" 
                                                onClick={(e) => { 
                                                    if (pathname === "/") {
                                                        if (href === "/") {
                                                            e.preventDefault();
                                                            scrollToTarget(0);
                                                        } else if (href.startsWith("/#")) {
                                                            e.preventDefault();
                                                            scrollToTarget(href.replace("/", "")); 
                                                        }
                                                    } 
                                                }}
                                            >
                                                {label}
                                            </RollingLink>
                                        </RiseMask>
                                    ))}
                                </nav>
                            </div>

                            <div className="col-span-1 md:col-span-6 lg:col-start-11 lg:col-span-2">
                                <RiseMask progress={footerRevealSmooth} range={FOOTER_RANGES.labels}>
                                    <p className="Label max-md:!text-[length:var(--fm-label-size)] text-[var(--text-dark-secondary)] mb-[16px] md:mb-[24px]">SOCIALS</p>
                                </RiseMask>
                                <div className="flex flex-col gap-[6px] md:gap-0">
                                    {FOOTER_SOCIALS.map(({ label, href }, i) => (
                                        <RiseMask key={label} progress={footerRevealSmooth} range={[FOOTER_RANGES.linksStart + i * FOOTER_RANGES.linkStep, FOOTER_RANGES.linksStart + i * FOOTER_RANGES.linkStep + FOOTER_RANGES.linkLength]}>
                                            <RollingLink href={href} target="_blank" rel="noopener noreferrer" className="H5 max-md:!text-[length:var(--fm-list-size)] text-white transition-colors duration-200 hover:text-white/80">{label}</RollingLink>
                                        </RiseMask>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <a href="mailto:info@iyosiasdesign.com" className="group block no-underline cursor-pointer">
                                <FitText as="h2" wrapperClassName="mt-[var(--fm-gap)] md:mt-[48px]" className="font-[family-name:var(--font-heading)] font-medium tracking-[-0.04em] leading-[0.8] select-none text-white">
                                    <span className="relative block overflow-hidden py-[0.06em]">
                                        <span className="block transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[125%] will-change-transform">{headlineWords}</span>
                                        <span aria-hidden="true" className="absolute inset-0 py-[0.06em] block translate-y-[125%] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 will-change-transform">{headlineWords}</span>
                                    </span>
                                </FitText>
                            </a>
                        </div>

                        <RiseMask progress={footerRevealSmooth} range={FOOTER_RANGES.bar} className="relative z-10 w-full mt-[24px] md:mt-[32px]">
                            <div className="flex justify-between w-full text-[var(--text-dark-secondary)]">
                                <button onClick={() => scrollToTarget(0, { duration: 1.6 })} className="group H6 !text-[12px] md:!text-[14px] inline-flex items-center gap-[6px] whitespace-nowrap uppercase tracking-normal hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 text-[var(--text-dark-secondary)]">
                                    <span className="relative inline-block overflow-hidden leading-[1.15]">
                                        <span className="block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full will-change-transform">BACK TO THE TOP</span>
                                        <span aria-hidden="true" className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 will-change-transform">BACK TO THE TOP</span>
                                    </span>
                                    <NudgeArrowUp />
                                </button>
                                <span className="H6 !text-[12px] md:!text-[14px] whitespace-nowrap uppercase tracking-normal">©2026 IYOSIAS</span>
                            </div>
                        </RiseMask>
                    </motion.footer>
                </div>
            </PageTransitionProvider>
        </ViewportContext.Provider>
    )
}

export default function SiteLayout() {
    return (
        <LayoutErrorBoundary>
            <SiteLayoutInternal />
        </LayoutErrorBoundary>
    );
}