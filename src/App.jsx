import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import SiteLayout from "./layouts/SiteLayout"
import Home from "./views/Home"
import Work from "./views/Work"
import WeyraCaseStudy from "./views/WeyraCaseStudy"
import OrigenCaseStudy from "./views/OrigenCaseStudy"
import YimajCaseStudy from "./views/YimajCaseStudy"
import ZhongshanCaseStudy from "./views/ZhongshanCaseStudy"

export default function App() {
    return (
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
    )
}