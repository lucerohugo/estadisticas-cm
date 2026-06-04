// ================================================================
// lib/api.ts — Centro Motos Dashboard
// APIs reales consumiendo datos desde Django backend
// ================================================================

import useSWR from "swr"

// ----------------------------------------------------------------
// Types - Datos Principales
// ----------------------------------------------------------------

export interface Pedido {
  pov_codi: number
  pov_fech: string | null
  rev_codi: number
  rev_nomb?: string
  cli_nomb: string | null
  art_nomb?: string
  mar_nomb?: string
  pov_mode: number | null
  col_nomb?: string
  com_nomb: string | null
  com_letr: string | null
  pov_plis: string | null
  pov_monf: string | null
  pov_finu: string | null
  pov_numc?: string | null
  pov_impc?: string | null
  pov_cont?: string | null
  pov_tran?: string | null
  ped_exp: boolean
  ped_fexp?: string | null
  pov_fchc: string
}

export interface Articulo {
  art_codi: number
  art_nomb: string
  art_plis: string | null
  art_prec: string | null
  art_tprec: string
  mar_codi: number | null
  mar_nomb?: string
  sru_codi?: number | null
  sru_nomb?: string
  rub_nomb?: string
  art_tiva: string | null
  art_fchc: string
  art_fmod: string
}

export interface StockItem {
  stk_codi?: number
  art_codi: number
  art_nomb?: string
  mar_nomb?: string
  col_codi: number | null
  col_nomb?: string
  art_ncha: string | null
  art_nmot: string | null
  art_mode: number | null
  art_fing: string | null
  art_dest: number | null
  art_bdis: string | null
  art_desa: number | null
  art_usad: string | null
  art_prem?: string | null
  stk_fcre?: string
}

export interface Revendedor {
  rev_codi: number
  rev_nomb: string
  rev_logo: string | null
  rev_logo_url?: string | null
  rev_doc?: string | null
  rev_emai: string | null
  rev_tele: string | null
  rev_dire: string | null
  rev_dest?: number | null
  rev_porc?: string | null
  rev_actv: boolean
  loc_codi: number | null
}

// ----------------------------------------------------------------
// Types - Datos Relacionados
// ----------------------------------------------------------------

export interface Marca {
  mar_codi: number
  mar_nomb: string
}

export interface Rubro {
  rub_codi: number
  rub_nomb: string
}

export interface Subrubro {
  sru_codi: number
  rub_codi: number
  sru_nomb: string
}

export interface Color {
  col_codi: number
  col_nomb: string
}

export interface Localidad {
  loc_codi: number
  loc_nomb: string
  loc_cpos: number | null
  pci_codi: number
}

export interface Provincia {
  pci_codi: number
  pci_nomb: string
}

export interface CondicionIva {
  civ_codi: number
  civ_nomb: string
}

export interface Comprobante {
  com_codi: number
  com_nomb: string
  com_letr: string | null
  com_abre: string | null
}

export interface Cliente {
  cli_codi: number
  cli_nomb: string
  cli_ndoc: string | null
  cli_emai: string | null
  cli_celu: string | null
  cli_tele: string | null
  loc_codi: number | null
}

export interface General {
  gen_codi: number
  gen_nomb: string
  gen_logo: string | null
  gen_loge: string | null
}

export interface FiltroRevendedor {
  fr_codi: number
  rev_codi: number
  fr_nomb: string
  fr_tipo: string
  fr_desc: string | null
}

export interface ValorFiltroStock {
  vfs_codi: number
  stk_codi: number
  fr_codi: number
  vfs_valor: string
}

// ----------------------------------------------------------------
// API Configuration
// ----------------------------------------------------------------

const BASE = "https://api.centromotos.com.ar/api/gestion"

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

// Debug: Log de respuestas de API (solo para desarrollo)
async function fetchAllPagesWithDebug<T>(firstUrl: string, label: string): Promise<T[]> {
  const all: T[] = []
  let url: string | null = firstUrl
  let pageCount = 0

  while (url) {
    const data: { next: string | null; results: T[] } | T[] = await fetcher(url)
    
    if (Array.isArray(data)) {
      all.push(...data)
      break
    } else {
      all.push(...data.results)
      url = data.next
    }
  }
  
  return all
}

async function fetchAllPages<T>(firstUrl: string): Promise<T[]> {
  const all: T[] = []
  let url: string | null = firstUrl
  
  while (url) {
    const data: { next: string | null; results: T[] } | T[] = await fetcher(url)
    if (Array.isArray(data)) {
      all.push(...data)
      break
    } else {
      all.push(...data.results)
      url = data.next
    }
  }
  return all
}

// ----------------------------------------------------------------
// Data Hooks - Principales
// ----------------------------------------------------------------

export function usePedidos() {
  return useSWR<Pedido[]>(
    "all-pedidos",
    () => fetchAllPages<Pedido>(`${BASE}/pedidos/`),
    { refreshInterval: 60_000 }
  )
}

export function useArticulos() {
  return useSWR<Articulo[]>(
    "all-articulos",
    () => fetchAllPages<Articulo>(`${BASE}/articulos/`),
    { refreshInterval: 300_000 }
  )
}

export function useStock(revCodi?: number | null, artDest?: number | null) {
  /**
   * Hook para obtener stock filtrado opcionalmente por revendedor o depósito
   * 
   * ⚠️ IMPORTANTE - Necesitas agregar esta acción en Django (StockViewSet):
   * 
   * @action(detail=False, methods=['get'], url_path='dashboard')
   * def dashboard(self, request):
   *     from django.db.models import Q
   *     queryset = self.queryset.select_related('art_codi', 'col_codi')
   *     art_dest = request.query_params.get('art_dest')
   *     if art_dest:
   *         try:
   *             queryset = queryset.filter(art_dest=int(art_dest))
   *         except (ValueError, TypeError):
   *             pass
   *     queryset = queryset.filter(
   *         Q(art_bdis__isnull=True) | Q(art_bdis='')
   *     ).order_by('-stk_codi')
   *     page = self.paginate_queryset(queryset)
   *     if page is not None:
   *         serializer = self.get_serializer(page, many=True)
   *         return self.get_paginated_response(serializer.data)
   *     serializer = self.get_serializer(queryset, many=True)
   *     return Response(serializer.data)
   * 
   * Parámetros:
   * - revCodi: rev_codi del revendedor (pasará art_dest del revendedor a la API)
   * - artDest: art_dest directo
   */
  return useSWR<StockItem[]>(
    revCodi || artDest ? [`all-stock`, revCodi, artDest] : "all-stock",
    async () => {
      try {
        // Construir URL con parámetros si existen
        let url = `${BASE}/stock/dashboard/`
        if (revCodi || artDest) {
          const params = new URLSearchParams()
          if (revCodi) params.append("rev_codi", String(revCodi))
          if (artDest) params.append("art_dest", String(artDest))
          url = `${BASE}/stock/?${params.toString()}`
        }
        
        return await fetchAllPages<StockItem>(url)
      } catch (err) {
        // Fallback: si /dashboard no existe, usar art_dest=1
        return await fetchAllPages<StockItem>(`${BASE}/stock/?art_dest=1`)
      }
    },
    { refreshInterval: 120_000 }
  )
}

export function useRevendedores() {
  return useSWR<Revendedor[]>(
    "all-revendedores",
    () => fetchAllPages<Revendedor>(`${BASE}/revendedores/`),
    { refreshInterval: 300_000 }
  )
}

// ----------------------------------------------------------------
// Data Hooks - Relacionados (para enriquecer datos principales)
// ----------------------------------------------------------------

export function useMarcas() {
  return useSWR<Marca[]>(
    "all-marcas",
    () => fetchAllPages<Marca>(`${BASE}/marcas/`),
    { refreshInterval: 600_000 }
  )
}

export function useRubros() {
  return useSWR<Rubro[]>(
    "all-rubros",
    () => fetchAllPages<Rubro>(`${BASE}/rubros/`),
    { refreshInterval: 600_000 }
  )
}

export function useSubrubros() {
  return useSWR<Subrubro[]>(
    "all-subrubros",
    () => fetchAllPages<Subrubro>(`${BASE}/subrubros/`),
    { refreshInterval: 600_000 }
  )
}

export function useColores() {
  return useSWR<Color[]>(
    "all-colores",
    () => fetchAllPages<Color>(`${BASE}/colores/`),
    { refreshInterval: 600_000 }
  )
}

export function useLocalidades() {
  return useSWR<Localidad[]>(
    "all-localidades",
    () => fetchAllPages<Localidad>(`${BASE}/localidades/`),
    { refreshInterval: 600_000 }
  )
}

export function useProvincias() {
  return useSWR<Provincia[]>(
    "all-provincias",
    () => fetchAllPages<Provincia>(`${BASE}/provincias/`),
    { refreshInterval: 600_000 }
  )
}

export function useCondicionIva() {
  return useSWR<CondicionIva[]>(
    "all-condicion-iva",
    () => fetchAllPages<CondicionIva>(`${BASE}/condicion-iva/`),
    { refreshInterval: 600_000 }
  )
}

export function useComprobantes() {
  return useSWR<Comprobante[]>(
    "all-comprobantes",
    () => fetchAllPages<Comprobante>(`${BASE}/comprobantes/`),
    { refreshInterval: 600_000 }
  )
}

export function useClientes() {
  return useSWR<Cliente[]>(
    "all-clientes",
    () => fetchAllPages<Cliente>(`${BASE}/clientes/`),
    { refreshInterval: 300_000 }
  )
}

export function useGeneral() {
  return useSWR<General[]>(
    "all-general",
    () => fetchAllPages<General>(`${BASE}/general/`),
    { refreshInterval: 600_000 }
  )
}

export function useFiltrosRevendedor() {
  return useSWR<FiltroRevendedor[]>(
    "all-filtros-revendedor",
    () => fetchAllPages<FiltroRevendedor>(`${BASE}/filtros-revendedor/`),
    { refreshInterval: 300_000 }
  )
}

export function useValoresFiltroStock() {
  return useSWR<ValorFiltroStock[]>(
    "all-valores-filtro-stock",
    () => fetchAllPages<ValorFiltroStock>(`${BASE}/valores-filtro-stock/`),
    { refreshInterval: 120_000 }
  )
}

// ================================================================
// Utility helpers
// ================================================================

export function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNum(value: number) {
  return new Intl.NumberFormat("es-AR").format(value)
}

export type Period = "dia" | "semana" | "mes" | "año" | "rango"

export interface DateRange {
  from: string // "YYYY-MM-DD"
  to: string
}

export function filterByPeriod(
  pedidos: Pedido[],
  period: Period,
  range?: DateRange
): Pedido[] {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  return pedidos.filter((p) => {
    const d = p.pov_fech
    if (!d) return false
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
}

export function groupPedidosByDate(
  pedidos: Pedido[]
): { date: string; cantidad: number; monto: number }[] {
  const map = new Map<string, { cantidad: number; monto: number }>()
  for (const p of pedidos) {
    const key = p.pov_fech
    if (!key) continue
    const prev = map.get(key) ?? { cantidad: 0, monto: 0 }
    map.set(key, {
      cantidad: prev.cantidad + 1,
      monto: prev.monto + parseFloat(p.pov_monf || "0"),
    })
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function countBy<T>(
  items: T[],
  key: keyof T
): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = String(item[key] ?? "Desconocido")
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ================================================================
// PDF Export Functions
// ================================================================

function generarHTMLPedido(pedido: Pedido): string {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const [year, month, day] = dateStr.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString("es-AR")
  }

  const formatCurrency = (value: string | null) => {
    const num = parseFloat(value || "0") || 0
    return num.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ff8c00; padding-bottom: 20px; margin-bottom: 30px; }
        .header-left h1 { font-size: 28px; color: #ff8c00; margin-bottom: 5px; }
        .header-left p { color: #666; font-size: 14px; }
        .header-right { text-align: right; }
        .header-right p { margin: 5px 0; font-size: 13px; }
        .section { margin-bottom: 25px; }
        .section-title { background: #f5f5f5; padding: 8px 12px; font-weight: bold; font-size: 13px; color: #333; margin-bottom: 12px; border-left: 4px solid #ff8c00; }
        .section-content { padding: 0 12px; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px; }
        .field { margin-bottom: 8px; }
        .field-label { font-size: 11px; color: #999; text-transform: uppercase; font-weight: 600; }
        .field-value { font-size: 13px; color: #333; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f5f5f5; padding: 8px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #ddd; }
        td { padding: 8px; font-size: 12px; border-bottom: 1px solid #eee; }
        .total-row { background: #f9f9f9; font-weight: bold; }
        .footer { text-align: center; font-size: 11px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-left">
            <h1>PEDIDO #${pedido.pov_codi}</h1>
            <p>Centro Motos - Estadísticas</p>
          </div>
          <div class="header-right">
            <p><strong>Fecha:</strong> ${formatDate(pedido.pov_fech)}</p>
            <p><strong>Revendedor:</strong> ${pedido.rev_nomb || "-"}</p>
            <p><strong>Estado:</strong> <span style="color: ${pedido.ped_exp ? "#22c55e" : "#f59e0b"}; font-weight: bold;">${pedido.ped_exp ? "EXPORTADO" : "PENDIENTE"}</span></p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos del Cliente</div>
          <div class="section-content">
            <div class="row">
              <div class="field">
                <div class="field-label">Cliente</div>
                <div class="field-value">${pedido.cli_nomb || "-"}</div>
              </div>
              <div class="field">
                <div class="field-label">Artículo</div>
                <div class="field-value">${pedido.art_nomb || "-"}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos Financieros</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style="text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monto Final</td>
                  <td style="text-align: right; font-weight: bold;">${formatCurrency(pedido.pov_monf)}</td>
                </tr>
                <tr>
                  <td>Financiera</td>
                  <td style="text-align: right;">${pedido.com_nomb || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="footer">
          <p>Documento generado automáticamente por Centro Motos — Estadísticas</p>
          <p>${new Date().toLocaleString("es-AR")}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function exportarPedidoComoPDF(pedido: Pedido): Promise<{ success: boolean; error?: string }> {
  try {
    const html2pdf = (await import("html2pdf.js")).default

    const element = document.createElement("div")
    element.innerHTML = generarHTMLPedido(pedido)

    const opt: any = {
      margin: 10,
      filename: `Pedido_${pedido.pov_codi}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    }

    await html2pdf().set(opt).from(element).save()

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return { success: false, error: message }
  }
}
