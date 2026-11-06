// src/components/ServiceImageStage.jsx
import React, { useEffect, useRef } from "react"
import gsap from "gsap"

export const SERVICE_IMAGE_REVEAL = {
    clipDuration: 1.25, // mask wipe
    imageDuration: 1.9, // inner image settles (scale + drift)
    pushDuration: 1.25, // outgoing image drifts back (depth)
    ease: "expo.out",
    pushEase: "power3.inOut",
    startScale: 1.35,
    startYPercent: 6,
    pushYPercent: -8,
    pushScale: 1.06,
}

const makeLayer = (src) => {
    const el = document.createElement("div")
    el.style.cssText = "position:absolute;inset:0;overflow:hidden;will-change:clip-path"
    const img = document.createElement("img")
    img.src = src
    img.alt = ""
    img.draggable = false
    img.setAttribute("aria-hidden", "true")
    img.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform;user-select:none;pointer-events:none"
    el.appendChild(img)
    return { el, img, tl: null }
}

/**
 * GSAP mask-wipe image swap.
 * Every change stacks a NEW layer on top and wipes it in. Older layers are only removed once
 * a newer layer fully covers them, so rapid changes never cut an animation off or pop.
 */
export default function ServiceImageStage({ images, index, label }) {
    const stageRef = useRef(null)
    const layersRef = useRef([])
    const currentRef = useRef(index)
    const indexRef = useRef(index)
    indexRef.current = index

    // mount: preload + base layer
    useEffect(() => {
        const stage = stageRef.current
        if (!stage) return
        images.forEach((src) => {
            const i = new Image()
            i.src = src
        })
        currentRef.current = indexRef.current
        const base = makeLayer(images[currentRef.current])
        stage.appendChild(base.el)
        layersRef.current = [base]

        return () => {
            layersRef.current.forEach((l) => {
                l.tl?.kill()
                gsap.killTweensOf([l.el, l.img])
                l.el.remove()
            })
            layersRef.current = []
        }
    }, [images])

    // index change: stack + wipe a new layer
    useEffect(() => {
        if (currentRef.current === index) return
        const stage = stageRef.current
        if (!stage) return
        currentRef.current = index

        const R = SERVICE_IMAGE_REVEAL
        const list = layersRef.current
        const prev = list[list.length - 1]
        const layer = makeLayer(images[index])
        stage.appendChild(layer.el)
        list.push(layer)

        const dropBelow = () => {
            const i = list.indexOf(layer)
            if (i <= 0) return
            list.splice(0, i).forEach((l) => {
                l.tl?.kill()
                gsap.killTweensOf([l.el, l.img])
                l.el.remove()
            })
        }

        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        if (reduce) {
            dropBelow()
            return
        }

        gsap.set(layer.el, { clipPath: "inset(100% 0% 0% 0%)" })
        gsap.set(layer.img, { scale: R.startScale, yPercent: R.startYPercent, force3D: true })

        const tl = gsap.timeline()
        layer.tl = tl
        tl.to(
            layer.el,
            { clipPath: "inset(0% 0% 0% 0%)", duration: R.clipDuration, ease: R.ease, onComplete: dropBelow },
            0
        ).to(layer.img, { scale: 1, yPercent: 0, duration: R.imageDuration, ease: R.ease }, 0)

        if (prev) {
            tl.to(
                prev.img,
                {
                    yPercent: R.pushYPercent,
                    scale: R.pushScale,
                    duration: R.pushDuration,
                    ease: R.pushEase,
                    overwrite: "auto",
                },
                0
            )
        }
    }, [index, images])

    return <div ref={stageRef} role="img" aria-label={label} className="absolute inset-0" />
}