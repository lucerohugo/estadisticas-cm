"use client"

import { useMemo, useState } from "react"
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts"
import {
  ShoppingCart, Package, Boxes, Users, MapPin,
  TrendingUp, ArrowRight, CheckCircle, Clock,
} from "lucide-react"
import {
  usePedidos, useArticulos, useStock, useStockTotal, useRevendedores, useProvincias,
  filterByPeriod, formatARS, formatNum, countBy,
  type Period, type DateRange,
} from "@/lib/api"
import { SkeletonCard, COLORS, PeriodTabs, ChartCard } from "./shared"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ActiveSection } from "@/app/page"

interface OverviewDashboardProps {
  onNavigate: (s: ActiveSection, data?: { selectedRev?: number }) => void
}

// PERIOD_OPTIONS no se usa más, PeriodTabs maneja los períodos

// ══════════════════════════════════════════════════════════════════════════════
// SMALL KPI BOX - Uniform size for all metrics
// ══════════════════════════════════════════════════════════════════════════════
interface SmallKpiProps {
  label: string
  value: string
  sub?: string
  trend?: number
  borderColor: string
}

function SmallKpi({ label, value, sub, trend, borderColor }: SmallKpiProps) {
  return (
    <div className={`bg-card rounded-xl border-l-4 ${borderColor} border border-border p-4 flex flex-col justify-between h-[120px]`}>
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      <div className="flex items-center justify-between">
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
        {trend !== undefined && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            trend >= 0
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
          }`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PILAR CARD - Mini card for each pillar in sidebar summary
// ══════════════════════════════════════════════════════════════════════════════
interface PilarCardProps {
  label: string
  value: number
  color: string
  active?: boolean
  onClick: () => void
}

function PilarCard({ label, value, color, active, onClick }: PilarCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
        active
          ? "bg-card border-primary/30 shadow-sm"
          : "border-transparent hover:bg-card/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground font-mono">{formatNum(value)}</span>
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER - Consistent styling for each section
// ══════════════════════════════════════════════════════════════════════════════
interface SectionProps {
  title: string
  color: string
  badge?: string
  onViewMore?: () => void
  children: React.ReactNode
}

function Section({ title, color, badge, onViewMore, children }: SectionProps) {
  return (
    <section className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className={`h-1 ${color}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                {badge}
              </span>
            )}
          </div>
          {onViewMore && (
            <button
              onClick={onViewMore}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              Ver más <ArrowRight size={12} />
            </button>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN OVERVIEW DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  const { data: pedidos, isLoading: pLoad } = usePedidos()
  const { data: articulos, isLoading: aLoad } = useArticulos()
  const { data: revendedores, isLoading: rLoad } = useRevendedores()
  const { data: provincias, isLoading: provLoad } = useProvincias()
  const { data: stockTotal, isLoading: sTotalLoad } = useStockTotal()
  const [selectedRev, setSelectedRev] = useState<number | undefined>(undefined)
  const { data: stock, isLoading: sLoad } = useStock(selectedRev ?? null)
  
  const [period, setPeriod] = useState<Period>("año")
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  })

  const isLoading = pLoad || aLoad || (selectedRev !== undefined ? sLoad : false) || rLoad || provLoad

  // Current period pedidos
  const thisPeriod = useMemo(() => filterByPeriod(pedidos ?? [], period, range), [pedidos, period, range])
  const lastMes = useMemo(() => {
    const now = new Date()
    const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`
    return (pedidos ?? []).filter((p) => p.pov_fech && p.pov_fech.slice(0, 7) === lastMonth)
  }, [pedidos])

  // KPIs calculations
  const kpis = useMemo(() => {
    // Pedidos
    const totalPedidos = thisPeriod.length
    const montoMes = thisPeriod.reduce((s, p) => s + parseFloat(p.pov_monf || "0"), 0)
    const exportados = thisPeriod.filter((p) => p.ped_exp).length
    const pendientes = totalPedidos - exportados
    const ticketProm = totalPedidos > 0 ? montoMes / totalPedidos : 0
    const prevCount = lastMes.length || 1
    const trendPedidos = Math.round(((totalPedidos - prevCount) / prevCount) * 100)
    const montoLast = lastMes.reduce((s, p) => s + parseFloat(p.pov_monf || "0"), 0) || 1
    const trendMonto = Math.round(((montoMes - montoLast) / montoLast) * 100)
    const expLast = lastMes.filter((p) => p.ped_exp).length || 1
    const trendExp = Math.round(((exportados - expLast) / expLast) * 100)
    const pendLast = (lastMes.length - expLast) || 1
    const trendPend = Math.round(((pendientes - pendLast) / pendLast) * 100)

    // Articulos
    const totalArticulos = articulos?.length ?? 0
    const totalMarcas = new Set(articulos?.map((a) => a.mar_nomb)).size

    // Provincias
    const totalProvincias = provincias?.length ?? 0

    // Stock
    const totalStock = stock?.length ?? 0
    const disponibles = stock?.filter((s) => s.art_bdis === "S").length ?? 0
    const porcentajeDisp = totalStock > 0 ? Math.round((disponibles / totalStock) * 100) : 0

    // Revendedores
    const totalRev = revendedores?.length ?? 0
    const revActivos = revendedores?.filter((r) => r.rev_actv).length ?? 0

    return {
      totalPedidos, montoMes, exportados, pendientes, ticketProm,
      trendPedidos, trendMonto, trendExp, trendPend,
      totalArticulos, totalMarcas,
      totalProvincias,
      totalStock, disponibles, porcentajeDisp,
      totalRev, revActivos,
    }
  }, [thisPeriod, lastMes, articulos, stock, revendedores, provincias])

  // Chart data
  const marcaData = useMemo(() => countBy(thisPeriod, "mar_nomb").slice(0, 5), [thisPeriod])
  const financieraData = useMemo(() => countBy(thisPeriod, "pov_finu").slice(0, 4), [thisPeriod])

  // Recent pedidos
  const recentPedidos = useMemo(
    () => [...(pedidos ?? [])].sort((a, b) => b.pov_codi - a.pov_codi).slice(0, 10),
    [pedidos]
  )

  // Period label
  const periodLabel = useMemo(() => {
    const now = new Date()
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    if (period === "mes") return `${monthNames[now.getMonth()]} ${now.getFullYear()}`
    if (period === "dia") return now.toLocaleDateString("es-AR")
    if (period === "semana") return "esta semana"
    if (period === "año") return `${now.getFullYear()}`
    return ""
  }, [period])

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Resumen General</h1>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PILARES OVERVIEW - 4 cards in a row
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate("pedidos")}
          className="bg-card rounded-2xl border border-border p-5 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ShoppingCart size={20} className="text-orange-500" />
            </div>
            <div className="w-2 h-2 rounded-full bg-orange-400" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Pedidos</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatNum(kpis.totalPedidos)}</p>
          <p className="text-xs text-muted-foreground mt-2 group-hover:text-primary transition-colors">
            Ver detalle <ArrowRight size={10} className="inline ml-1" />
          </p>
        </button>

        <button
          onClick={() => onNavigate("provincias")}
          className="bg-card rounded-2xl border border-border p-5 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <MapPin size={20} className="text-pink-500" />
            </div>
            <div className="w-2 h-2 rounded-full bg-pink-400" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Puntos de Venta</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatNum(kpis.totalProvincias)}</p>
          <p className="text-xs text-muted-foreground mt-2 group-hover:text-primary transition-colors">
            Ver detalle <ArrowRight size={10} className="inline ml-1" />
          </p>
        </button>

        {selectedRev !== undefined ? (
          <button
            onClick={() => onNavigate("stock", { selectedRev })}
            className="bg-card rounded-2xl border border-border p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Boxes size={20} className="text-emerald-500" />
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Stock</p>
            <p className="text-3xl font-bold text-foreground mt-1">{formatNum(kpis.totalStock)}</p>
            <p className="text-xs text-muted-foreground mt-2 group-hover:text-primary transition-colors">
              Ver detalle <ArrowRight size={10} className="inline ml-1" />
            </p>
          </button>
        ) : (
          <button
            onClick={() => onNavigate("stock")}
            className="bg-card rounded-2xl border border-border p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Boxes size={20} className="text-emerald-500" />
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Stock</p>
            <p className="text-3xl font-bold text-foreground mt-1">{formatNum(stockTotal?.total ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-2 group-hover:text-primary transition-colors">
              Ver detalle <ArrowRight size={10} className="inline ml-1" />
            </p>
          </button>
        )}

        <button
          onClick={() => onNavigate("revendedores")}
          className="bg-card rounded-2xl border border-border p-5 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Users size={20} className="text-violet-500" />
            </div>
            <div className="w-2 h-2 rounded-full bg-violet-400" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Revendedores</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatNum(kpis.totalRev)}</p>
          <p className="text-xs text-muted-foreground mt-2 group-hover:text-primary transition-colors">
            Ver detalle <ArrowRight size={10} className="inline ml-1" />
          </p>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: PEDIDOS - Detailed metrics
         ═══════════════════════════════════════════════════════════════════════ */}
      <Section title="Pedidos" color="bg-orange-400" badge={formatNum(kpis.totalPedidos)} onViewMore={() => onNavigate("pedidos")}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SmallKpi
            label="Total pedidos"
            value={formatNum(kpis.totalPedidos)}
            sub="Este período"
            trend={kpis.trendPedidos}
            borderColor="border-l-orange-400"
          />
          <SmallKpi
            label="Monto Total Precio Lista"
            value={formatARS(kpis.montoMes)}
            sub="monto total"
            trend={kpis.trendMonto}
            borderColor="border-l-blue-400"
          />
          <SmallKpi
            label="Exportados"
            value={formatNum(kpis.exportados)}
            sub={`${kpis.totalPedidos > 0 ? Math.round((kpis.exportados / kpis.totalPedidos) * 100) : 0}% del total`}
            trend={kpis.trendExp}
            borderColor="border-l-emerald-400"
          />
          <SmallKpi
            label="Pendientes"
            value={formatNum(kpis.pendientes)}
            sub={`Monto prom. ${formatARS(kpis.ticketProm)}`}
            borderColor="border-l-amber-400"
          />
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: ANÁLISIS Y RESUMEN - Por marca, Revendedores
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por marca */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-1 bg-orange-400" />
          <div className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Por marca</h3>
            <p className="text-xs text-muted-foreground mb-4">Marcas seleccionadas en pedidos</p>
            <div className="space-y-3">
              {marcaData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 truncate">{item.name}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.value / (marcaData[0]?.value || 1)) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground w-8 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revendedores */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-1 bg-violet-400" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Revendedores</h3>
              <button
                onClick={() => onNavigate("revendedores")}
                className="text-xs text-primary hover:underline"
              >
                Ver más
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Users size={22} className="text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatNum(kpis.totalRev)}</p>
                <p className="text-xs text-muted-foreground">registrados</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatNum(kpis.revActivos)}</p>
                <p className="text-[10px] text-muted-foreground">activos</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatNum(kpis.totalRev - kpis.revActivos)}</p>
                <p className="text-[10px] text-muted-foreground">inactivos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: ÚLTIMOS PEDIDOS - Table
         ═══════════════════════════════════════════════════════════════════════ */}
      <ChartCard title="Últimos pedidos" subtitle="Los 10 más recientes del sistema" accentBar="bg-slate-400">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {["#", "Revendedor", "Cliente", "Artículo", "Fecha", "Precio Lista", "Importe Crédito", "Estado"].map((h) => (
                  <th key={h} className={`py-2.5 pr-3 text-muted-foreground font-medium ${["Precio Lista", "Importe Crédito", "Estado"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentPedidos.map((p) => (
                <tr key={p.pov_codi} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pr-3 text-muted-foreground font-mono">{p.pov_codi}</td>
                  <td className="py-2.5 pr-3 text-foreground font-medium truncate max-w-[120px]">{p.rev_nomb || "—"}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[100px]">{p.cli_nomb || "—"}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[120px]">{p.art_nomb || "—"}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{p.pov_fech}</td>
                  <td className="py-2.5 pr-3 text-right font-medium text-foreground">{formatARS(parseFloat(p.pov_monf || "0"))}</td>
                  <td className="py-2.5 pr-3 text-right font-medium text-foreground">{formatARS(parseFloat(p.pov_impc || "0"))}</td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                      p.ped_exp ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                               : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    }`}>
                      {p.ped_exp ? "Exportados" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
