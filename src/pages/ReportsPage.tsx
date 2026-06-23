import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, FileSpreadsheet, TrendingUp, Gem, Users, AlertTriangle } from 'lucide-react'
import { db } from '@/db/database'
import { exportExcel, exportJSON } from '@/services/backupService'
import { formatCurrency, cn } from '@/utils'
import Layout from '@/components/layout/Layout'
import { startOfMonth, endOfMonth, subMonths, format, isWithinInterval } from 'date-fns'
import toast from 'react-hot-toast'

type Range = '7d' | '30d' | '90d' | '1y' | 'all'

const GOLD_COLORS = ['#D4A017', '#B8860B', '#FCD34D', '#92680A', '#FFF8E7']

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('30d')
  const [exporting, setExporting] = useState(false)

  const allGirvis = useLiveQuery(() => db.girvis.toArray()) ?? []
  const allPayments = useLiveQuery(() => db.payments.toArray()) ?? []
  const allCustomers = useLiveQuery(() => db.customers.count()) ?? 0

  const rangeStart = useMemo(() => {
    const now = new Date()
    switch (range) {
      case '7d':  return new Date(now.getTime() - 7 * 86400000)
      case '30d': return new Date(now.getTime() - 30 * 86400000)
      case '90d': return new Date(now.getTime() - 90 * 86400000)
      case '1y':  return new Date(now.getTime() - 365 * 86400000)
      default:    return new Date(0)
    }
  }, [range])

  const inRange = (d: Date | string) => new Date(d) >= rangeStart

  const filteredGirvis = allGirvis.filter(g => inRange(g.createdAt))
  const filteredPayments = allPayments.filter(p => inRange(p.paymentDate))

  // Summary stats
  const totalDisbursed = filteredGirvis.reduce((s, g) => s + g.principalAmount, 0)
  const totalCollected = filteredPayments.reduce((s, p) => s + p.amount, 0)
  const totalInterestCollected = filteredPayments.reduce((s, p) => s + p.interestAmount, 0)
  const activeGirvis = allGirvis.filter(g => g.status === 'active' || g.status === 'overdue')
  const totalGoldWeight = activeGirvis.reduce((s, g) => s + g.netGoldWeight, 0)
  const overdueGirvis = allGirvis.filter(g => g.status === 'overdue')
  const overdueAmount = overdueGirvis.reduce((s, g) => s + g.outstandingAmount, 0)

  // Monthly chart data (last 6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(new Date(), 5 - i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const monthGirvis = allGirvis.filter(g => isWithinInterval(new Date(g.createdAt), { start, end }))
      const monthPayments = allPayments.filter(p => isWithinInterval(new Date(p.paymentDate), { start, end }))
      return {
        month: format(monthDate, 'MMM'),
        disbursed: Math.round(monthGirvis.reduce((s, g) => s + g.principalAmount, 0) / 1000),
        collected: Math.round(monthPayments.reduce((s, p) => s + p.amount, 0) / 1000),
        interest: Math.round(monthPayments.reduce((s, p) => s + p.interestAmount, 0) / 1000),
      }
    })
  }, [allGirvis, allPayments])

  // Status pie
  const statusData = [
    { name: 'Active', value: allGirvis.filter(g => g.status === 'active').length },
    { name: 'Overdue', value: allGirvis.filter(g => g.status === 'overdue').length },
    { name: 'Closed', value: allGirvis.filter(g => g.status === 'closed').length },
    { name: 'Draft', value: allGirvis.filter(g => g.status === 'draft').length },
  ].filter(d => d.value > 0)

  // Purity breakdown
  const purityData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const g of activeGirvis) {
      for (const o of g.ornaments) {
        map[o.purity] = (map[o.purity] ?? 0) + o.netWeight
      }
    }
    return Object.entries(map).map(([purity, weight]) => ({ purity, weight: Math.round(weight * 1000) / 1000 }))
      .sort((a, b) => b.weight - a.weight)
  }, [activeGirvis])

  async function handleExcelExport() {
    setExporting(true)
    try {
      await exportExcel()
      toast.success('Excel file downloaded!')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  async function handleJSONExport() {
    setExporting(true)
    try {
      await exportJSON()
      toast.success('JSON backup downloaded!')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const RANGES: { key: Range; label: string }[] = [
    { key: '7d', label: '7D' }, { key: '30d', label: '30D' },
    { key: '90d', label: '3M' }, { key: '1y', label: '1Y' }, { key: 'all', label: 'All' },
  ]

  return (
    <Layout>
      <div className="page-enter">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Reports</h1>
            <p className="text-xs text-gray-400">Business analytics & insights</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExcelExport} disabled={exporting} className="btn-outline text-xs px-3 py-2">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={handleJSONExport} disabled={exporting} className="btn-ghost text-xs px-3 py-2">
              <Download className="w-4 h-4" /> JSON
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Range Selector */}
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={cn('flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  range === r.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <TrendingUp className="w-4 h-4 text-gold-600" />, label: 'Disbursed', value: formatCurrency(totalDisbursed), bg: 'bg-gold-50' },
              { icon: <TrendingUp className="w-4 h-4 text-green-600" />, label: 'Collected', value: formatCurrency(totalCollected), bg: 'bg-green-50' },
              { icon: <TrendingUp className="w-4 h-4 text-blue-600" />, label: 'Interest Earned', value: formatCurrency(totalInterestCollected), bg: 'bg-blue-50' },
              { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, label: 'Overdue', value: formatCurrency(overdueAmount), bg: 'bg-red-50' },
            ].map((s, i) => (
              <div key={i} className={cn('rounded-2xl p-4', s.bg)}>
                <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-gray-500">{s.label}</span></div>
                <p className="font-mono font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly Disbursement Chart */}
          <div className="card p-4">
            <p className="section-title mb-4"><TrendingUp className="w-4 h-4 text-gold-500" /> Monthly Overview (₹K)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData} barSize={16} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  formatter={(v: number) => [`₹${v}K`, '']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                />
                <Bar dataKey="disbursed" fill="#D4A017" radius={[4,4,0,0]} name="Disbursed" />
                <Bar dataKey="collected" fill="#22C55E" radius={[4,4,0,0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-gold-500 rounded" />Disbursed</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-500 rounded" />Collected</div>
            </div>
          </div>

          {/* Interest Trend */}
          <div className="card p-4">
            <p className="section-title mb-4"><TrendingUp className="w-4 h-4 text-blue-500" /> Interest Collected (₹K)</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip formatter={(v: number) => [`₹${v}K`]} contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                <Line type="monotone" dataKey="interest" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown */}
          <div className="card p-4">
            <p className="section-title mb-4">Girvi Status Breakdown</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28}>
                    {statusData.map((_, i) => <Cell key={i} fill={GOLD_COLORS[i % GOLD_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: GOLD_COLORS[i % GOLD_COLORS.length] }} />
                      <span className="text-xs text-gray-600 capitalize">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold text-sm text-gray-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gold Vault */}
          <div className="card p-4">
            <p className="section-title mb-3"><Gem className="w-4 h-4 text-gold-500" /> Vault Holdings</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gold-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Total Gold</p>
                <p className="font-mono font-bold text-gold-700 text-lg">{totalGoldWeight.toFixed(3)}g</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Active Pledges</p>
                <p className="font-mono font-bold text-gray-800 text-lg">{activeGirvis.length}</p>
              </div>
            </div>
            {purityData.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">By Purity</p>
                {purityData.map(p => (
                  <div key={p.purity} className="flex items-center gap-2">
                    <span className="w-10 text-xs font-mono font-bold text-gold-600">{p.purity}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gold-500 h-full rounded-full"
                        style={{ width: `${Math.round((p.weight / totalGoldWeight) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-gray-600 w-16 text-right">{p.weight.toFixed(3)}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue list */}
          {overdueGirvis.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3"><AlertTriangle className="w-4 h-4 text-red-500" /> Overdue ({overdueGirvis.length})</p>
              <div className="space-y-2">
                {overdueGirvis.slice(0, 5).map(g => (
                  <div key={g.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-mono text-xs font-semibold text-gold-600">{g.girviCode}</p>
                      <p className="text-xs text-gray-500">Due {format(new Date(g.dueDate), 'dd MMM yyyy')}</p>
                    </div>
                    <p className="font-mono font-bold text-sm text-red-500">{formatCurrency(g.outstandingAmount)}</p>
                  </div>
                ))}
                {overdueGirvis.length > 5 && (
                  <p className="text-center text-xs text-gray-400">+{overdueGirvis.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Customer Stats */}
          <div className="card p-4">
            <p className="section-title mb-3"><Users className="w-4 h-4 text-blue-500" /> Customer Overview</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="font-mono font-bold text-blue-700 text-xl">{allCustomers}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="bg-gold-50 rounded-xl p-3 text-center">
                <p className="font-mono font-bold text-gold-700 text-xl">{activeGirvis.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Active</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="font-mono font-bold text-red-600 text-xl">{overdueGirvis.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Overdue</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
