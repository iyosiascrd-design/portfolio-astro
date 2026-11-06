import React from "react"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"

export default function Root() {
    return (
        <React.StrictMode>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </React.StrictMode>
    )
}