import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Search, Filter, Plus, ChevronRight, AlertTriangle,
  Shield, Clock, CheckCircle2, FileText, Mic, SortAsc
} from 'lucide-react'
import { db } from '@/db/database'
import { cn, formatCurrency, formatWeight, formatDate, statusColor, riskColor } from '@/utils'
import Layout from '@/components/layout/Layout'
import type { GirviStatus } from '@/types'
import { differenceInDays } from 'date-fns'

type Tab = 'all' | GirviStatus

export default function GirviListPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'due_soon'>('newest')
  const [showSort, setShowSort] = useState(false)

  const allGirvis = useLiveQuery(() => db.girvis.toArray()) ?? []
  const allCustomers = useLiveQuery(async () => {
    const customers = await db.customers.toArray()
    return Object.fromEntries(customers.map(c => [c.id, c]))
  }) ?? {}

  // Tab counts
  const counts = useMemo(() => ({
    all:     allGirvis.length,
    active:  allGirvis.filter(g => g.status === 'active').length,
    overdue: allGirvis.filter(g => g.status === 'overdue').length,
    closed:  allGirvis.filter(g => g.status === 'closed').length,
    draft:   allGirvis.filter(g => g.status === 'draft').length,
  }), [allGirvis])

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = tab === 'all' ? allGirvis : allGirvis.filter(g => g.status === tab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g => {
        const c = allCustomers[g.customerId]
        return (
          g.girviCode.toLowerCase().includes(q) ||
          (g.referenceNo ?? '').toLowerCase().includes(q) ||
          c?.name?.toLowerCase().includes(q) ||
          c?.mobile?.includes(q)
        )
      })
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'newest':     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'amount_high':return b.principalAmount - a.principalAmount
        case 'due_soon':   return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        default:           return 0
      }
    })
  }, [allGirvis, allCustomers, tab, search, sortBy])

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: 'all',     label: `All`,     color: 'bg-gray-800 text-white' },
    { key: 'active',  label: 'Active',  color: 'bg-green-500 text-white' },
    { key: 'overdue', label: 'Overdue', color: 'bg-red-500 text-white' },
    { key: 'closed',  label: 'Closed',  color: 'bg-gray-500 text-white' },
  ]

  return (
    <Layout>
      <div className="page-enter">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Girvi</h1>
            <p className="text-xs text-gray-400">Manage all your pledges</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSort(s => !s)} className="p-2 hover:bg-gray-100 rounded-xl relative">
              <SortAsc className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate('/girvi/new')} className="btn-primary px-3 py-2 text-xs">
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        {/* Sort dropdown */}
        {showSort && (
          <div className="mx-4 mt-2 card shadow-modal z-10 overflow-hidden">
            {[
              { val: 'newest', label: 'Newest First' },
              { val: 'oldest', label: 'Oldest First' },
              { val: 'amount_high', label: 'Amount: High to Low' },
              { val: 'due_soon', label: 'Due Date: Soonest' },
            ].map(s => (
              <button key={s.val}
                className={cn('w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0',
                  sortBy === s.val ? 'bg-gold-50 text-gold-700 font-semibold' : 'hover:bg-gray-50')}
                onClick={() => { setSortBy(s.val as typeof sortBy); setShowSort(false) }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 pr-10"
              placeholder="Search by name, mobile, Girvi ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {TABS.map(t => (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  tab === t.key ? t.color : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}>
                {t.label} ({counts[t.key]})
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <EmptyState search={search} tab={tab} onNew={() => navigate('/girvi/new')} />
          ) : (
            <div className="space-y-3">
              {filtered.map(g => {
                const customer = allCustomers[g.customerId]
                const daysUntilDue = differenceInDays(new Date(g.dueDate), new Date())
                const isOverdue = daysUntilDue < 0
                return (
                  <button key={g.id}
                    onClick={() => navigate(`/girvi/${g.id}`)}
                    className="card w-full text-left p-4 active:bg-gray-50 transition-colors hover:shadow-md">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gold-100 rounded-xl flex items-center justify-center flex-shrink-0 relative">
                          {customer?.photo
                            ? <img src={customer.photo} className="w-11 h-11 rounded-xl object-cover" alt="" />
                            : <span className="font-bold text-gold-600">{customer?.name?.[0] ?? '?'}</span>}
                          {customer?.isVIP && (
                            <span className="absolute -top-1 -right-1 text-base">👑</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 text-sm">{customer?.name ?? '—'}</p>
                          </div>
                          <p className="text-xs text-gold-600 font-mono">{g.girviCode}</p>
                          <p className="text-xs text-gray-400">{customer?.mobile}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('badge', statusColor(g.status))}>{g.status}</span>
                        <p className="text-xs text-gray-400">{formatDate(g.createdAt)}</p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-500">Gold Weight</p>
                        <p className="font-mono font-bold text-xs text-gray-800">{g.netGoldWeight.toFixed(3)}g</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-500">Loan Amount</p>
                        <p className="font-mono font-bold text-xs text-gray-800">{formatCurrency(g.principalAmount)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-500">Outstanding</p>
                        <p className={cn('font-mono font-bold text-xs', g.outstandingAmount > 0 ? 'text-red-500' : 'text-green-600')}>
                          {formatCurrency(g.outstandingAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">
                          {g.ornaments.length} {g.ornaments.length === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{g.ornaments[0]?.metal ?? 'Gold'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn('flex items-center gap-1 text-xs font-semibold',
                          isOverdue ? 'text-red-500' : daysUntilDue <= 7 ? 'text-orange-500' : 'text-gray-500')}>
                          {isOverdue
                            ? <><AlertTriangle className="w-3 h-3" /> Overdue {Math.abs(daysUntilDue)}d</>
                            : daysUntilDue === 0
                              ? <><Clock className="w-3 h-3" /> Due today</>
                              : <><Clock className="w-3 h-3" /> Due in {daysUntilDue}d</>}
                        </div>
                        <span className={cn('badge text-[10px]', riskColor(g.riskLevel))}>
                          <Shield className="w-2.5 h-2.5" />
                          {g.riskLevel === 'low' ? 'Low Risk' : g.riskLevel === 'medium' ? 'Med Risk' : 'High Risk'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
              <p className="text-center text-xs text-gray-400 py-2">
                Showing {filtered.length} of {counts[tab === 'all' ? 'all' : tab]} records
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function EmptyState({ search, tab, onNew }: { search: string; tab: Tab; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-300" />
      </div>
      <p className="font-semibold text-gray-700 mb-1">
        {search ? 'No results found' : tab === 'all' ? 'No Girvi records yet' : `No ${tab} Girvis`}
      </p>
      <p className="text-sm text-gray-400 mb-6">
        {search ? `No matches for "${search}"` : 'Create your first Girvi record'}
      </p>
      {!search && (
        <button onClick={onNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Create New Girvi
        </button>
      )}
    </div>
  )
}
