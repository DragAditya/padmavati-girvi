import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  TrendingUp, FileText, CheckCircle2, Users,
  Wallet, AlertTriangle, Clock, Zap, Bell, Search,
  ChevronRight, Plus, BarChart3, Settings, CreditCard, Gem
} from 'lucide-react'
import { db } from '@/db/database'
import { useGoldRate, useDashboardStats, useInsights } from '@/hooks'
import { formatCurrency, formatWeight, formatDate, cn, statusColor } from '@/utils'
import Layout from '@/components/layout/Layout'
import { format } from 'date-fns'
import type { Girvi } from '@/types'

function Sparkline({ data, color = '#D4A017' }: { data: number[]; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80, h = 28
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

function StatCard({ icon, label, value, sub, subColor, sparkData, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  subColor?: string; sparkData?: number[]; color: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>{icon}</div>
        {sparkData && <Sparkline data={sparkData} />}
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="font-mono font-bold text-xl text-gray-900 mt-0.5">{value}</p>
      {sub && <p className={cn('text-xs font-semibold mt-0.5', subColor ?? 'text-gray-500')}>{sub}</p>}
    </div>
  )
}

const QUICK_ACTIONS = [
  { icon: <Plus className="w-5 h-5" />, label: 'New Girvi', path: '/girvi/new', color: 'bg-gold-500 text-white' },
  { icon: <Users className="w-5 h-5" />, label: 'Customers', path: '/customers', color: 'bg-blue-50 text-blue-600' },
  { icon: <FileText className="w-5 h-5" />, label: 'Girvi List', path: '/girvi', color: 'bg-purple-50 text-purple-600' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', path: '/girvi', color: 'bg-green-50 text-green-600' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Reports', path: '/reports', color: 'bg-orange-50 text-orange-600' },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings', color: 'bg-gray-100 text-gray-600' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const stats = useDashboardStats()
  const { rate, loading: rateLoading } = useGoldRate()
  const insights = useInsights()

  const recentGirvis = useLiveQuery<Girvi[]>(
    () => db.girvis.orderBy('createdAt').reverse().limit(5).toArray(),
    [],
    []
  )

  const recentCustomers = useLiveQuery(async () => {
    if (!recentGirvis || recentGirvis.length === 0) return {}
    const ids = [...new Set(recentGirvis.map(g => g.customerId))]
    const customers = await db.customers.bulkGet(ids)
    const map: Record<number, any> = {}
    customers.forEach(c => { if (c?.id) map[c.id] = c })
    return map
  }, [recentGirvis]) ?? {}

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening'
  const sparkData = [30, 45, 28, 60, 55, 70, 65]

  return (
    <Layout>
      <div className="page-enter">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-500 rounded-2xl flex items-center justify-center shadow-gold">
                <Gem className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-gray-900 text-base leading-tight">Padmavati Jewellers</h1>
                <p className="text-xs text-gray-400">Trusted Since 1998</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/girvi')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Search className="w-5 h-5 text-gray-500" />
              </button>
              <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
                {(stats?.overdueCount ?? 0) > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                    {stats!.overdueCount > 9 ? '9+' : stats!.overdueCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Hero Banner */}
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-br from-gold-500 to-gold-700 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">{greeting} 👋</p>
                  <p className="text-white text-xs mt-0.5 opacity-80">Here's your business today</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-xs opacity-80">{format(now, 'dd MMM yyyy')}</p>
                  <p className="text-white text-xs opacity-70">{format(now, 'EEEE')}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 flex-1">
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center text-lg">🏅</div>
                  <div>
                    <p className="text-white/70 text-[10px]">Gold (22K)</p>
                    {rateLoading
                      ? <div className="skeleton h-4 w-20 mt-0.5" />
                      : <p className="text-white font-mono font-bold text-sm">₹{rate?.gold22K?.toLocaleString('en-IN') ?? '—'}/g</p>}
                    {rate?.isStale
                      ? <p className="text-yellow-300 text-[9px]">Cached rate</p>
                      : <p className="text-green-300 text-[9px]">Live</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 flex-1">
                  <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center text-lg">🥈</div>
                  <div>
                    <p className="text-white/70 text-[10px]">Silver</p>
                    {rateLoading
                      ? <div className="skeleton h-4 w-16 mt-0.5" />
                      : <p className="text-white font-mono font-bold text-sm">₹{rate?.silverRate?.toLocaleString('en-IN') ?? '—'}/g</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<FileText className="w-4 h-4 text-purple-600" />} color="bg-purple-50"
              label="Active Girvi" value={stats?.activeGirvi?.toString() ?? '—'}
              sub={`+${stats?.newGirviToday ?? 0} today`} subColor="text-green-600" sparkData={sparkData} />
            <StatCard icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} color="bg-green-50"
              label="Closed Girvi" value={stats?.closedGirvi?.toString() ?? '—'}
              sub={`+${stats?.newGirviClosed ?? 0} today`} subColor="text-green-600"
              sparkData={[10, 22, 18, 30, 25, 35, 28]} />
            <StatCard icon={<Users className="w-4 h-4 text-blue-600" />} color="bg-blue-50"
              label="Total Customers" value={stats?.totalCustomers?.toString() ?? '—'}
              sub={`+${stats?.newCustomersMonth ?? 0} this month`} subColor="text-blue-600"
              sparkData={[5, 8, 6, 12, 10, 15, 13]} />
            <StatCard icon={<Wallet className="w-4 h-4 text-gold-600" />} color="bg-gold-50"
              label="Outstanding" value={stats ? `₹${(stats.outstandingAmount / 100000).toFixed(1)}L` : '—'}
              sub="Total active loans" sparkData={[40, 55, 48, 62, 58, 70, 65]} />
          </div>

          {/* Secondary Stats */}
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Today's Collection", value: formatCurrency(stats?.todayCollection ?? 0), icon: <CreditCard className="w-4 h-4" />, color: 'text-green-600' },
                { label: "Today's Interest", value: formatCurrency(stats?.todayInterest ?? 0), icon: <TrendingUp className="w-4 h-4" />, color: 'text-gold-600' },
                { label: 'Due Today', value: `${stats?.dueTodayCount ?? 0} loans`, icon: <Clock className="w-4 h-4" />, color: 'text-blue-600', sub: formatCurrency(stats?.dueTodayAmount ?? 0) },
                { label: 'Overdue', value: `${stats?.overdueCount ?? 0} loans`, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500', sub: formatCurrency(stats?.overdueAmount ?? 0) },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={cn('mt-0.5', s.color)}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={cn('font-mono font-bold text-sm', s.color)}>{s.value}</p>
                    {s.sub && <p className="text-xs text-gray-400 font-mono">{s.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="section-title mb-3"><Zap className="w-4 h-4 text-gold-500" /> Quick Actions</p>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((a, i) => (
                <button key={i} onClick={() => navigate(a.path)}
                  className="card p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', a.color)}>
                    {a.icon}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-gold-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-gold-600 uppercase tracking-wide">AI Insights ✨</span>
              </div>
              <div className="space-y-2.5">
                {insights.map(ins => (
                  <div key={ins.id} className="flex items-start gap-2.5">
                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0',
                      ins.type === 'warning' ? 'bg-orange-100' : 'bg-blue-100')}>
                      {ins.type === 'warning'
                        ? <AlertTriangle className="w-3 h-3 text-orange-500" />
                        : <TrendingUp className="w-3 h-3 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{ins.text}</p>
                      {ins.actionLabel && (
                        <button onClick={() => navigate('/girvi')} className="text-gold-600 text-xs font-semibold mt-0.5">
                          {ins.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Girvis */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title"><FileText className="w-4 h-4 text-gold-500" /> Recent Girvi</p>
              <button onClick={() => navigate('/girvi')} className="text-gold-600 text-xs font-semibold flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {(recentGirvis ?? []).length === 0
                ? [1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)
                : (recentGirvis ?? []).map((g: Girvi) => {
                    const customer = recentCustomers?.[g.customerId]
                    return (
                      <button key={g.id} onClick={() => navigate(`/girvi/${g.id}`)}
                        className="card p-3 w-full flex items-center gap-3 active:bg-gray-50 transition-colors text-left">
                        <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          {customer?.photo
                            ? <img src={customer.photo} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            : <span className="font-bold text-gold-600 text-sm">{customer?.name?.[0] ?? '?'}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-gray-800 truncate">{customer?.name ?? '—'}</p>
                            <span className={cn('badge text-[10px]', statusColor(g.status))}>{g.status}</span>
                          </div>
                          <p className="text-xs text-gold-600 font-mono">{g.girviCode}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono font-bold text-sm text-gray-800">{formatCurrency(g.principalAmount)}</p>
                          <p className="text-xs text-gray-400">{formatWeight(g.netGoldWeight)}</p>
                        </div>
                      </button>
                    )
                  })}
            </div>
          </div>

          {/* Vault Summary */}
          <div className="card overflow-hidden mb-2">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gold-500/20 rounded-lg flex items-center justify-center">🏛️</div>
                <p className="text-white font-semibold text-sm">Vault Summary</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-gray-400 text-xs">Gold Weight</p>
                  <p className="text-white font-mono font-bold">{stats ? `${stats.totalGoldWeight.toFixed(3)}g` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Silver Weight</p>
                  <p className="text-white font-mono font-bold">{stats ? `${stats.totalSilverWeight.toFixed(3)}g` : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Loans</p>
                  <p className="text-gold-400 font-mono font-bold text-sm">
                    {stats ? `₹${(stats.outstandingAmount / 100000).toFixed(2)}L` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
