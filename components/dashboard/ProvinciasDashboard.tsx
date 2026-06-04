"use client"

import { useState, useMemo } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import { MapPin, TrendingUp, Package } from "lucide-react"
import {
  useProvincias, useLocalidades, useRevendedores, usePedidos,
  filterByPeriod, formatNum, type Period, type DateRange,
} from "@/lib/api"
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

export function ProvinciasDashboard() {
  const { data: provincias, isLoading: prov_loading } = useProvincias()
  const { data: localidades, isLoading: loc_loading } = useLocalidades()
  const { data: revendedores, isLoading: rev_loading } = useRevendedores()
  const { data: pedidos, isLoading: ped_loading } = usePedidos()
  const [period, setPeriod] = useState<Period>("año")
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  })
  const [mayorVentaChart, setMayorVentaChart] = useState<ChartType>("bar")
  const [menorVentaChart, setMenorVentaChart] = useState<ChartType>("bar")

  const isLoading = prov_loading || loc_loading || rev_loading || ped_loading

  // Filtrar pedidos por periodo
  const filteredPedidos = useMemo(
    () => filterByPeriod(pedidos ?? [], period, range),
    [pedidos, period, range]
  )

  // Crear mapa de loc_codi -> pci_codi (localidad -> provincia)
  const locToProvinceMap = useMemo(() => {
    const map = new Map<number, number>()
    if (localidades) {
      localidades.forEach((loc) => {
        map.set(loc.loc_codi, loc.pci_codi)
      })
    }
    return map
  }, [localidades])

  // Crear mapa de pci_codi -> pci_nomb (provincia)
  const provinceNameMap = useMemo(() => {
    const map = new Map<number, string>()
    if (provincias) {
      provincias.forEach((prov) => {
        map.set(prov.pci_codi, prov.pci_nomb)
      })
    }
    return map
  }, [provincias])

  // Crear mapa de loc_codi -> loc_nomb (localidad)
  const locNameMap = useMemo(() => {
    const map = new Map<number, string>()
    if (localidades) {
      localidades.forEach((loc) => {
        map.set(loc.loc_codi, loc.loc_nomb)
      })
    }
    return map
  }, [localidades])

  // Contar pedidos por provincia + localidad
  const salesByProvince = useMemo(() => {
    const counts = new Map<string, { pciCode: number; locCode: number; value: number }>()

    if (filteredPedidos && revendedores) {
      // Crear mapa de rev_codi -> loc_codi
      const revToLocMap = new Map<number, number>()
      revendedores.forEach((rev) => {
        if (rev.loc_codi !== null && rev.loc_codi !== undefined) {
          revToLocMap.set(rev.rev_codi, rev.loc_codi)
        }
      })

      // Contar pedidos por provincia + localidad
      filteredPedidos.forEach((p) => {
        const revCode = p.rev_codi
        const locCode = revToLocMap.get(revCode)
        if (locCode !== undefined) {
          const pciCode = locToProvinceMap.get(locCode)
          if (pciCode !== undefined) {
            const key = `${pciCode}-${locCode}`
            const current = counts.get(key) || { pciCode, locCode, value: 0 }
            counts.set(key, { ...current, value: current.value + 1 })
          }
        }
      })
    }

    // Convertir a array con nombres de provincias y localidades
    return Array.from(counts.values())
      .map((item) => ({
        ...item,
        name: `${provinceNameMap.get(item.pciCode) || `Provincia ${item.pciCode}`} - ${locNameMap.get(item.locCode) || `Localidad ${item.locCode}`}`,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPedidos, revendedores, locToProvinceMap, provinceNameMap, locNameMap])

  // Datos para gráfico de menor venta (todas, ordenadas de menor a mayor)
  const lowestSalesData = useMemo(() => {
    if (salesByProvince.length === 0) return []
    return [...salesByProvince].reverse()
  }, [salesByProvince])

  // KPIs
  const kpis = useMemo(() => {
    const totalProvincias = provincias?.length ?? 0
    const provinciasConVentas = salesByProvince.length
    const topProvince = salesByProvince[0] || { name: "—", value: 0 }
    const lowestProvince = salesByProvince[salesByProvince.length - 1] || { name: "—", value: 0 }
    const totalVentas = salesByProvince.reduce((sum, p) => sum + p.value, 0)

    return {
      totalProvincias,
      provinciasConVentas,
      topProvince,
      lowestProvince,
      totalVentas,
    }
  }, [provincias, salesByProvince])

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <SkeletonChart key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <SectionHeader
        icon={MapPin}
        iconColor="bg-pink-500"
        title="Provincias"
        subtitle={`Análisis de ventas por región — ${formatNum(kpis.totalProvincias)} provincias registradas`}
      >
        <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
      </SectionHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total provincias"
          value={formatNum(kpis.totalProvincias)}
          sub="registradas"
          accent="border-l-4 border-l-pink-400"
          icon={MapPin}
          iconBg="bg-pink-50 dark:bg-pink-950"
        />
        <KpiCard
          label="Con ventas"
          value={formatNum(kpis.provinciasConVentas)}
          sub={`${kpis.totalProvincias > 0 ? Math.round((kpis.provinciasConVentas / kpis.totalProvincias) * 100) : 0}% del total`}
          accent="border-l-4 border-l-emerald-400"
          icon={TrendingUp}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <KpiCard
          label="Top provincia"
          value={kpis.topProvince.name}
          sub={`${formatNum(kpis.topProvince.value)} pedidos`}
          accent="border-l-4 border-l-blue-400"
          icon={Package}
          iconBg="bg-blue-50 dark:bg-blue-950"
        />
        <KpiCard
          label="Menor venta"
          value={kpis.lowestProvince.name}
          sub={`${formatNum(kpis.lowestProvince.value)} pedidos`}
          accent="border-l-4 border-l-amber-400"
          icon={Package}
          iconBg="bg-amber-50 dark:bg-amber-950"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mayor Venta */}
        <ChartCard
          title="Mayor Venta por provincia"
          accentBar="bg-pink-400"
          toolbar={
            <ChartTypeSwitcher
              value={mayorVentaChart}
              onChange={setMayorVentaChart}
              options={["bar", "pie"]}
            />
          }
        >
          {mayorVentaChart === "bar" ? (
            <ResponsiveContainer width="100%" height={Math.max(300, salesByProvince.length * 35)}>
              <BarChart
                data={salesByProvince}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesByProvince}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {salesByProvince.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Menor Venta */}
        <ChartCard
          title="Menor venta por provincia"
          accentBar="bg-cyan-400"
          toolbar={
            <ChartTypeSwitcher
              value={menorVentaChart}
              onChange={setMenorVentaChart}
              options={["bar", "pie"]}
            />
          }
        >
          {menorVentaChart === "bar" ? (
            <ResponsiveContainer width="100%" height={Math.max(300, lowestSalesData.length * 35)}>
              <BarChart
                data={lowestSalesData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={lowestSalesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {lowestSalesData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tabla detallada */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-1 bg-pink-400" />
        <div className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ranking de provincias</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 pr-4 text-left text-muted-foreground font-medium">Posición</th>
                  <th className="py-2.5 pr-4 text-left text-muted-foreground font-medium">Provincia - Localidad</th>
                  <th className="py-2.5 pr-4 text-right text-muted-foreground font-medium">Pedidos</th>
                  <th className="py-2.5 text-right text-muted-foreground font-medium">% del total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salesByProvince.map((prov, i) => (
                  <tr key={`${prov.pciCode}-${prov.locCode}`} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4 text-muted-foreground font-mono">#{i + 1}</td>
                    <td className="py-3 pr-4 text-foreground font-medium">{prov.name}</td>
                    <td className="py-3 pr-4 text-right font-medium text-foreground">{formatNum(prov.value)}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                        {kpis.totalVentas > 0
                          ? ((prov.value / kpis.totalVentas) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
