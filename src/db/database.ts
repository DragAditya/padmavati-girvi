import Dexie, { type Table } from 'dexie'
import type { Customer, Girvi, Payment, GoldRate, AppSettings } from '@/types'

export class PadmavatiDB extends Dexie {
  customers!: Table<Customer>
  girvis!: Table<Girvi>
  payments!: Table<Payment>
  goldRates!: Table<GoldRate>
  settings!: Table<AppSettings>

  constructor() {
    super('PadmavatiGirviDB')

    this.version(1).stores({
      customers: '++id, mobile, name, city, state, isVIP, createdAt',
      girvis:    '++id, girviCode, customerId, status, dueDate, riskLevel, createdAt',
      payments:  '++id, girviId, customerId, paymentDate, mode, createdAt',
      goldRates: '++id, date',
      settings:  '++id',
    })

    // Seed default settings on first use
    this.on('ready', async () => {
      const count = await this.settings.count()
      if (count === 0) {
        await this.settings.add({
          shopName: 'Padmavati Jewellers',
          ownerName: '',
          address: '',
          phone: '',
          gstin: '',
          logo: '',
          defaultInterestRate: 2.5,
          interestType: 'simple',
          calculationMethod: 'monthly',
          penaltyRate: 3,
          maxLTV: 75,
          defaultTenure: 12,
          username: 'admin',
          passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password'
          theme: 'light',
          googleDriveConnected: false,
          autoBackupSchedule: 'daily',
          receiptFooter: 'Thank you for choosing Padmavati Jewellers. Terms & conditions apply.',
          whatsappTemplate: 'Dear {name}, your Girvi {girviId} of ₹{amount} is due on {dueDate}. Please visit us to make payment. - Padmavati Jewellers',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    })
  }
}

export const db = new PadmavatiDB()

// ─── DB Helper Functions ──────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.toCollection().first()
  if (!s) throw new Error('Settings not found')
  return s
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  const s = await db.settings.toCollection().first()
  if (!s?.id) throw new Error('Settings not found')
  await db.settings.update(s.id, { ...partial, updatedAt: new Date() })
}

export async function getNextGirviCode(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await db.girvis.count()
  return `GIRVI-${year}-${String(count + 1).padStart(4, '0')}`
}

export async function getCustomerWithGirvis(customerId: number) {
  const customer = await db.customers.get(customerId)
  const girvis = await db.girvis.where('customerId').equals(customerId).toArray()
  const payments = await db.payments.where('customerId').equals(customerId).toArray()
  return { customer, girvis, payments }
}
