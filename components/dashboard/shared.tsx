"use client"

import { useState } from "react"
import { BarChart2, PieChart as PieIcon, TrendingUp, Activity, Calendar, X } from "lucide-react"
import type { Period, DateRange } from "@/lib/api"

export type { Period }
export type ChartType = "bar" | "line" | "pie" | "area"

// ── Period selector with date range ─────────────────────────────
interface PeriodTabsProps {
  value: Period
  onChange: (p: Period) => void
  range?: DateRange
  onRangeChange?: (r: DateRange) => void
}

const PERIODS: { id: Period; label: string }[] = [
  { id: "dia",    label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mes" },
  { id: "año",    label: "Año" },
  { id: "rango",  label: "Rango" },
]

export function PeriodTabs({ value, onChange, range, onRangeChange }: PeriodTabsProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [localFrom, setLocalFrom] = useState(range?.from ?? today)
  const [localTo, setLocalTo] = useState(range?.to ?? today)

  function applyRange() {
    if (localFrom && localTo && onRangeChange) {
      onRangeChange({ from: localFrom, to: localTo })
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex bg-muted rounded-lg p-0.5 gap-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              value === p.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.id === "rango" ? (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {p.label}
              </span>
            ) : p.label}
          </button>
        ))}
      </div>

      {value === "rango" && (
        <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1">
          <input
            type="date"
            value={localFrom}
            max={localTo}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="bg-transparent text-xs text-foreground outline-none w-32 cursor-pointer"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <input
            type="date"
            value={localTo}
            min={localFrom}
            max={today}
            onChange={(e) => setLocalTo(e.target.value)}
            className="bg-transparent text-xs text-foreground outline-none w-32 cursor-pointer"
          />
          <button
            onClick={applyRange}
            className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Chart type switcher ──────────────────────────────────────────
interface ChartTypeSwitcherProps {
  value: ChartType
  onChange: (c: ChartType) => void
  options?: ChartType[]
}

const CHART_ICONS: Record<ChartType, React.ElementType> = {
  bar:  BarChart2,
  line: TrendingUp,
  pie:  PieIcon,
  area: Activity,
}

const CHART_LABELS: Record<ChartType, string> = {
  bar:  "Barras",
  line: "Línea",
  pie:  "Torta",
  area: "Área",
}

export function ChartTypeSwitcher({ value, onChange, options = ["bar", "line", "pie", "area"] }: ChartTypeSwitcherProps) {
  return (
    <div className="inline-flex bg-muted rounded-lg p-0.5 gap-0.5">
      {options.map((type) => {
        const Icon = CHART_ICONS[type]
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            title={CHART_LABELS[type]}
            aria-label={CHART_LABELS[type]}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              value === type
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{CHART_LABELS[type]}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Section header ───────────────────────────────────────────────
interface SectionHeaderProps {
  icon: React.ElementType
  iconColor: string
  title: string
  subtitle?: string
  children?: React.ReactNode
  badge?: string
}

export function SectionHeader({ icon: Icon, iconColor, title, subtitle, children, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap pb-5 border-b border-border">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconColor}`}>
          <Icon size={19} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: React.ElementType
  iconBg?: string
  trend?: { value: number; label: string }
}

export function KpiCard({ label, value, sub, accent = "", icon: Icon, iconBg, trend }: KpiCardProps) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow h-full ${accent}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg ?? "bg-muted"}`}>
            <Icon size={14} className="text-foreground/70" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      <div className="flex items-center justify-between mt-auto">
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        {trend && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            trend.value >= 0
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          }`}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
    </div>
  )
}

// ── Chart card wrapper ───────────────────────────────────────────
interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  toolbar?: React.ReactNode
  className?: string
  accentBar?: string
}

export function ChartCard({ title, subtitle, children, toolbar, className = "", accentBar }: ChartCardProps) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${className}`}>
      {accentBar && <div className={`h-1 ${accentBar}`} />}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {toolbar && <div className="flex items-center gap-2 flex-wrap shrink-0">{toolbar}</div>}
      </div>
      <div className="px-4 pb-5">{children}</div>
    </div>
  )
}

// ── AI Insight card ──────────────────────────────────────────────
interface InsightCardProps {
  insights: string[]
  title?: string
  color?: string
}

export function InsightCard({ insights, title = "Insights IA", color = "bg-violet-500" }: InsightCardProps) {
  const [dismissed, setDismissed] = useState<number[]>([])
  const visible = insights.filter((_, i) => !dismissed.includes(i))
  if (visible.length === 0) return null

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500" />
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg ${color} flex items-center justify-center`}>
          <span className="text-white text-[10px] font-bold">IA</span>
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">Análisis automático</span>
      </div>
      <div className="px-5 pb-4 flex flex-col gap-2">
        {insights.map((insight, i) => {
          const realIdx = insights.indexOf(insight)
          if (dismissed.includes(realIdx)) return null
          return (
            <div key={i} className="flex items-start gap-2.5 bg-muted/50 rounded-xl px-3 py-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <p className="text-xs text-foreground leading-relaxed flex-1">{insight}</p>
              <button
                onClick={() => setDismissed((d) => [...d, realIdx])}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Descartar"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Loading skeleton ─────────────────────────────────────────────
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-5 animate-pulse ${className}`}>
      <div className="h-3 w-24 bg-muted rounded mb-4" />
      <div className="h-7 w-16 bg-muted rounded mb-2" />
      <div className="h-2 w-32 bg-muted rounded" />
    </div>
  )
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-5 animate-pulse ${className}`}>
      <div className="h-3 w-32 bg-muted rounded mb-6" />
      <div className="h-48 bg-muted rounded-lg" />
    </div>
  )
}

// ── Chart colour palette ─────────────────────────────────────────
export const COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
]
