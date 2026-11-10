import React from "react"
import { BrowserRouter } from "react-router-dom"
import { StaticRouter } from "react-router-dom/server"
import App from "./App.jsx"

export default function Root({ initialPath = "/" }) {
    const Router = typeof window === "undefined" ? StaticRouter : BrowserRouter
    const routerProps = typeof window === "undefined" ? { location: initialPath } : {}

    return (
        <React.StrictMode>
            <Router {...routerProps}>
                <App />
            </Router>
        </React.StrictMode>
    )
}