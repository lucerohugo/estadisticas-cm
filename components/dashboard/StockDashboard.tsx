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

export function StockDashboard() {
  const { data: revendedores } = useRevendedores()
  const [selectedRev, setSelectedRev] = useState<number | null>(null)
  const [destChart, setDestChart] = useState<ChartType>("pie")
  const [period, setPeriod] = useState<Period>("mes")
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
    const disponibles = filteredStock?.filter((s) => s.art_bdis === "S" || s.art_bdis === null).length ?? 0
    const usados = filteredStock?.filter((s) => s.art_usad !== null && s.art_usad !== "").length ?? 0
    return { total, disponibles, usados }
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
      />

      {/* Controles: Período + Revendedor */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
        
        <div className="w-full md:w-96 space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Filtrar por revendedor:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRev(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-colors font-medium ${
                selectedRev === null
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "border-border hover:bg-accent"
              }`}
            >
              Todos
            </button>
            <Select value={selectedRev ? selectedRev.toString() : ""} onValueChange={(val) => setSelectedRev(parseInt(val))}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar revendedor..." />
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total unidades"
          value={formatNum(kpis.total)}
          sub="en sistema"
          accent="border-l-4 border-l-emerald-400"
          icon={Boxes}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <KpiCard
          label="Disponibles"
          value={formatNum(kpis.disponibles)}
          sub={`${kpis.total > 0 ? Math.round((kpis.disponibles / kpis.total) * 100) : 0}% del stock`}
          accent="border-l-4 border-l-sky-400"
          icon={CheckSquare}
          iconBg="bg-sky-50 dark:bg-sky-950"
        />
        <KpiCard
          label="Usado o Nuevo"
          value={formatNum(kpis.usados)}
          sub="con historial de uso"
          accent="border-l-4 border-l-amber-400"
          icon={Activity}
          iconBg="bg-amber-50 dark:bg-amber-950"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disponibilidad donut */}
        <ChartCard
          title="Estado de disponibilidad"
          accentBar="bg-emerald-400"
          toolbar={
            <ChartTypeSwitcher
              value={destChart}
              onChange={setDestChart}
              options={["pie", "bar"]}
            />
          }
        >
          {destChart === "pie" ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={destinoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill={COLORS[2]} />
                  <Cell fill={COLORS[5]} />
                  <Cell fill={COLORS[3]} />
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={destinoData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="unidades" radius={[4, 4, 0, 0]}>
                  <Cell fill={COLORS[2]} />
                  <Cell fill={COLORS[5]} />
                  <Cell fill={COLORS[3]} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Nuevos vs usados stacked */}
        <ChartCard title="Nuevos vs. usados por mes" accentBar="bg-sky-400">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={usadoData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="nuevos" name="Nuevos" stackId="a" fill={COLORS[2]} />
              <Bar dataKey="usados" name="Usados" stackId="a" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Ingreso mensual */}
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
    </div>
  )
}
