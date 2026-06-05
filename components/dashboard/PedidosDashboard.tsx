"use client"

import { useState, useMemo } from "react"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import { ShoppingCart, TrendingUp, CheckCircle, Clock } from "lucide-react"
import {
  usePedidos, useLocalidades, useProvincias, useRevendedores, filterByPeriod, groupPedidosByDate,
  countBy, formatARS, formatNum,
  type Period, type DateRange,
} from "@/lib/api"
import {
  SectionHeader, PeriodTabs, ChartTypeSwitcher, KpiCard,
  ChartCard, InsightCard, SkeletonCard, SkeletonChart, COLORS,
  type ChartType,
} from "./shared"

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  // Para mostrar el nombre original completo en revendedores
  const fullName = payload[0]?.payload?.name || label
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{fullName}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {p.name === "monto" ? formatARS(p.value) : formatNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PedidosDashboard() {
  const { data: pedidos, isLoading } = usePedidos()
  const { data: localidades } = useLocalidades()
  const { data: provincias } = useProvincias()
  const { data: revendedores } = useRevendedores()
  const [period, setPeriod] = useState<Period>("año")
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  })
  const [chartType, setChartType] = useState<ChartType>("area")
  const [marcaChartType, setMarcaChartType] = useState<ChartType>("bar")
  const [revChartType, setRevChartType] = useState<ChartType>("bar")
  const [finChartType, setFinChartType] = useState<ChartType>("pie")
  const [colorChartType, setColorChartType] = useState<ChartType>("pie")

  const filtered = useMemo(
    () => filterByPeriod(pedidos ?? [], period, range),
    [pedidos, period, range]
  )

  const kpis = useMemo(() => {
    const total = filtered.length
    const monto = filtered.reduce((s, p) => s + parseFloat(p.pov_monf || "0"), 0)
    const exportados = filtered.filter((p) => p.ped_exp).length
    const pendientes = total - exportados
    const ticketProm = filtered.length > 0 ? monto / filtered.length : 0
    return { total, monto, exportados, pendientes, ticketProm }
  }, [filtered])

  const timelineData = useMemo(() => groupPedidosByDate(filtered), [filtered])
  const marcaData = useMemo(() => countBy(filtered, "mar_nomb").slice(0, 8), [filtered])
  const revData = useMemo(() => countBy(filtered, "rev_nomb").slice(0, 8).map(item => ({
    ...item,
    displayName: item.name.length > 28 ? item.name.substring(0, 25) + "..." : item.name
  })), [filtered])
  const financieraData = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const p of filtered) {
      // Combinar com_letr y com_nomb: "A - FACTURA"
      const key = p.com_letr && p.com_nomb ? `${p.com_letr} - ${p.com_nomb}` : (p.com_nomb || "Sin dato")
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [filtered])
  const colorData = useMemo(() => countBy(filtered, "col_nomb").slice(0, 6), [filtered])
  const modeloData = useMemo(() => countBy(filtered, "art_nomb").slice(0, 8), [filtered])

  // Mapeos para provincias
  const locToProvinceMap = useMemo(() => {
    const map = new Map<number, number>()
    if (localidades) {
      localidades.forEach((loc) => {
        map.set(loc.loc_codi, loc.pci_codi)
      })
    }
    return map
  }, [localidades])

  const provinceNameMap = useMemo(() => {
    const map = new Map<number, string>()
    if (provincias) {
      provincias.forEach((prov) => {
        map.set(prov.pci_codi, prov.pci_nomb)
      })
    }
    return map
  }, [provincias])

  const locNameMap = useMemo(() => {
    const map = new Map<number, string>()
    if (localidades) {
      localidades.forEach((loc) => {
        map.set(loc.loc_codi, loc.loc_nomb)
      })
    }
    return map
  }, [localidades])

  // Calcular provincia + localidad con más ventas
  const topProvince = useMemo(() => {
    if (!filtered.length || !revendedores) return null
    const provinceLocCounts = new Map<string, { pciCode: number; locCode: number; value: number }>()
    const revToLocMap = new Map<number, number>()

    revendedores.forEach((rev) => {
      if (rev.loc_codi !== null && rev.loc_codi !== undefined) {
        revToLocMap.set(rev.rev_codi, rev.loc_codi)
      }
    })

    filtered.forEach((p) => {
      const locCode = revToLocMap.get(p.rev_codi)
      if (locCode !== undefined) {
        const pciCode = locToProvinceMap.get(locCode)
        if (pciCode !== undefined) {
          const key = `${pciCode}-${locCode}`
          const current = provinceLocCounts.get(key) || { pciCode, locCode, value: 0 }
          provinceLocCounts.set(key, { ...current, value: current.value + 1 })
        }
      }
    })

    const entries = Array.from(provinceLocCounts.values())
    const maxEntry = entries.length > 0 ? entries.reduce((max, current) => (current.value > max.value ? current : max)) : null

    if (!maxEntry) return null
    return {
      name: `${provinceNameMap.get(maxEntry.pciCode) || `Provincia ${maxEntry.pciCode}`} - ${locNameMap.get(maxEntry.locCode) || `Localidad ${maxEntry.locCode}`}`,
      value: maxEntry.value,
    }
  }, [filtered, revendedores, locToProvinceMap, provinceNameMap, locNameMap])

  const recentPedidos = useMemo(
    () => [...(pedidos ?? [])].sort((a, b) => b.pov_codi - a.pov_codi).slice(0, 10),
    [pedidos]
  )

  // AI insights for pedidos
  const insights = useMemo(() => {
    if (!filtered.length) return ["No hay pedidos en el período seleccionado para analizar."]
    const list: string[] = []
    const topMarca = marcaData[0]
    const topRev = revData[0]
    if (topMarca) list.push(`La marca más vendida es ${topMarca.name} con ${topMarca.value} pedidos (${Math.round((topMarca.value / filtered.length) * 100)}% del período).`)
    if (topRev) list.push(`El revendedor con más pedidos es ${topRev.name} con ${topRev.value} pedidos.`)
    if (topProvince) list.push(`La provincia con más ventas es ${topProvince.name}  -  (${Math.round((topProvince.value / filtered.length) * 100)}% del período).`)
    const pctExp = filtered.length > 0 ? Math.round((kpis.exportados / filtered.length) * 100) : 0
    if (pctExp < 60) list.push(`Solo el ${pctExp}% de los pedidos fueron exportados — posible cuello de botella en despacho.`)
    else list.push(`El ${pctExp}% de los pedidos están exportados.`)
    list.push(`Monto promedio pendiente: ${formatARS(kpis.ticketProm)}.`)
    return list
  }, [filtered, marcaData, revData, kpis, topProvince])

  const periodLabel = useMemo(() => {
    if (period === "dia") return "Hoy"
    if (period === "semana") return "Esta semana"
    if (period === "mes") return "Este mes"
    if (period === "año") return "Este año"
    if (period === "rango") return `${range.from} → ${range.to}`
    return ""
  }, [period, range])

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
        icon={ShoppingCart}
        iconColor="bg-orange-500"
        title="Pedidos"
        subtitle={`${formatNum(pedidos?.length ?? 0)} pedidos totales en sistema`}
        badge={`${formatNum(kpis.total)} en período`}
      >
        <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
      </SectionHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total pedidos"
          value={formatNum(kpis.total)}
          sub={periodLabel}
          accent="border-l-4 border-l-orange-400"
          icon={ShoppingCart}
          iconBg="bg-orange-50 dark:bg-orange-950"
        />
        <KpiCard
          label="Monto Total Precio Lista"
          value={formatARS(kpis.monto)}
          sub="Precio lista"
          accent="border-l-4 border-l-blue-400"
          icon={TrendingUp}
          iconBg="bg-blue-50 dark:bg-blue-950"
        />
        <KpiCard
          label="Exportados"
          value={formatNum(kpis.exportados)}
          sub={`${kpis.total > 0 ? Math.round((kpis.exportados / kpis.total) * 100) : 0}% del total`}
          accent="border-l-4 border-l-emerald-400"
          icon={CheckCircle}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <KpiCard
          label="Pendientes"
          value={formatNum(kpis.pendientes)}
          sub={`Monto prom. ${formatARS(kpis.ticketProm)}`}
          accent="border-l-4 border-l-amber-400"
          icon={Clock}
          iconBg="bg-amber-50 dark:bg-amber-950"
        />
      </div>

      {/* AI Insights */}
      <InsightCard insights={insights} title="Insights IA — Pedidos" />

      {/* Timeline chart */}
      <ChartCard
        title="Evolución de pedidos"
        subtitle={`Pedidos por día — ${periodLabel}`}
        accentBar="bg-orange-400"
        toolbar={
          <ChartTypeSwitcher
            value={chartType}
            onChange={setChartType}
            options={["area", "bar", "line"]}
          />
        }
      >
        <ResponsiveContainer width="100%" height={250}>
          {chartType === "bar" ? (
            <BarChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cantidad" name="pedidos" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="cantidad" name="pedidos" stroke={COLORS[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="monto" name="monto" stroke={COLORS[1]} strokeWidth={1.5} dot={false} strokeDasharray="4 2" activeDot={{ r: 4 }} />
            </LineChart>
          ) : (
            <AreaChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-ped" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cantidad" name="pedidos" stroke={COLORS[0]} strokeWidth={2.5} fill="url(#grad-ped)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 2: Marca + Revendedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Pedidos por marca"
          accentBar="bg-sky-400"
          toolbar={<ChartTypeSwitcher value={marcaChartType} onChange={setMarcaChartType} options={["bar", "pie"]} />}
        >
          {marcaChartType === "bar" ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={marcaData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" radius={[0, 4, 4, 0]}>
                  {marcaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={marcaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={3}>
                  {marcaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top revendedores"
          accentBar="bg-emerald-400"
          toolbar={<ChartTypeSwitcher value={revChartType} onChange={setRevChartType} options={["bar", "pie"]} />}
        >
          {revChartType === "bar" ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={revData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="displayName" width={150} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" radius={[0, 4, 4, 0]}>
                  {revData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={revData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={3}>
                  {revData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Financieras + Top modelos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Comprobantes"
          accentBar="bg-violet-400"
          toolbar={<ChartTypeSwitcher value={finChartType} onChange={setFinChartType} options={["pie", "bar"]} />}
        >
          {finChartType === "pie" ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={financieraData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={3}>
                  {financieraData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={financieraData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" radius={[4, 4, 0, 0]}>
                  {financieraData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard 
          title="Colores más pedidos" 
          accentBar="bg-amber-400"
          toolbar={<ChartTypeSwitcher value={colorChartType} onChange={setColorChartType} options={["pie", "bar"]} />}
        >
          <ResponsiveContainer width="100%" height={230}>
            {colorChartType === "pie" ? (
              <PieChart>
                <Pie data={colorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35} paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {colorData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
              </PieChart>
            ) : (
              <BarChart data={colorData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" radius={[0, 4, 4, 0]}>
                  {colorData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top modelos */}
      <ChartCard title="Top modelos más pedidos" subtitle="Por nombre de artículo" accentBar="bg-cyan-400">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={modeloData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="pedidos" radius={[0, 4, 4, 0]}>
              {modeloData.map((_, i) => <Cell key={i} fill={COLORS[(i + 6) % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Recent pedidos table */}
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
