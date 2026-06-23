import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CreditCard, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { db, getSettings } from '@/db/database'
import { generatePaymentReceiptPDF } from '@/services/pdfService'
import {
  calcSimpleInterest, calcPenaltyInterest, generateReceiptNo,
  formatCurrency, cn
} from '@/utils'
import { differenceInDays, format } from 'date-fns'
import toast from 'react-hot-toast'
import type { CollectPaymentFormData } from '@/types'

const schema = z.object({
  paymentDate: z.string(),
  amount: z.coerce.number().min(1, 'Enter payment amount'),
  mode: z.enum(['cash', 'upi', 'bank', 'cheque']),
  referenceNo: z.string().optional(),
  paymentType: z.enum(['interest', 'principal', 'both', 'closure']),
  notes: z.string().optional(),
})

export default function CollectPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const girvi = useLiveQuery(() => id ? db.girvis.get(Number(id)) : undefined, [id])
  const customer = useLiveQuery(() => girvi?.customerId ? db.customers.get(girvi.customerId) : undefined, [girvi])

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CollectPaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      paymentType: 'both',
    },
  })

  const watchedAmount = watch('amount')
  const watchedType = watch('paymentType')
  const watchedMode = watch('mode')

  if (!girvi || !customer) {
    return <div className="min-h-screen flex items-center justify-center"><div className="skeleton w-48 h-8" /></div>
  }

  const daysOverdue = Math.max(0, differenceInDays(new Date(), new Date(girvi.dueDate)))
  const monthsElapsed = differenceInDays(new Date(), new Date(girvi.startDate)) / 30
  const interestDue = calcSimpleInterest(girvi.principalAmount, girvi.interestRate, monthsElapsed) - girvi.totalInterestPaid
  const penaltyDue = calcPenaltyInterest(girvi.outstandingAmount, 3, daysOverdue)
  const totalDue = girvi.outstandingAmount + Math.max(0, interestDue) + penaltyDue

  // Auto-split calculation
  const amount = Number(watchedAmount) || 0
  let splitInterest = 0, splitPrincipal = 0, splitPenalty = 0

  if (watchedType === 'closure') {
    splitInterest = Math.max(0, interestDue)
    splitPenalty = penaltyDue
    splitPrincipal = girvi.outstandingAmount
  } else if (watchedType === 'interest') {
    splitInterest = Math.min(amount, Math.max(0, interestDue))
  } else if (watchedType === 'principal') {
    splitPrincipal = Math.min(amount, girvi.outstandingAmount)
  } else { // both
    splitInterest = Math.min(amount, Math.max(0, interestDue))
    splitPenalty = Math.min(Math.max(0, amount - splitInterest), penaltyDue)
    splitPrincipal = Math.max(0, amount - splitInterest - splitPenalty)
  }

  const balanceAfter = Math.max(0, girvi.outstandingAmount - splitPrincipal)

  const onSubmit = async (data: CollectPaymentFormData) => {
    setSaving(true)
    try {
      const finalAmount = data.paymentType === 'closure' ? totalDue : data.amount
      const finalBalance = data.paymentType === 'closure' ? 0 : balanceAfter
      const isClosed = finalBalance === 0 || data.paymentType === 'closure'
      const receiptNo = generateReceiptNo()
      const now = new Date()

      const payment = await db.payments.add({
        girviId: girvi.id!,
        customerId: girvi.customerId,
        paymentDate: new Date(data.paymentDate),
        amount: finalAmount,
        mode: data.mode,
        referenceNo: data.referenceNo,
        paymentType: data.paymentType,
        interestAmount: splitInterest,
        principalAmount: data.paymentType === 'closure' ? girvi.outstandingAmount : splitPrincipal,
        penaltyAmount: splitPenalty,
        balanceAfter: finalBalance,
        notes: data.notes,
        receiptNo,
        createdAt: now,
      })

      await db.girvis.update(girvi.id!, {
        outstandingAmount: finalBalance,
        totalInterestPaid: girvi.totalInterestPaid + splitInterest,
        totalPrincipalPaid: girvi.totalPrincipalPaid + (data.paymentType === 'closure' ? girvi.outstandingAmount : splitPrincipal),
        status: isClosed ? 'closed' : girvi.status,
        closedAt: isClosed ? now : undefined,
        updatedAt: now,
      })

      toast.success('Payment recorded!')

      // Download receipt
      try {
        const settings = await getSettings()
        const pmt = await db.payments.get(payment)
        if (pmt) generatePaymentReceiptPDF(pmt, girvi, customer, settings)
      } catch { /* receipt download failure is non-critical */ }

      navigate(`/girvi/${id}`)
    } catch (err) {
      toast.error('Failed to record payment')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Collect Payment</h1>
          <p className="text-xs text-gold-600 font-mono">{girvi.girviCode}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 page-enter">
        {/* Girvi mini summary */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center">
              <span className="font-bold text-gold-600">{customer.name[0]}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{customer.name}</p>
              <p className="text-xs text-gray-500">{customer.mobile}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="font-mono font-bold text-red-500">{formatCurrency(girvi.outstandingAmount)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Interest Due</p>
              <p className="font-mono font-bold text-orange-500">{formatCurrency(Math.max(0, interestDue))}</p>
            </div>
            {penaltyDue > 0 && (
              <div className="bg-red-50 rounded-xl p-3 col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <p className="text-xs text-red-600 font-semibold">Penalty ({daysOverdue} days overdue)</p>
                </div>
                <p className="font-mono font-bold text-red-600">{formatCurrency(penaltyDue)}</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total Due</span>
            <span className="font-mono font-bold text-gray-900">{formatCurrency(totalDue)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="card p-4 space-y-4">
            {/* Payment Type */}
            <div>
              <label className="label">Payment Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { val: 'both', label: 'Interest + Principal' },
                  { val: 'interest', label: 'Interest Only' },
                  { val: 'principal', label: 'Principal Only' },
                  { val: 'closure', label: '⚡ Full Closure' },
                ] as const).map(t => (
                  <button key={t.val} type="button"
                    onClick={() => setValue('paymentType', t.val)}
                    className={cn('px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all text-center',
                      watchedType === t.val
                        ? 'bg-gold-500 text-white border-gold-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300')}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            {watchedType !== 'closure' && (
              <div>
                <label className="label">Payment Amount (₹) *</label>
                <input {...register('amount')} type="number" inputMode="numeric"
                  className={cn('input font-mono text-xl font-bold', errors.amount && 'input-error')}
                  placeholder="0" />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
              </div>
            )}

            {/* Full closure amount display */}
            {watchedType === 'closure' && (
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                <p className="text-sm text-gold-700 font-semibold mb-1">Full Settlement Amount</p>
                <p className="font-mono font-bold text-2xl text-gold-800">{formatCurrency(totalDue)}</p>
                <p className="text-xs text-gray-500 mt-1">Includes principal + interest + penalty</p>
              </div>
            )}

            {/* Split preview */}
            {(amount > 0 || watchedType === 'closure') && (
              <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 mb-2">Payment Split</p>
                {splitInterest > 0 && <SplitRow label="Interest" amount={splitInterest} color="text-blue-600" />}
                {splitPenalty > 0 && <SplitRow label="Penalty" amount={splitPenalty} color="text-red-500" />}
                {splitPrincipal > 0 && <SplitRow label="Principal" amount={splitPrincipal} color="text-green-600" />}
                <div className="pt-1.5 border-t border-blue-100 flex justify-between">
                  <span className="text-xs font-bold text-gray-700">Balance After</span>
                  <span className={cn('font-mono font-bold text-sm', balanceAfter === 0 ? 'text-green-600' : 'text-gray-800')}>
                    {balanceAfter === 0 ? '✓ Fully Settled' : formatCurrency(balanceAfter)}
                  </span>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="label">Payment Date *</label>
              <input {...register('paymentDate')} type="date" className="input" max={format(new Date(), 'yyyy-MM-dd')} />
            </div>

            {/* Mode */}
            <div>
              <label className="label">Payment Mode *</label>
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'upi', 'bank', 'cheque'] as const).map(m => (
                  <button key={m} type="button"
                    onClick={() => setValue('mode', m)}
                    className={cn('py-2.5 rounded-xl text-xs font-semibold border transition-all',
                      watchedMode === m ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200')}>
                    {m === 'cash' ? '💵' : m === 'upi' ? '📱' : m === 'bank' ? '🏦' : '📄'}<br />{m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference No (for non-cash) */}
            {watchedMode !== 'cash' && (
              <div>
                <label className="label">{watchedMode === 'upi' ? 'UPI Reference' : watchedMode === 'cheque' ? 'Cheque Number' : 'Transaction ID'}</label>
                <input {...register('referenceNo')} className="input" placeholder="Enter reference number" />
              </div>
            )}

            <div>
              <label className="label">Notes (Optional)</label>
              <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Any notes..." />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-[2]" disabled={saving}>
              {saving
                ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                : <><CheckCircle2 className="w-4 h-4" /> Collect & Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SplitRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={cn('font-mono text-xs font-semibold', color)}>{formatCurrency(amount)}</span>
    </div>
  )
}
