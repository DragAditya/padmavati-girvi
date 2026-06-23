import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Phone, MapPin, Crown, FileText, CreditCard, Edit2, Share2, ChevronRight } from 'lucide-react'
import { db } from '@/db/database'
import { formatCurrency, formatDate, cn, statusColor } from '@/utils'
import type { Girvi, Payment } from '@/types'
import toast from 'react-hot-toast'

export default function CustomerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'girvis' | 'payments'>('girvis')
  const [toggling, setToggling] = useState(false)

  const customer = useLiveQuery(
    () => (id ? db.customers.get(Number(id)) : Promise.resolve(undefined)),
    [id]
  )

  const girvis = useLiveQuery<Girvi[]>(
    async () => {
      if (!id) return []
      return db.girvis.where('customerId').equals(Number(id)).reverse().sortBy('createdAt')
    },
    [id],
    []
  )

  const payments = useLiveQuery<Payment[]>(
    async () => {
      if (!id) return []
      return db.payments.where('customerId').equals(Number(id)).reverse().sortBy('paymentDate')
    },
    [id],
    []
  )

  if (customer === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="skeleton w-48 h-8" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Customer not found</p>
      </div>
    )
  }

  const activeGirvis = (girvis ?? []).filter((g: Girvi) => g.status === 'active' || g.status === 'overdue')
  const closedGirvis = (girvis ?? []).filter((g: Girvi) => g.status === 'closed')
  const totalBorrowed = (girvis ?? []).reduce((s: number, g: Girvi) => s + g.principalAmount, 0)
  const totalRepaid = (payments ?? []).reduce((s: number, p: Payment) => s + p.amount, 0)
  const outstanding = activeGirvis.reduce((s: number, g: Girvi) => s + g.outstandingAmount, 0)

  async function toggleVIP() {
    setToggling(true)
    try {
      await db.customers.update(customer!.id!, { isVIP: !customer!.isVIP, updatedAt: new Date() })
      toast.success(customer!.isVIP ? 'VIP removed' : 'Marked as VIP!')
    } catch { toast.error('Failed to update') }
    finally { setToggling(false) }
  }

  async function handleWhatsApp() {
    const msg = `Dear ${customer!.name}, greetings from Padmavati Jewellers. Please contact us regarding your gold pledge. Thank you.`
    window.open(`https://wa.me/91${customer!.mobile}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900">Customer Profile</h1>
        </div>
        <button className="btn-ghost text-xs px-3">
          <Edit2 className="w-4 h-4" /> Edit
        </button>
      </div>

      <div className="page-enter">
        {/* Profile hero */}
        <div className="bg-gradient-to-br from-gold-500 to-gold-700 px-4 pt-6 pb-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-white/40 flex-shrink-0">
              {customer.photo
                ? <img src={customer.photo} className="w-full h-full object-cover" alt="" />
                : <span className="font-display font-bold text-white text-3xl">{customer.name[0]}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-white font-bold text-xl truncate">{customer.name}</h2>
                <button onClick={toggleVIP} disabled={toggling}
                  className={cn('text-lg transition-transform active:scale-90', toggling && 'opacity-50')}>
                  {customer.isVIP ? '👑' : '⭐'}
                </button>
              </div>
              <button onClick={() => window.open(`tel:${customer.mobile}`)}
                className="flex items-center gap-1.5 text-white/80 text-sm mb-1 hover:text-white">
                <Phone className="w-3.5 h-3.5" /> {customer.mobile}
              </button>
              <div className="flex items-center gap-1.5 text-white/70 text-xs">
                <MapPin className="w-3 h-3" /> {customer.city}, {customer.state}
              </div>
              <p className="text-white/60 text-xs mt-1">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="px-4 -mt-6">
          <div className="card p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Active Girvis', value: activeGirvis.length, color: 'text-gold-600' },
              { label: 'Closed Girvis', value: closedGirvis.length, color: 'text-green-600' },
              { label: 'Total Borrowed', value: formatCurrency(totalBorrowed), color: 'text-gray-800' },
              { label: 'Outstanding', value: formatCurrency(outstanding), color: outstanding > 0 ? 'text-red-500' : 'text-green-600' },
            ].map((s, i) => (
              <div key={i} className={cn('rounded-xl p-3', i === 3 && outstanding > 0 ? 'bg-red-50' : 'bg-gray-50')}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={cn('font-mono font-bold text-base mt-0.5', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 mt-4 flex gap-3">
          <button onClick={() => window.open(`tel:${customer.mobile}`)} className="btn-outline flex-1">
            <Phone className="w-4 h-4" /> Call
          </button>
          <button onClick={handleWhatsApp} className="btn-outline flex-1">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={() => navigate('/girvi/new')} className="btn-primary flex-[2]">
            <FileText className="w-4 h-4" /> New Girvi
          </button>
        </div>

        {/* KYC */}
        {(customer.panNumber || customer.aadhaarNumber) && (
          <div className="mx-4 mt-4 card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">KYC Details</p>
            <div className="grid grid-cols-2 gap-3">
              {customer.panNumber && (
                <div>
                  <p className="text-xs text-gray-400">PAN Number</p>
                  <p className="font-mono font-semibold text-sm text-gray-800 mt-0.5">{customer.panNumber}</p>
                </div>
              )}
              {customer.aadhaarNumber && (
                <div>
                  <p className="text-xs text-gray-400">Aadhaar</p>
                  <p className="font-mono font-semibold text-sm text-gray-800 mt-0.5">
                    XXXX-XXXX-{customer.aadhaarNumber.slice(-4)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 mt-4">
          <div className="flex bg-gray-100 rounded-2xl p-1">
            <button onClick={() => setTab('girvis')}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                tab === 'girvis' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              Girvis ({(girvis ?? []).length})
            </button>
            <button onClick={() => setTab('payments')}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                tab === 'payments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              Payments ({(payments ?? []).length})
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 mt-3 space-y-2">
          {tab === 'girvis' && (
            (girvis ?? []).length === 0
              ? <div className="text-center py-12 text-gray-400 text-sm">No Girvi records</div>
              : (girvis ?? []).map((g: Girvi) => (
                  <button key={g.id} onClick={() => navigate(`/girvi/${g.id}`)}
                    className="card w-full text-left p-4 flex items-center gap-3 active:bg-gray-50 hover:shadow-md transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono font-semibold text-gold-600 text-sm">{g.girviCode}</p>
                        <span className={cn('badge text-[10px]', statusColor(g.status))}>{g.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(g.startDate)} → {formatDate(g.dueDate)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.ornaments.length} items • {g.netGoldWeight.toFixed(3)}g</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-gray-800">{formatCurrency(g.principalAmount)}</p>
                      {g.outstandingAmount > 0 && (
                        <p className="font-mono text-xs text-red-500">{formatCurrency(g.outstandingAmount)} due</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                ))
          )}

          {tab === 'payments' && (
            (payments ?? []).length === 0
              ? <div className="text-center py-12 text-gray-400 text-sm">No payment history</div>
              : (payments ?? []).map((p: Payment) => (
                  <div key={p.id} className="card p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono font-semibold text-gray-800">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(p.paymentDate)} • {p.mode.toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400">{p.receiptNo}</p>
                    </div>
                    <div className="text-right">
                      <span className="badge bg-blue-50 text-blue-600 text-[10px]">{p.paymentType}</span>
                      <p className="text-xs text-gray-400 mt-1">Bal: {formatCurrency(p.balanceAfter)}</p>
                    </div>
                  </div>
                ))
          )}
        </div>

        {customer.notes && (
          <div className="mx-4 mt-4 card p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Private Notes</p>
            <p className="text-sm text-gray-700">{customer.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
