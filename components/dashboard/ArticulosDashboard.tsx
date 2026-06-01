"use client"

import { useState, useMemo } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts"
import { Package, Tag, Layers, Star } from "lucide-react"
import { useArticulos, countBy, formatNum, type Period, type DateRange } from "@/lib/api"
import {
  SectionHeader, PeriodTabs, ChartTypeSwitcher, KpiCard,
  ChartCard, SkeletonCard, SkeletonChart, COLORS,
  type ChartType,
} from "./shared"

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

export function ArticulosDashboard() {
  const { data: articulos, isLoading } = useArticulos()
  const [marcaChart, setMarcaChart] = useState<ChartType>("bar")
  const [rubroChart, setRubroChart] = useState<ChartType>("pie")
  const [period, setPeriod] = useState<Period>("año")
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  })

  const filteredArticulos = useMemo(() => {
    if (!articulos) return []

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    return articulos.filter((a) => {
      if (!a.art_fchc) return true
      const d = a.art_fchc.slice(0, 10)
      
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
  }, [articulos, period, range])

  const kpis = useMemo(() => {
    const total = filteredArticulos?.length ?? 0
    const marcas = new Set(filteredArticulos?.map((a) => a.mar_nomb)).size
    const rubros = new Set(filteredArticulos?.map((a) => a.rub_nomb)).size
    const conPrecio = filteredArticulos?.filter((a) => parseFloat(a.art_prec || "0") > 0).length ?? 0
    return { total, marcas, rubros, conPrecio }
  }, [filteredArticulos])

  const marcaData = useMemo(() => countBy(filteredArticulos ?? [], "mar_nomb").slice(0, 10), [filteredArticulos])
  const rubroData = useMemo(() => countBy(filteredArticulos ?? [], "rub_nomb").slice(0, 8), [filteredArticulos])
  const subrubroData = useMemo(() => countBy(filteredArticulos ?? [], "sru_nomb").slice(0, 8), [filteredArticulos])

  // Monthly additions (by art_fchc)
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of filteredArticulos ?? []) {
      const key = a.art_fchc?.slice(0, 7) ?? "?"
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([date, cantidad]) => ({ date, cantidad }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12)
  }, [articulos])

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
        icon={Package}
        iconColor="bg-sky-500"
        title="Artículos"
        subtitle={`Catálogo completo de productos`}
      />

      {/* Controles: Período */}
      <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total artículos"
          value={formatNum(kpis.total)}
          sub="en catálogo"
          accent="border-l-4 border-l-sky-400"
          icon={Package}
          iconBg="bg-sky-50 dark:bg-sky-950"
        />
        <KpiCard
          label="Marcas"
          value={formatNum(kpis.marcas)}
          sub="marcas distintas"
          accent="border-l-4 border-l-orange-400"
          icon={Tag}
          iconBg="bg-orange-50 dark:bg-orange-950"
        />
        <KpiCard
          label="Rubros"
          value={formatNum(kpis.rubros)}
          sub="categorías"
          accent="border-l-4 border-l-emerald-400"
          icon={Layers}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <KpiCard
          label="Con precio"
          value={`${kpis.total > 0 ? Math.round((kpis.conPrecio / kpis.total) * 100) : 0}%`}
          sub={`${formatNum(kpis.conPrecio)} artículos`}
          accent="border-l-4 border-l-violet-400"
          icon={Star}
          iconBg="bg-violet-50 dark:bg-violet-950"
        />
      </div>

      {/* Marcas */}
      <ChartCard
        title="Artículos por marca"
        accentBar="bg-sky-400"
        toolbar={
          <ChartTypeSwitcher
            value={marcaChart}
            onChange={setMarcaChart}
            options={["bar", "pie"]}
          />
        }
      >
        {marcaChart === "bar" ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={marcaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="artículos" radius={[4, 4, 0, 0]}>
                {marcaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={marcaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={2}>
                {marcaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatNum(Number(v))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rubros */}
        <ChartCard
          title="Distribución por rubro"
          accentBar="bg-orange-400"
          toolbar={
            <ChartTypeSwitcher
              value={rubroChart}
              onChange={setRubroChart}
              options={["pie", "bar"]}
            />
          }
        >
          {rubroChart === "pie" ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={rubroData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35} paddingAngle={3}>
                  {rubroData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={rubroData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="artículos" radius={[0, 4, 4, 0]}>
                  {rubroData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Sub-rubros */}
        <ChartCard title="Top sub-rubros" accentBar="bg-emerald-400">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={subrubroData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="artículos" radius={[0, 4, 4, 0]}>
                {subrubroData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Alta mensual */}
      <ChartCard title="Alta de artículos por mes" accentBar="bg-violet-400">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-arts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cantidad" name="alta" stroke={COLORS[1]} strokeWidth={2.5} fill="url(#grad-arts)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
