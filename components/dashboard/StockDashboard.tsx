"use client"

import { useMemo, useState } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts"
import { Boxes, CheckSquare, Activity } from "lucide-react"
import { useStock, useRevendedores, formatNum, type Period, type DateRange } from "@/lib/api"
import {
  SectionHeader, PeriodTabs, ChartTypeSwitcher, KpiCard,
  ChartCard, SkeletonCard, SkeletonChart, COLORS,
  type ChartType,
} from "./shared"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{formatNum(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function StockDashboard({ initialSelectedRev }: { initialSelectedRev?: number | null }) {
  const { data: revendedores } = useRevendedores()
  const [selectedRev, setSelectedRev] = useState<number | null>(initialSelectedRev ?? null)
  const [destChart, setDestChart] = useState<ChartType>("pie")
  const [period, setPeriod] = useState<Period>("año")
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  })

  // Pasar rev_codi a la API - ella maneja el filtrado
  const { data: stock, isLoading } = useStock(selectedRev)

  const filteredStock = useMemo(() => {
    if (!stock) return []

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    return stock.filter((s) => {
      if (!s.stk_fcre) return true
      const d = s.stk_fcre.slice(0, 10)
      
      if (period === "dia") return d === todayStr
      if (period === "semana") {
        const dow = now.getDay()
        const diff = now.getDate() - dow + (dow === 0 ? -6 : 1)
        const weekStart = new Date(new Date(now).setDate(diff)).toISOString().slice(0, 10)
        return d >= weekStart && d <= todayStr
      }
      if (period === "mes") return d.slice(0, 7) === todayStr.slice(0, 7)
      if (period === "año") return d.slice(0, 4) === todayStr.slice(0, 4)
      if (period === "rango" && range) return d >= range.from && d <= range.to
      return true
    })
  }, [stock, period, range])

  const kpis = useMemo(() => {
    const total = filteredStock?.length ?? 0
    const disponibles = filteredStock?.filter((s) => !s.art_bdis || s.art_bdis === "").length ?? 0
    const usados = filteredStock?.filter((s) => s.art_usad !== null && s.art_usad !== "").length ?? 0
    
    // Para TODOS: artículos únicos y variantes
    const uniqueArticles = new Set(filteredStock?.map(s => s.art_codi))
    const uniqueVariants = new Set(filteredStock?.map(s => s.col_codi))
    
    return { 
      total, 
      disponibles, 
      usados,
      uniqueArticles: uniqueArticles.size,
      uniqueVariants: uniqueVariants.size,
    }
  }, [filteredStock])

  // Group by disponibilidad
  const destinoData = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of filteredStock ?? []) {
      const k = s.art_bdis === "S" || s.art_bdis === null ? "Disponible" : "No disponible"
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [filteredStock])

  // Monthly ingress
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of filteredStock ?? []) {
      const key = s.stk_fcre?.slice(0, 7) ?? "?"
      if (key !== "?") map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([date, cantidad]) => ({ date, cantidad }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
  }, [filteredStock])

  // Usados vs nuevos by month
  const usadoData = useMemo(() => {
    const map = new Map<string, { nuevos: number; usados: number }>()
    for (const s of filteredStock ?? []) {
      const key = s.stk_fcre?.slice(0, 7) ?? "?"
      if (key === "?") continue
      const prev = map.get(key) ?? { nuevos: 0, usados: 0 }
      if (s.art_usad) {
        map.set(key, { ...prev, usados: prev.usados + 1 })
      } else {
        map.set(key, { ...prev, nuevos: prev.nuevos + 1 })
      }
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12)
  }, [filteredStock])

  // Top 10 artículos más en stock (para TODOS)
  const topArticlesData = useMemo(() => {
    const map = new Map<number, { artCodi: number; artNmot: string; cantidad: number }>()
    for (const s of filteredStock ?? []) {
      // Solo contar artículos disponibles (art_bdis vacío o null)
      if (s.art_bdis && s.art_bdis !== "") continue
      
      const key = s.art_codi
      const prev = map.get(key) ?? { artCodi: key, artNmot: s.art_nomb || "?", cantidad: 0 }
      map.set(key, { ...prev, cantidad: prev.cantidad + 1 })
    }
    return Array.from(map.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [filteredStock])

  // Top 10 colores más comunes (para TODOS)
  const topColorsData = useMemo(() => {
    const map = new Map<number, { colCodi: number; colNomb: string; cantidad: number }>()
    for (const s of filteredStock ?? []) {
      // Solo contar artículos disponibles (art_bdis vacío o null)
      if (s.art_bdis && s.art_bdis !== "") continue
      // Solo contar si tiene color válido
      if (!s.col_codi) continue
      
      const key = s.col_codi
      const prev = map.get(key) ?? { colCodi: key, colNomb: s.col_nomb || "?", cantidad: 0 }
      map.set(key, { ...prev, cantidad: prev.cantidad + 1 })
    }
    return Array.from(map.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
      .map((item, i) => ({ ...item, name: item.colNomb, value: item.cantidad }))
  }, [filteredStock])

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonChart key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <SectionHeader
        icon={Boxes}
        iconColor="bg-emerald-500"
        title="Stock"
        subtitle="Estado del inventario web en tiempo real"
      >
        <div className="flex items-center gap-4 flex-wrap">
          {selectedRev !== null && (
            <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRev(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                selectedRev === null
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "border-border hover:bg-accent"
              }`}
            >
              Todos
            </button>
            <Select value={selectedRev ? selectedRev.toString() : ""} onValueChange={(val) => setSelectedRev(parseInt(val))}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Revendedor..." />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                {revendedores?.map((rev) => (
                  <SelectItem key={rev.rev_codi} value={rev.rev_codi.toString()}>
                    {rev.rev_nomb}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionHeader>

      {/* KPIs */}
      {selectedRev === null ? (
        // TODOS: Total unidades + Disponibles
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <KpiCard
            label="Total unidades"
            value={formatNum(kpis.total)}
            sub="en todo el stock"
            accent="border-l-4 border-l-emerald-400"
            icon={Boxes}
            iconBg="bg-emerald-50 dark:bg-emerald-950"
          />
          <KpiCard
            label="Unidades disponibles"
            value={formatNum(kpis.disponibles)}
            sub={`${kpis.total > 0 ? Math.round((kpis.disponibles / kpis.total) * 100) : 0}% del total`}
            accent="border-l-4 border-l-sky-400"
            icon={CheckSquare}
            iconBg="bg-sky-50 dark:bg-sky-950"
          />
        </div>
      ) : (
        // REVENDEDOR: Solo Total unidades
        <div className="grid grid-cols-1 gap-4">
          <KpiCard
            label="Total unidades disponibles"
            value={formatNum(kpis.total)}
            sub="en stock"
            accent="border-l-4 border-l-emerald-400"
            icon={Boxes}
            iconBg="bg-emerald-50 dark:bg-emerald-950"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {selectedRev === null ? (
          <>
            {/* Top 10 artículos - COMENTADO POR AHORA */}
            {false && (
              <ChartCard title="Top 10 artículos más en stock" accentBar="bg-emerald-400">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topArticlesData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 80 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="artNmot"
                      tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={150}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" name="unidades" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Top 10 colores - COMENTADO POR AHORA */}
            {false && (
              <ChartCard title="Top 10 colores más comunes" accentBar="bg-sky-400">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topColorsData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 80 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="unidades" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Tabla de artículos */}
            <ChartCard title="Ranking de artículos" accentBar="bg-amber-400">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2.5 pr-3 text-left text-muted-foreground font-medium">#</th>
                      <th className="py-2.5 pr-3 text-left text-muted-foreground font-medium">Artículo</th>
                      <th className="py-2.5 text-right text-muted-foreground font-medium">Unidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topArticlesData.map((item, idx) => (
                      <tr key={item.artCodi} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 pr-3 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2.5 pr-3 text-foreground font-medium truncate">{item.artNmot}</td>
                        <td className="py-2.5 text-right font-medium text-foreground">{formatNum(item.cantidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </>
        ) : (
          <>
            {/* Top artículos del revendedor */}
            <ChartCard title="Algunos artículos en stock" accentBar="bg-emerald-400">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topArticlesData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 80 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="artNmot"
                    tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={150}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cantidad" name="unidades" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {/* Ingreso mensual (solo cuando hay revendedor seleccionado) */}
        {selectedRev !== null && (
          <ChartCard title="Ingreso de unidades al stock por mes" accentBar="bg-amber-400">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cantidad" name="unidades" stroke={COLORS[2]} strokeWidth={2.5} dot={{ r: 3, fill: COLORS[2] }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  )
}
