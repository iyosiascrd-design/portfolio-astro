// src/components/ServiceImageStage.jsx
import React, { useEffect, useRef } from "react"
import gsap from "gsap"

// Same clip-path wipe as the case study images (useCaseStudyReveal REVEAL): hidden, then revealed
// downward from the top edge. No scale or drift on the image itself.
export const SERVICE_IMAGE_REVEAL = {
    wipeFrom: "inset(0% 0% 100% 0%)",
    wipeTo: "inset(0% 0% 0% 0%)",
    clipDuration: 1.15,
    ease: "power3.inOut",
    rootMargin: "0px 0px -16% 0px", // first reveal fires once the frame is clearly inside the viewport
}

const makeLayer = (src, objectPosition = "50% 50%") => {
    const el = document.createElement("div")
    el.style.cssText = "position:absolute;inset:0;overflow:hidden;will-change:clip-path"
    const img = document.createElement("img")
    img.src = src
    img.alt = ""
    img.draggable = false
    img.setAttribute("aria-hidden", "true")
    img.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform;user-select:none;pointer-events:none"
    img.style.objectPosition = objectPosition
    el.appendChild(img)
    return { el, img, tl: null }
}

/**
 * GSAP mask-wipe image swap.
 * Every change stacks a NEW layer on top and wipes it in. Older layers are only removed once
 * a newer layer fully covers them, so rapid changes never cut an animation off or pop.
 */
export default function ServiceImageStage({ images, index, label, objectPosition = "50% 50%" }) {
    // objectPosition: one CSS value for every image, or an array with one value per image
    const posFor = (i) => (Array.isArray(objectPosition) ? objectPosition[i] : objectPosition) || "50% 50%"
    const posForRef = useRef(posFor)
    posForRef.current = posFor
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
        const base = makeLayer(images[currentRef.current], posForRef.current(currentRef.current))
        stage.appendChild(base.el)
        layersRef.current = [base]

        let io = null
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const canClip = typeof CSS !== "undefined" && !!CSS.supports?.("clip-path", "inset(0% 0% 0% 0%)")
        if (!reduce && canClip && typeof IntersectionObserver !== "undefined") {
            const R = SERVICE_IMAGE_REVEAL
            gsap.set(base.el, { clipPath: R.wipeFrom })
            io = new IntersectionObserver(
                (entries) => {
                    if (!entries.some((e) => e.isIntersecting)) return
                    io.disconnect()
                    io = null
                    base.tl = gsap.fromTo(
                        base.el,
                        { clipPath: R.wipeFrom },
                        {
                            clipPath: R.wipeTo,
                            duration: R.clipDuration,
                            ease: R.ease,
                            overwrite: "auto",
                            clearProps: "clipPath",
                        }
                    )
                },
                { rootMargin: R.rootMargin, threshold: 0 }
            )
            io.observe(stage)
        }

        return () => {
            io?.disconnect()
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
        const layer = makeLayer(images[index], posForRef.current(index))
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

        // new layer wipes in over the old one, top to bottom (same as the case study reveal)
        gsap.set(layer.el, { clipPath: R.wipeFrom })
        layer.tl = gsap.to(layer.el, {
            clipPath: R.wipeTo,
            duration: R.clipDuration,
            ease: R.ease,
            onComplete: () => {
                gsap.set(layer.el, { clearProps: "clipPath" })
                dropBelow()
            },
        })
    }, [index, images])

    return <div ref={stageRef} role="img" aria-label={label} className="absolute inset-0" />
}