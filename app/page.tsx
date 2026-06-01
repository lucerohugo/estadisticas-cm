"use client"

import { useState, useEffect } from "react"
import { SWRConfig } from "swr"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard"
import { PedidosDashboard } from "@/components/dashboard/PedidosDashboard"
import { ArticulosDashboard } from "@/components/dashboard/ArticulosDashboard"
import { StockDashboard } from "@/components/dashboard/StockDashboard"
import { RevendedoresDashboard } from "@/components/dashboard/RevendedoresDashboard"
import { LoginForm } from "@/components/dashboard/LoginForm"
import { getStoredUser, type User } from "@/lib/auth"

export type ActiveSection = "overview" | "pedidos" | "articulos" | "stock" | "revendedores"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [active, setActive] = useState<ActiveSection>("overview")

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }
    setIsCheckingAuth(false)
  }, [])

  const handleLogout = () => {
    setUser(null)
    setActive("overview")
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-primary-foreground">CM</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginForm onLogin={setUser} />
  }

  // Show dashboard if authenticated
  return (
    <SWRConfig>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar active={active} onSelect={setActive} user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto min-w-0">
          {active === "overview"     && <OverviewDashboard onNavigate={setActive} />}
          {active === "pedidos"      && <PedidosDashboard />}
          {active === "articulos"    && <ArticulosDashboard />}
          {active === "stock"        && <StockDashboard />}
          {active === "revendedores" && <RevendedoresDashboard />}
        </main>
      </div>
    </SWRConfig>
  )
}
