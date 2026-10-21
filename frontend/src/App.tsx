import { useEffect, useState } from "react"
import { AppShell, type NavId } from "@/components/AppShell"
import ClosestPairPage from "@/pages/ClosestPair"
import KdTreePage from "@/pages/KdTree"
import Overview from "@/pages/Overview"

const TITLES: Record<NavId, string> = { overview: "Live habitat", closest: "Closest pair", kdtree: "KD-Tree search" }

export default function App() {
  const [page, setPage] = useState<NavId>("overview")
  useEffect(() => {
    document.title = `${TITLES[page]} · GeoWild`
  }, [page])
  const go = (id: NavId) => {
    setPage(id)
    window.scrollTo({ top: 0 })
  }
  return (
    <AppShell active={page} onNav={go}>
      {page === "overview" && <Overview onOpen={go} />}
      {page === "closest" && <ClosestPairPage />}
      {page === "kdtree" && <KdTreePage />}
    </AppShell>
  )
}
