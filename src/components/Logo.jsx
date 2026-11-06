// src/components/Logo.jsx
import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

export default function Logo({ className = "", invert = false, onClick }) {
    const { pathname } = useLocation()
    const navigate = useNavigate()

    const handleClick = (e) => {
        if (onClick) {
            onClick(e)
            return
        }
        if (pathname === "/") {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    return (
        <Link
            to="/"
            onClick={handleClick}
            className={`inline-block select-none ${className}`}
        >
            <img
                src="/iyosias-logo.svg"
                alt="Iyosias"
                draggable={false}
                className="block w-auto h-full select-none cursor-pointer"
                style={{ filter: invert ? "invert(1)" : "none" }}
            />
        </Link>
    )
}