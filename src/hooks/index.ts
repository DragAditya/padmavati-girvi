import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { fetchGoldRate, type RateResult } from '@/services/goldRateService'
import { calcRiskLevel, calcDaysUntilDue } from '@/utils'
import type { DashboardStats, Insight, Customer } from '@/types'
import { differenceInDays } from 'date-fns'

// ─── useGoldRate ──────────────────────────────────────────────────────────────
export function useGoldRate() {
  const [rate, setRate] = useState<RateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchGoldRate()
      setRate(r)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { rate, loading, error, refresh }
}

// ─── useOffline ───────────────────────────────────────────────────────────────
export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return isOffline
}

// ─── useDashboardStats ────────────────────────────────────────────────────────
export function useDashboardStats(): DashboardStats | undefined {
  return useLiveQuery(async (): Promise<DashboardStats> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [allGirvis, allCustomers, allPayments] = await Promise.all([
      db.girvis.toArray(),
      db.customers.count(),
      db.payments.toArray(),
    ])

    // Update overdue status
    for (const g of allGirvis) {
      if (g.status === 'active' && new Date(g.dueDate) < new Date()) {
        if (g.id) await db.girvis.update(g.id, { status: 'overdue', updatedAt: new Date() })
      }
    }

    const active = allGirvis.filter(g => g.status === 'active')
    const overdue = allGirvis.filter(g => g.status === 'overdue')
    const closed = allGirvis.filter(g => g.status === 'closed')
    const newToday = allGirvis.filter(g => new Date(g.createdAt) >= today)
    const closedToday = allGirvis.filter(g => g.closedAt && new Date(g.closedAt) >= today)
    const dueToday = active.filter(g => {
      const d = new Date(g.dueDate)
      return d >= today && d < tomorrow
    })

    const todayPayments = allPayments.filter(p => new Date(p.paymentDate) >= today)
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const newCustomersMonth = await db.customers.where('createdAt').above(thisMonthStart).count()

    const outstandingAmount = [...active, ...overdue].reduce((s, g) => s + g.outstandingAmount, 0)
    const overdueAmount = overdue.reduce((s, g) => s + g.outstandingAmount, 0)
    const dueTodayAmount = dueToday.reduce((s, g) => s + g.outstandingAmount, 0)
    const todayCollection = todayPayments.reduce((s, p) => s + p.amount, 0)
    const todayInterest = todayPayments.reduce((s, p) => s + p.interestAmount, 0)
    const totalGoldWeight = [...active, ...overdue].reduce((s, g) => s + g.netGoldWeight, 0)
    const totalSilverWeight = [...active, ...overdue].reduce((s, g) => s + g.netSilverWeight, 0)

    return {
      activeGirvi: active.length,
      closedGirvi: closed.length,
      totalCustomers: allCustomers,
      outstandingAmount,
      todayCollection,
      todayInterest,
      dueTodayCount: dueToday.length,
      dueTodayAmount,
      overdueCount: overdue.length,
      overdueAmount,
      totalGoldWeight: Math.round(totalGoldWeight * 1000) / 1000,
      totalSilverWeight: Math.round(totalSilverWeight * 1000) / 1000,
      newGirviToday: newToday.length,
      newGirviClosed: closedToday.length,
      newCustomersMonth,
    }
  })
}

// ─── useInsights ──────────────────────────────────────────────────────────────
export function useInsights(): Insight[] {
  return useLiveQuery<Insight[]>(async (): Promise<Insight[]> => {
    const result: Insight[] = []
    const girvis = await db.girvis.where('status').anyOf(['active', 'overdue']).toArray()

    const unpaid30 = girvis.filter(g => differenceInDays(new Date(), new Date(g.updatedAt)) > 30)
    if (unpaid30.length > 0)
      result.push({ id: 'unpaid30', text: `${unpaid30.length} customers haven't paid for 30+ days`, type: 'warning', actionLabel: 'Tap to view' })

    const dueSoon = girvis.filter(g => { const d = calcDaysUntilDue(g.dueDate); return d >= 0 && d <= 7 })
    if (dueSoon.length > 0)
      result.push({ id: 'duesoon', text: `${dueSoon.length} girvis due within 7 days`, type: 'info', actionLabel: 'Tap to view' })

    const overdue = girvis.filter(g => g.status === 'overdue')
    if (overdue.length > 0)
      result.push({ id: 'overdue', text: `${overdue.length} girvis are overdue`, type: 'warning', actionLabel: 'View overdue' })

    return result
  }, [], []) ?? []
}

// ─── useCustomerSearch ────────────────────────────────────────────────────────
export function useCustomerSearch(query: string): Customer[] {
  return useLiveQuery<Customer[]>(async (): Promise<Customer[]> => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const all = await db.customers.toArray()
    return all.filter(c =>
      c.name.toLowerCase().includes(q) || c.mobile.includes(q)
    ).slice(0, 8)
  }, [query], []) ?? []
}

// ─── useRiskUpdate ────────────────────────────────────────────────────────────
export function useRiskUpdate() {
  useEffect(() => {
    async function updateRisk() {
      try {
        const girvis = await db.girvis.where('status').anyOf(['active', 'overdue']).toArray()
        for (const g of girvis) {
          const newRisk = calcRiskLevel(g.outstandingAmount, g.estimatedValue, g.dueDate)
          if (newRisk !== g.riskLevel && g.id) {
            await db.girvis.update(g.id, { riskLevel: newRisk })
          }
        }
      } catch {
        // Non-critical
      }
    }
    updateRisk()
  }, [])
}
