import React, { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { customEase } from "../lib/motion"

export default function ParallaxImage({
    src,
    alt = "",
    aspect = "aspect-[16/10]",
    className = "",
    travel = 10,
    initialScale = 1.08,
}) {
    const ref = useRef(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    })

    const y = useTransform(
        scrollYProgress,
        [0, 1],
        [`-${travel}%`, `${travel}%`]
    )

    return (
        <div
            ref={ref}
            className={`relative w-full overflow-hidden bg-[#111] ${aspect} ${className}`}
        >
            <motion.div
                initial={{ scale: initialScale }}
                whileInView={{ scale: 1.0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.4, ease: customEase }}
                className="w-full h-full relative"
            >
                <motion.img
                    src={src}
                    alt={alt}
                    draggable={false}
                    style={{ y, scale: 1.25 }}
                    className="absolute inset-0 object-cover w-full h-full select-none pointer-events-none will-change-transform"
                />
            </motion.div>
        </div>
    )
}