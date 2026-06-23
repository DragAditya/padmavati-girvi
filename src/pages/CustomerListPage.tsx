import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, Plus, Users, Crown, Phone, MapPin, ChevronRight } from 'lucide-react'
import { db } from '@/db/database'
import { formatCurrency, formatDate, cn } from '@/utils'
import Layout from '@/components/layout/Layout'

export default function CustomerListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'vip' | 'active' | 'no_girvi'>('all')

  const customers = useLiveQuery(() => db.customers.orderBy('createdAt').reverse().toArray()) ?? []
  const allGirvis = useLiveQuery(() => db.girvis.toArray()) ?? []

  // Build customer stats map
  const customerStats = useMemo(() => {
    const map: Record<number, { activeCount: number; outstanding: number; totalBorrowed: number }> = {}
    for (const g of allGirvis) {
      if (!map[g.customerId]) map[g.customerId] = { activeCount: 0, outstanding: 0, totalBorrowed: 0 }
      if (g.status === 'active' || g.status === 'overdue') {
        map[g.customerId].activeCount++
        map[g.customerId].outstanding += g.outstandingAmount
      }
      map[g.customerId].totalBorrowed += g.principalAmount
    }
    return map
  }, [allGirvis])

  const filtered = useMemo(() => {
    let list = customers
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || c.mobile.includes(q) || c.city.toLowerCase().includes(q)
      )
    }
    if (filter === 'vip') list = list.filter(c => c.isVIP)
    if (filter === 'active') list = list.filter(c => (customerStats[c.id!]?.activeCount ?? 0) > 0)
    if (filter === 'no_girvi') list = list.filter(c => (customerStats[c.id!]?.activeCount ?? 0) === 0)
    return list
  }, [customers, search, filter, customerStats])

  // Dashboard stats
  const totalActive = allGirvis.filter(g => g.status === 'active' || g.status === 'overdue').reduce((s, g) => s + g.outstandingAmount, 0)
  const totalClosed = allGirvis.filter(g => g.status === 'closed').reduce((s, g) => s + g.principalAmount, 0)
  const highValue = customers.filter(c => (customerStats[c.id!]?.outstanding ?? 0) >= 100000).length

  const FILTERS = [
    { key: 'all', label: `All (${customers.length})` },
    { key: 'vip', label: `VIP (${customers.filter(c => c.isVIP).length})` },
    { key: 'active', label: 'Active Girvi' },
    { key: 'no_girvi', label: 'No Active Girvi' },
  ] as const

  return (
    <Layout>
      <div className="page-enter">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Customers</h1>
            <p className="text-xs text-gray-400">All your customers in one place</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/customers/new')} className="btn-primary px-3 py-2 text-xs">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: customers.length, icon: '👥', color: 'bg-purple-50' },
              { label: 'Active Girvi', value: `₹${(totalActive / 100000).toFixed(1)}L`, icon: '💰', color: 'bg-gold-50' },
              { label: 'Closed', value: `₹${(totalClosed / 100000).toFixed(1)}L`, icon: '✅', color: 'bg-green-50' },
              { label: 'High Value', value: highValue, icon: '👑', color: 'bg-yellow-50' },
            ].map((s, i) => (
              <div key={i} className={cn('rounded-2xl p-3 text-center', s.color)}>
                <div className="text-lg mb-1">{s.icon}</div>
                <p className="font-mono font-bold text-sm text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name, mobile, city..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  filter === f.key ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Users className="w-12 h-12 text-gray-200 mb-3" />
              <p className="font-semibold text-gray-600">No customers found</p>
              <p className="text-sm text-gray-400 mt-1">
                {search ? `No matches for "${search}"` : 'Add your first customer'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const stats = customerStats[c.id!] ?? { activeCount: 0, outstanding: 0, totalBorrowed: 0 }
                return (
                  <button key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                    className="card w-full text-left p-4 flex items-start gap-3 active:bg-gray-50 transition-colors hover:shadow-md">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gold-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {c.photo
                        ? <img src={c.photo} className="w-full h-full object-cover" alt="" />
                        : <span className="font-display font-bold text-gold-600 text-lg">{c.name[0]}</span>}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                        {c.isVIP && <Crown className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Phone className="w-3 h-3" /> {c.mobile}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" /> {c.city}, {c.state}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Customer since {formatDate(c.createdAt)}</p>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        <span className="text-xs text-gray-500">Active Girvi</span>
                        <span className="font-bold text-sm text-gray-800">{stats.activeCount}</span>
                      </div>
                      {stats.outstanding > 0 ? (
                        <>
                          <p className="font-mono font-bold text-sm text-red-500">{formatCurrency(stats.outstanding)}</p>
                          <p className="text-[10px] text-gray-400">Outstanding</p>
                        </>
                      ) : (
                        <p className="text-[10px] text-green-600 font-semibold">No dues</p>
                      )}
                      {stats.totalBorrowed > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Total: {formatCurrency(stats.totalBorrowed)}</p>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 mt-1 ml-auto" />
                    </div>
                  </button>
                )
              })}
              <p className="text-center text-xs text-gray-400 py-2">
                Showing {filtered.length} of {customers.length} customers
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
