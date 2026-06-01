"use client"

import { LayoutDashboard, ShoppingCart, Package, Boxes, Users, Sun, Moon, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import type { ActiveSection } from "@/app/page"
import { clearUser, type User } from "@/lib/auth"

interface SidebarProps {
  active: ActiveSection
  onSelect: (s: ActiveSection) => void
  user: User
  onLogout: () => void
}

const PILLAR_ITEMS: {
  id: ActiveSection
  icon: React.ElementType
  label: string
  color: string
  dot: string
}[] = [
  { id: "pedidos",      icon: ShoppingCart,    label: "Pedidos",      color: "text-orange-400",  dot: "bg-orange-400" },
  { id: "articulos",    icon: Package,         label: "Artículos",    color: "text-sky-400",     dot: "bg-sky-400" },
  { id: "stock",        icon: Boxes,           label: "Stock",        color: "text-emerald-400", dot: "bg-emerald-400" },
  { id: "revendedores", icon: Users,           label: "Revendedores", color: "text-violet-400",  dot: "bg-violet-400" },
]

export function Sidebar({ active, onSelect, user, onLogout }: SidebarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isDark = theme === "dark"

  const handleLogout = () => {
    clearUser()
    onLogout()
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-sidebar h-full border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <span className="text-xs font-bold text-primary-foreground">CM</span>
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">Centro Motos</p>
          <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">Panel de gestión</p>
        </div>
      </div>

      {/* Resumen button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => onSelect("overview")}
          aria-label="Resumen"
          className={`
            relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150
            ${active === "overview"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90"
            }
          `}
        >
          {active === "overview" && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
          )}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active === "overview" ? "bg-sidebar-border" : ""}`}>
            <LayoutDashboard size={16} className={active === "overview" ? "text-slate-300" : "text-sidebar-foreground/40"} strokeWidth={active === "overview" ? 2.2 : 1.8} />
          </div>
          <span className={`text-sm font-medium ${active === "overview" ? "text-sidebar-foreground" : ""}`}>Resumen</span>
          {active === "overview" && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-400" />}
        </button>
      </div>

      {/* Pilares label */}
      <p className="px-5 pt-3 pb-2 text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
        Pilares
      </p>

      {/* Pillar items */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {PILLAR_ITEMS.map(({ id, icon: Icon, label, color, dot }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              aria-label={label}
              className={`
                relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150
                ${isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90"
                }
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
              )}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-sidebar-border" : ""}`}>
                <Icon size={16} className={isActive ? color : "text-sidebar-foreground/40"} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className={`text-sm font-medium ${isActive ? "text-sidebar-foreground" : ""}`}>{label}</span>
              {isActive && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${dot}`} />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-sidebar-border flex flex-col gap-1">
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90 transition-all duration-150"
          >
            {isDark
              ? <Sun size={16} className="text-amber-400" />
              : <Moon size={16} />
            }
            <span className="text-sm font-medium">{isDark ? "Modo claro" : "Modo oscuro"}</span>
          </button>
        )}
        
        {/* User info and logout */}
        <div className="flex items-center gap-2 px-3 py-2 mt-1 bg-sidebar-accent/30 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{user.username.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.username}</p>
            <p className="text-[10px] text-sidebar-foreground/40">Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-red-400 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 pt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-sidebar-foreground/30">Conectado a API</span>
        </div>
      </div>
    </aside>
  )
}
