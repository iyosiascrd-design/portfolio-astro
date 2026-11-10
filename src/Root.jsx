import React from "react"
import { BrowserRouter, StaticRouter } from "react-router-dom"
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