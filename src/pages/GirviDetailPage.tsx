import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft, Phone, CreditCard, RefreshCw, XCircle,
  Download, Share2, MoreVertical, Shield, Clock,
  AlertTriangle, CheckCircle2, Gem, ChevronDown, ChevronUp
} from 'lucide-react'
import { db, getSettings } from '@/db/database'
import { generateGirviReceiptPDF } from '@/services/pdfService'
import {
  formatCurrency, formatDate, formatDateTime, formatWeight,
  cn, statusColor, riskColor, calcDaysUntilDue, calcInterestAccrued
} from '@/utils'
import { differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import type { Payment } from '@/types'

export default function GirviDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [expandedOrn, setExpandedOrn] = useState<string | null>(null)

  const girvi = useLiveQuery(
    () => (id ? db.girvis.get(Number(id)) : Promise.resolve(undefined)),
    [id]
  )
  const customer = useLiveQuery(
    () => (girvi?.customerId ? db.customers.get(girvi.customerId) : Promise.resolve(undefined)),
    [girvi]
  )
  const payments = useLiveQuery<Payment[]>(
    async () => {
      if (!id) return []
      const all = await db.payments.where('girviId').equals(Number(id)).toArray()
      return all.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    },
    [id],
    []
  )

  if (girvi === undefined || customer === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-3 w-64">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-8 rounded-xl" />
          <div className="skeleton h-8 rounded-xl w-3/4" />
        </div>
      </div>
    )
  }

  if (!girvi || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Record not found</p>
      </div>
    )
  }

  const daysUntilDue = calcDaysUntilDue(girvi.dueDate)
  const isOverdue = daysUntilDue < 0
  const interestAccrued = calcInterestAccrued(girvi)
  const totalPaid = (payments ?? []).reduce((s: number, p: Payment) => s + p.amount, 0)

  async function handleDownloadReceipt() {
    try {
      const settings = await getSettings()
      generateGirviReceiptPDF(girvi!, customer!, settings)
      toast.success('Receipt downloaded!')
    } catch {
      toast.error('Failed to generate receipt')
    }
  }

  async function handleCloseGirvi() {
    if (!confirm('Close this Girvi? This marks it as fully settled.')) return
    try {
      await db.girvis.update(girvi!.id!, {
        status: 'closed',
        outstandingAmount: 0,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      toast.success('Girvi closed successfully!')
    } catch {
      toast.error('Failed to close Girvi')
    }
  }

  async function handleWhatsApp() {
    const settings = await getSettings()
    const msg = settings.whatsappTemplate
      .replace('{name}', customer!.name)
      .replace('{girviId}', girvi!.girviCode)
      .replace('{amount}', formatCurrency(girvi!.outstandingAmount))
      .replace('{dueDate}', formatDate(girvi!.dueDate))
    window.open(`https://wa.me/91${customer!.mobile}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <p className="font-bold text-gold-600 font-mono text-sm">{girvi.girviCode}</p>
            <p className="text-xs text-gray-400">{formatDate(girvi.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('badge', statusColor(girvi.status))}>{girvi.status}</span>
          <div className="relative">
            <button onClick={() => setShowMoreMenu(m => !m)} className="p-2 hover:bg-gray-100 rounded-xl">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-2xl shadow-modal w-48 overflow-hidden z-20">
                {[
                  { icon: <Download className="w-4 h-4" />, label: 'Download Receipt', action: handleDownloadReceipt },
                  { icon: <Share2 className="w-4 h-4" />, label: 'WhatsApp Reminder', action: handleWhatsApp },
                  ...(girvi.status !== 'closed'
                    ? [{ icon: <XCircle className="w-4 h-4 text-red-500" />, label: 'Close Girvi', action: handleCloseGirvi }]
                    : []),
                ].map((item, i) => (
                  <button key={i} onClick={() => { item.action(); setShowMoreMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 page-enter">
        {/* Overdue Alert */}
        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Overdue by {Math.abs(daysUntilDue)} days</p>
              <p className="text-xs text-red-600 mt-0.5">Penalty interest may apply.</p>
            </div>
          </div>
        )}

        {/* Customer Card */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gold-100 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {customer.photo
                  ? <img src={customer.photo} className="w-full h-full object-cover" alt="" />
                  : <span className="font-display font-bold text-gold-600 text-xl">{customer.name[0]}</span>}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-900">{customer.name}</p>
                  {customer.isVIP && <span className="text-base">👑</span>}
                </div>
                <p className="text-sm text-gray-500">{customer.mobile}</p>
                <p className="text-xs text-gray-400 mt-0.5">{customer.address}, {customer.city}</p>
              </div>
            </div>
            <button onClick={() => window.open(`tel:${customer.mobile}`)}
              className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-600" />
            </button>
          </div>
          {(customer.panNumber || customer.aadhaarNumber) && (
            <div className="flex gap-4 pt-3 border-t border-gray-100">
              {customer.panNumber && (
                <div>
                  <p className="text-[10px] text-gray-400">PAN</p>
                  <p className="font-mono text-xs font-semibold text-gray-700">{customer.panNumber}</p>
                </div>
              )}
              {customer.aadhaarNumber && (
                <div>
                  <p className="text-[10px] text-gray-400">Aadhaar</p>
                  <p className="font-mono text-xs font-semibold text-gray-700">XXXX-XXXX-{customer.aadhaarNumber.slice(-4)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loan Summary */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 p-4">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide mb-3">Loan Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/70 text-xs">Principal Amount</p>
                <p className="text-white font-mono font-bold text-xl">{formatCurrency(girvi.principalAmount)}</p>
              </div>
              <div>
                <p className="text-white/70 text-xs">Outstanding</p>
                <p className="text-yellow-200 font-mono font-bold text-xl">{formatCurrency(girvi.outstandingAmount)}</p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Interest Rate</p>
              <p className="font-mono font-bold text-gray-800">{girvi.interestRate}% p.a.</p>
              <p className="text-xs text-gray-400 capitalize">{girvi.interestType}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Tenure</p>
              <p className="font-mono font-bold text-gray-800">{girvi.tenureMonths} Months</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="font-semibold text-sm text-gray-800">{formatDate(girvi.startDate)}</p>
            </div>
            <div className={cn('rounded-xl p-3', isOverdue ? 'bg-red-50' : daysUntilDue <= 7 ? 'bg-orange-50' : 'bg-gray-50')}>
              <p className="text-xs text-gray-500">Due Date</p>
              <p className={cn('font-semibold text-sm', isOverdue ? 'text-red-600' : daysUntilDue <= 7 ? 'text-orange-600' : 'text-gray-800')}>
                {formatDate(girvi.dueDate)}
              </p>
              <p className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-gray-400')}>
                {isOverdue ? `Overdue ${Math.abs(daysUntilDue)}d` : `${daysUntilDue}d left`}
              </p>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Interest Accrued</span>
              <span className="font-mono font-semibold text-gray-800">{formatCurrency(interestAccrued)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Paid</span>
              <span className="font-mono font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-700">Risk Level</span>
              <span className={cn('badge', riskColor(girvi.riskLevel))}>
                <Shield className="w-3 h-3" />
                {girvi.riskLevel.charAt(0).toUpperCase() + girvi.riskLevel.slice(1)} Risk
              </span>
            </div>
          </div>
        </div>

        {/* Ornaments */}
        <div className="card p-4">
          <p className="section-title mb-3"><Gem className="w-4 h-4 text-gold-500" /> Ornaments ({girvi.ornaments.length})</p>
          <div className="space-y-3">
            {girvi.ornaments.map((orn) => (
              <div key={orn.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => setExpandedOrn(expandedOrn === orn.id ? null : orn.id)}>
                  <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {orn.photo
                      ? <img src={orn.photo} className="w-full h-full object-cover" alt="" />
                      : <span className="text-lg">💍</span>}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{orn.productName}</p>
                    <p className="text-xs text-gray-500">{orn.metal} • {orn.purity} • {orn.pieces} pcs</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-gold-700">{formatCurrency(orn.estimatedValue)}</p>
                    <p className="text-xs text-gray-400">{formatWeight(orn.netWeight)} net</p>
                  </div>
                  {expandedOrn === orn.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {expandedOrn === orn.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">Gross</p>
                        <p className="font-mono text-xs font-bold">{orn.grossWeight}g</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">Less</p>
                        <p className="font-mono text-xs font-bold">{orn.lessWeight}g</p>
                      </div>
                      <div className="bg-gold-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">Net</p>
                        <p className="font-mono text-xs font-bold text-gold-700">{orn.netWeight}g</p>
                      </div>
                    </div>
                    {orn.description && <p className="text-xs text-gray-500 mt-2">{orn.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="card p-4">
          <p className="section-title mb-3"><CreditCard className="w-4 h-4 text-gold-500" /> Payment History</p>
          {(payments ?? []).length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(payments ?? []).map((p: Payment) => <PaymentRow key={p.id} payment={p} />)}
            </div>
          )}
        </div>

        {girvi.remarks && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Remarks</p>
            <p className="text-sm text-gray-700">{girvi.remarks}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {girvi.status !== 'closed' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 p-4"
             style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex gap-3">
            <button onClick={handleDownloadReceipt} className="btn-outline flex-1 text-xs px-3">
              <Download className="w-4 h-4" /> Receipt
            </button>
            <button onClick={handleWhatsApp} className="btn-outline flex-1 text-xs px-3">
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>
            <button onClick={() => navigate(`/girvi/${id}/payment`)} className="btn-primary flex-[2]">
              <CreditCard className="w-4 h-4" /> Collect Payment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentRow({ payment }: { payment: Payment }) {
  const modeColors: Record<string, string> = {
    cash: 'bg-green-50 text-green-700', upi: 'bg-blue-50 text-blue-700',
    bank: 'bg-purple-50 text-purple-700', cheque: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-gray-800">{formatCurrency(payment.amount)}</p>
          <span className={cn('badge text-[10px]', modeColors[payment.mode] ?? 'bg-gray-100 text-gray-600')}>
            {payment.mode.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-gray-500">{formatDateTime(payment.paymentDate)}</p>
        <div className="flex gap-3 mt-0.5">
          {payment.interestAmount > 0 && <p className="text-[10px] text-blue-500">Int: {formatCurrency(payment.interestAmount)}</p>}
          {payment.principalAmount > 0 && <p className="text-[10px] text-green-500">Prin: {formatCurrency(payment.principalAmount)}</p>}
          {payment.penaltyAmount > 0 && <p className="text-[10px] text-red-500">Penalty: {formatCurrency(payment.penaltyAmount)}</p>}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">Balance: {formatCurrency(payment.balanceAfter)} • {payment.receiptNo}</p>
      </div>
    </div>
  )
}
