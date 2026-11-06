import React, { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

const SITE_GREY = "#cccccc"
const SCROLL_FILL_GREY = SITE_GREY
const SCROLL_FILL_COLOR = "#000000"
const SCROLL_FILL_OFFSET = ["start 0.85", "end 0.5"]

const flat = (str) => str.replace(/\n/g, " ")

function ScrollFillWord({ word, progress, start, end }) {
    const clip = useTransform(
        progress,
        [start, end],
        ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"]
    )

    return (
        <span className="relative inline-block">
            <span style={{ color: SCROLL_FILL_GREY }}>{word}</span>
            <motion.span
                aria-hidden="true"
                style={{ clipPath: clip, color: SCROLL_FILL_COLOR }}
                className="absolute left-0 top-0 whitespace-nowrap"
            >
                {word}
            </motion.span>
        </span>
    )
}

export default function ScrollFillGroup({
    blocks,
    className = "",
    offset = SCROLL_FILL_OFFSET,
}) {
    const ref = useRef(null)
    const { scrollYProgress } = useScroll({ target: ref, offset })

    const parsed = blocks.map((b) => flat(b.text).split(" ").filter(Boolean))
    const total = parsed.reduce((n, words) => n + words.length, 0)
    let counter = 0

    return (
        <div ref={ref} className={className}>
            {blocks.map((block, bi) => (
                <h3 key={bi} className={block.className}>
                    {parsed[bi].map((word, i) => {
                        const index = counter++
                        return (
                            <React.Fragment key={i}>
                                {i > 0 ? " " : null}
                                <ScrollFillWord
                                    word={word}
                                    progress={scrollYProgress}
                                    start={index / total}
                                    end={(index + 1) / total}
                                />
                            </React.Fragment>
                        )
                    })}
                </h3>
            ))}
        </div>
    )
}