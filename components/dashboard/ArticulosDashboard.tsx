"use client"

import { useState, useMemo } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts"
import { Package, Tag, Layers, Star } from "lucide-react"
import { useArticulos, usePedidos, countBy, formatNum, type Period, type DateRange } from "@/lib/api"
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
  const { data: pedidos } = usePedidos()
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

  // Artículos sin pedidos y con menos venta
  const noPedidosData = useMemo(() => {
    if (!articulos || !pedidos) return []
    const pedidosByArticle = new Map<string, number>()
    
    // Contar pedidos por nombre de artículo
    for (const p of pedidos) {
      const count = (pedidosByArticle.get(p.art_nomb || "") ?? 0) + 1
      pedidosByArticle.set(p.art_nomb || "", count)
    }
    
    // Encontrar artículos sin pedidos
    return articulos
      .filter(a => !pedidosByArticle.has(a.art_nomb))
      .map(a => ({
        name: a.art_nomb,
        value: 0,
        displayName: a.art_nomb.length > 30 ? a.art_nomb.substring(0, 27) + "..." : a.art_nomb
      }))
      .slice(0, 10)
  }, [articulos, pedidos])

  // Artículos con menos venta (5 o menos pedidos)
  const lowestSalesData = useMemo(() => {
    if (!articulos || !pedidos) return []
    const pedidosByArticle = new Map<string, { name: string; displayName: string; value: number }>()
    
    // Contar pedidos por nombre de artículo
    for (const a of articulos) {
      const count = pedidos.filter(p => p.art_nomb === a.art_nomb).length
      if (count > 0 && count <= 5) {
        pedidosByArticle.set(a.art_nomb, {
          name: a.art_nomb,
          displayName: a.art_nomb.length > 30 ? a.art_nomb.substring(0, 27) + "..." : a.art_nomb,
          value: count
        })
      }
    }
    
    // Ordenar por menos ventas
    return Array.from(pedidosByArticle.values())
      .sort((a, b) => a.value - b.value)
  }, [articulos, pedidos])

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
      >
        <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
      </SectionHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Artículos sin pedidos y con menos venta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Artículos sin pedidos */}
        <ChartCard title="Articulos sin pedidos" accentBar="bg-red-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Articulo</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Marca</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Rubro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {noPedidosData.length > 0 ? (
                  noPedidosData.map((item, idx) => {
                    const art = articulos?.find(a => a.art_nomb === item.name)
                    return (
                      <tr key={idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 pr-4 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2 pr-4 text-foreground font-medium truncate max-w-[200px]">{item.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{art?.mar_nomb || "—"}</td>
                        <td className="py-2 text-muted-foreground">{art?.rub_nomb || "—"}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground text-xs">
                      No hay motos sin pedidos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {noPedidosData.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
              Total: {formatNum(noPedidosData.length)} motos sin pedidos
            </p>
          )}
        </ChartCard>

        {/* Artículos con menos venta */}
        <ChartCard title="Motos con menos venta" accentBar="bg-amber-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Moto</th>
                  <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Pedidos</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Marca</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Rubro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lowestSalesData.length > 0 ? (
                  lowestSalesData.map((item, idx) => {
                    const art = articulos?.find(a => a.art_nomb === item.name)
                    return (
                      <tr key={idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 pr-4 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2 pr-4 text-foreground font-medium truncate max-w-[180px]">{item.name}</td>
                        <td className="py-2 pr-4 text-right font-medium text-foreground">{formatNum(item.value)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{art?.mar_nomb || "—"}</td>
                        <td className="py-2 text-muted-foreground">{art?.rub_nomb || "—"}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">
                      No hay datos de motos con ventas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {lowestSalesData.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
              Mostrando las {formatNum(lowestSalesData.length)} motos con menos venta
            </p>
          )}
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
