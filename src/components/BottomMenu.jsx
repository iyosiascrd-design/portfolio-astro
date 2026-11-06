import React, { useState } from "react"
import { motion } from "framer-motion"
import Logo from "./Logo"
import {
    wrapperVariants,
    navListVariants,
    linkItemVariants,
    socialVariants,
} from "../lib/motion"

const MENU_LINKS = ["WORK", "SERVICES", "ABOUT", "GET IN TOUCH"]
const SOCIAL_LINKS = ["LINKEDIN", "INSTAGRAM"]

export default function BottomMenu({
    menuFade,
    menuY,
    footerInView,
    scrollToTarget,
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const toggleMenu = () => setIsMenuOpen((prev) => !prev)

    return (
        <motion.div
            aria-hidden={footerInView}
            initial={false}
            animate={{
                y: 0,
                opacity: 1,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] md:bottom-[36px] left-0 z-50 flex justify-center w-full px-8 md:px-12 pointer-events-none"
        >
            <motion.div
                initial="closed"
                animate={isMenuOpen ? "open" : "closed"}
                style={{
                    opacity: menuFade,
                    y: menuY,
                    pointerEvents: footerInView ? "none" : "auto",
                }}
                className="flex flex-col w-full max-w-[654px] p-[16px] md:p-[24px] bg-black/25 backdrop-blur-md border-[0.5px] border-white/20 rounded-[24px] shadow-2xl"
            >
                <motion.div variants={wrapperVariants} className="overflow-hidden">
                    <div className="flex flex-col w-full pb-8">
                        <motion.nav
                            variants={navListVariants}
                            className="flex flex-col gap-[12px] pt-2 mb-[40px] md:mb-[64px]"
                        >
                            {MENU_LINKS.map((link) => {
                                const targetId = `#${link.toLowerCase().replace(/\s+/g, "-")}`
                                return (
                                    <div key={link} className="overflow-hidden">
                                        <motion.div variants={linkItemVariants}>
                                            <a
                                                href={targetId}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    setIsMenuOpen(false)
                                                    scrollToTarget(targetId)
                                                }}
                                                className="text-[32px] md:text-[40px] leading-[1.1] md:leading-[40px] tracking-[-0.02em] font-semibold uppercase block w-fit text-white transition-transform duration-300 ease-out hover:translate-x-[32px]"
                                            >
                                                {link}
                                            </a>
                                        </motion.div>
                                    </div>
                                )
                            })}
                        </motion.nav>

                        <motion.div variants={socialVariants} className="flex justify-between text-white/60 text-[16px] md:text-[18px] font-medium tracking-wide">
                            {SOCIAL_LINKS.map((social) => (
                                <a
                                    href="#"
                                    key={social}
                                    className="group relative transition-colors duration-300 ease-out hover:text-white pb-[2px]"
                                >
                                    {social}
                                    <span className="absolute left-0 bottom-0 w-full h-[2px] bg-white origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 will-change-transform" />
                                </a>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                <div className="flex items-center justify-between w-full">
                    <Logo className="h-[32px] md:h-[40px]" />
                    
                    <button
                        onClick={toggleMenu}
                        className={`relative text-[20px] tracking-[-0.03em] !font-bold uppercase flex items-center justify-center w-[120px] h-[40px] rounded-[48px] transition-colors duration-700 cursor-pointer overflow-hidden ${
                            isMenuOpen ? "bg-black" : "bg-white"
                        }`}
                    >
                        {/* MENU Text Layer */}
                        <motion.div
                            initial={false}
                            animate={{ 
                                y: isMenuOpen ? -32 : 0, 
                                opacity: isMenuOpen ? 0 : 1 
                            }}
                            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <span className="text-black">
                                MENU
                            </span>
                        </motion.div>

                        {/* CLOSE Text Layer */}
                        <motion.div
                            initial={false}
                            animate={{ 
                                y: isMenuOpen ? 0 : 32, 
                                opacity: isMenuOpen ? 1 : 0 
                            }}
                            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <span className="text-white">
                                CLOSE
                            </span>
                        </motion.div>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}