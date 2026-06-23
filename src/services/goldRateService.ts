import { db } from '@/db/database'

const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

export interface RateResult {
  gold22K: number
  gold24K: number
  gold18K: number
  silverRate: number
  source: string
  isStale: boolean
  lastUpdated: Date
}

const FALLBACK_RATES = {
  gold22K: 6800,
  gold24K: 7400,
  gold18K: 5550,
  silverRate: 85,
}

export async function fetchGoldRate(): Promise<RateResult> {
  const cached = await db.goldRates.orderBy('date').last()
  const cacheAge = cached ? Date.now() - new Date(cached.date).getTime() : Infinity
  const isStale = cacheAge > CACHE_DURATION_MS

  if (!isStale && cached) {
    return {
      gold22K: cached.gold22K,
      gold24K: cached.gold24K,
      gold18K: cached.gold18K,
      silverRate: cached.silverRate,
      source: cached.source,
      isStale: false,
      lastUpdated: new Date(cached.date),
    }
  }

  // Try to get API key from import.meta.env safely
  let apiKey = ''
  try {
    apiKey = (import.meta as any).env?.VITE_GOLD_API_KEY ?? ''
  } catch {
    apiKey = ''
  }

  if (apiKey && apiKey !== 'your_goldapi_key_here') {
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch('https://www.goldapi.io/api/XAU/INR', {
          headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
        }),
        fetch('https://www.goldapi.io/api/XAG/INR', {
          headers: { 'x-access-token': apiKey },
          signal: AbortSignal.timeout(5000),
        }),
      ])

      if (goldRes.ok && silverRes.ok) {
        const goldData = await goldRes.json()
        const silverData = await silverRes.json()

        const gold24K = Math.round(goldData.price / 31.1035)
        const gold22K = Math.round(gold24K * (22 / 24))
        const gold18K = Math.round(gold24K * (18 / 24))
        const silverRate = Math.round(silverData.price / 31.1035)

        const rate = { gold22K, gold24K, gold18K, silverRate, source: 'goldapi.io' }
        await saveRate(rate)
        return { ...rate, isStale: false, lastUpdated: new Date() }
      }
    } catch {
      // Fall through
    }
  }

  if (cached) {
    return {
      gold22K: cached.gold22K,
      gold24K: cached.gold24K,
      gold18K: cached.gold18K,
      silverRate: cached.silverRate,
      source: `${cached.source} (cached)`,
      isStale: true,
      lastUpdated: new Date(cached.date),
    }
  }

  return {
    ...FALLBACK_RATES,
    source: 'manual-fallback',
    isStale: true,
    lastUpdated: new Date(),
  }
}

export async function saveManualRate(gold22K: number, silverRate: number): Promise<void> {
  const gold24K = Math.round(gold22K / (22 / 24))
  const gold18K = Math.round(gold24K * (18 / 24))
  await saveRate({ gold22K, gold24K, gold18K, silverRate, source: 'manual' })
}

async function saveRate(rate: {
  gold22K: number; gold24K: number; gold18K: number
  silverRate: number; source: string
}): Promise<void> {
  await db.goldRates.add({ date: new Date(), ...rate })
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const old = await db.goldRates.where('date').below(cutoff).toArray()
  if (old.length > 0) {
    await db.goldRates.bulkDelete(old.map(r => r.id!))
  }
}

export async function getGoldRateHistory(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return db.goldRates.where('date').above(cutoff).toArray()
}
