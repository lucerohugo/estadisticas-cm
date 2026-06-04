"use client"

import { useMemo, useState } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import { Users, UserCheck, UserX, MapPin } from "lucide-react"
import { useRevendedores, usePedidos, countBy, filterByPeriod, formatNum, type Period, type DateRange } from "@/lib/api"
import {
  SectionHeader, PeriodTabs, ChartTypeSwitcher, KpiCard,
  ChartCard, SkeletonCard, SkeletonChart, COLORS,
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
          <span className="font-medium text-foreground">{formatNum(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function RevendedoresDashboard() {
  const { data: revendedores, isLoading: rLoading } = useRevendedores()
  const { data: pedidos, isLoading: pLoading } = usePedidos()
  const [period, setPeriod] = useState<Period>("año")
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { from: today, to: today }
  })
  const [topChart, setTopChart] = useState<ChartType>("bar")
  const [lowestChart, setLowestChart] = useState<ChartType>("bar")

  const isLoading = rLoading || pLoading

  const kpis = useMemo(() => {
    const total = revendedores?.length ?? 0
    const activos = revendedores?.filter((r) => r.rev_actv).length ?? 0
    const inactivos = total - activos
    const conUbicacion = revendedores?.filter((r) => r.loc_codi !== null).length ?? 0
    return { total, activos, inactivos, conUbicacion }
  }, [revendedores])

  const filteredPedidos = useMemo(() =>
    filterByPeriod(pedidos ?? [], period, range),
  [pedidos, period, range])

  // Top revendedores por pedidos en el período
  const topRevData = useMemo(() =>
    countBy(filteredPedidos, "rev_nomb").slice(0, 10).map(item => ({
      ...item,
      displayName: item.name.length > 28 ? item.name.substring(0, 25) + "..." : item.name
    })),
  [filteredPedidos])

  // Los que menos venden en el período
  const lowestRevData = useMemo(() =>
    countBy(filteredPedidos, "rev_nomb").sort((a, b) => a.value - b.value).slice(0, 10).map(item => ({
      ...item,
      displayName: item.name.length > 28 ? item.name.substring(0, 25) + "..." : item.name
    })),
  [filteredPedidos])

  // Activos vs inactivos
  const activoData = useMemo(() => [
    { name: "Activos",   value: kpis.activos },
    { name: "Inactivos", value: kpis.inactivos },
  ], [kpis])

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
        icon={Users}
        iconColor="bg-violet-500"
        title="Revendedores"
        subtitle={`Red de distribución — ${formatNum(kpis.total)} revendedores registrados`}
      >
        <PeriodTabs value={period} onChange={setPeriod} range={range} onRangeChange={setRange} />
      </SectionHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total"
          value={formatNum(kpis.total)}
          sub="en red"
          accent="border-l-4 border-l-violet-400"
          icon={Users}
          iconBg="bg-violet-50 dark:bg-violet-950"
        />
        <KpiCard
          label="Activos"
          value={formatNum(kpis.activos)}
          sub={`${kpis.total > 0 ? Math.round((kpis.activos / kpis.total) * 100) : 0}% del total`}
          accent="border-l-4 border-l-emerald-400"
          icon={UserCheck}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
        />
        <KpiCard
          label="Inactivos"
          value={formatNum(kpis.inactivos)}
          sub="sin actividad"
          accent="border-l-4 border-l-red-400"
          icon={UserX}
          iconBg="bg-red-50 dark:bg-red-950"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activos/inactivos donut */}
        <ChartCard title="Estado de revendedores" accentBar="bg-violet-400">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={activoData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={5}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                <Cell fill={COLORS[2]} />
                <Cell fill={COLORS[5]} />
              </Pie>
              <Tooltip formatter={(v) => formatNum(Number(v))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top revendedores por pedidos */}
        <ChartCard
          title="Top revendedores por pedidos"
          accentBar="bg-emerald-400"
          toolbar={
            <ChartTypeSwitcher
              value={topChart}
              onChange={setTopChart}
              options={["bar", "pie"]}
            />
          }
        >
          {topChart === "bar" ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topRevData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="displayName" width={150} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" radius={[0, 4, 4, 0]}>
                  {topRevData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={topRevData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35} paddingAngle={3}>
                  {topRevData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Los que menos venden */}
        <ChartCard
          title="Menor venta por pedidos"
          accentBar="bg-amber-400"
          toolbar={
            <ChartTypeSwitcher
              value={lowestChart}
              onChange={setLowestChart}
              options={["bar", "pie"]}
            />
          }
        >
          {lowestChart === "bar" ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={lowestRevData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="displayName" width={150} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="pedidos" radius={[0, 4, 4, 0]}>
                  {lowestRevData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={lowestRevData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35} paddingAngle={3}>
                  {lowestRevData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatNum(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Directory table */}
      <ChartCard title="Directorio de revendedores" accentBar="bg-sky-400">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Nombre</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Email</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Teléfono</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(revendedores ?? []).map((r) => (
                <tr key={r.rev_codi} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2 pr-4 text-muted-foreground font-mono">{r.rev_codi}</td>
                  <td className="py-2 pr-4 text-foreground font-medium">{r.rev_nomb}</td>
                  <td className="py-2 pr-4 text-muted-foreground truncate max-w-[160px]">{r.rev_emai || "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{r.rev_tele || "—"}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                      r.rev_actv
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }`}>
                      {r.rev_actv ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(revendedores?.length ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-3">
              Mostrando {formatNum(revendedores?.length ?? 0)} revendedores
            </p>
          )}
        </div>
      </ChartCard>
    </div>
  )
}
