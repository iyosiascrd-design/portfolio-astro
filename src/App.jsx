import React, { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import SiteLayout from "./layouts/SiteLayout"
import Home from "./views/Home"

// Load case studies only when navigated to
const Work = lazy(() => import("./views/Work"))
const WeyraCaseStudy = lazy(() => import("./views/WeyraCaseStudy"))
const OrigenCaseStudy = lazy(() => import("./views/OrigenCaseStudy"))
const YimajCaseStudy = lazy(() => import("./views/YimajCaseStudy"))
const ZhongshanCaseStudy = lazy(() => import("./views/ZhongshanCaseStudy"))

export default function App() {
    return (
        // Wrapping the entire routing block ensures the lazy-loaded components
        // can resolve properly without breaking React Router's internal tree.
        <Suspense fallback={null}>
            <Routes>
                <Route element={<SiteLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/work" element={<Work />} />
                    <Route path="/work/weyra" element={<WeyraCaseStudy />} />
                    <Route path="/work/origen" element={<OrigenCaseStudy />} />
                    <Route path="/work/yimaj" element={<YimajCaseStudy />} />
                    <Route path="/work/zhongshan" element={<ZhongshanCaseStudy />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Suspense>
    )
}