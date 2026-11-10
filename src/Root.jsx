import React from "react"
import { BrowserRouter, StaticRouter } from "react-router-dom"
import App from "./App.jsx"

export default function Root({ initialPath = "/" }) {
    const isServer = typeof window === "undefined"
    const Router = isServer ? StaticRouter : BrowserRouter
    const routerProps = isServer ? { location: initialPath } : {}

    return (
        <React.StrictMode>
            <Router {...routerProps}>
                <App />
            </Router>
        </React.StrictMode>
    )
}