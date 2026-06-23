import { db, updateSettings } from '@/db/database'
import * as XLSX from 'xlsx'
import { formatDate } from '@/utils'
import type { Customer, Girvi, Payment } from '@/types'

const BACKUP_VERSION = '1.0'

export async function exportJSON(): Promise<void> {
  const data = await collectAllData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `Padmavati_Backup_${today()}.json`)
  await updateSettings({ lastBackupAt: new Date() })
}

export interface ImportResult {
  customers: number
  girvis: number
  payments: number
}

export async function importJSON(file: File): Promise<ImportResult> {
  const text = await file.text()
  let data: any

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid file: not valid JSON')
  }

  if (!data.version || !Array.isArray(data.customers) || !Array.isArray(data.girvis)) {
    throw new Error('Invalid backup file format.')
  }

  const dateKeys = ['createdAt','updatedAt','startDate','dueDate','closedAt','paymentDate','date','lastBackupAt']
  const fixDates = (obj: any): any => {
    const result = { ...obj }
    for (const key of dateKeys) {
      if (result[key] && typeof result[key] === 'string') {
        result[key] = new Date(result[key])
      }
    }
    return result
  }

  await db.transaction('rw', [db.customers, db.girvis, db.payments], async () => {
    await db.customers.clear()
    await db.girvis.clear()
    await db.payments.clear()

    const customers = data.customers.map((c: any) => {
      const { id: _id, ...rest } = c
      return fixDates(rest) as Customer
    })
    const girvis = data.girvis.map((g: any) => {
      const { id: _id, ...rest } = g
      return fixDates(rest) as Girvi
    })
    const payments = data.payments.map((p: any) => {
      const { id: _id, ...rest } = p
      return fixDates(rest) as Payment
    })

    await db.customers.bulkAdd(customers)
    await db.girvis.bulkAdd(girvis)
    await db.payments.bulkAdd(payments)
  })

  return {
    customers: data.customers.length,
    girvis: data.girvis.length,
    payments: data.payments.length,
  }
}

export async function exportExcel(): Promise<void> {
  const [customers, girvis, payments] = await Promise.all([
    db.customers.toArray(),
    db.girvis.toArray(),
    db.payments.toArray(),
  ])

  const wb = XLSX.utils.book_new()

  const custData = customers.map(c => ({
    'Name': c.name,
    'Mobile': c.mobile,
    'Address': c.address,
    'City': c.city,
    'State': c.state,
    'Pincode': c.pincode,
    'PAN Number': c.panNumber ?? '',
    'Aadhaar Number': c.aadhaarNumber ?? '',
    'VIP': c.isVIP ? 'Yes' : 'No',
    'Customer Since': formatDate(c.createdAt),
  }))
  const custSheet = XLSX.utils.json_to_sheet(custData)
  XLSX.utils.book_append_sheet(wb, custSheet, 'Customers')

  const girviData = girvis.map(g => ({
    'Girvi ID': g.girviCode,
    'Status': g.status.toUpperCase(),
    'Net Gold Weight (g)': g.netGoldWeight,
    'Estimated Value (₹)': g.estimatedValue,
    'Principal Amount (₹)': g.principalAmount,
    'Outstanding (₹)': g.outstandingAmount,
    'Interest Rate (%)': g.interestRate,
    'Tenure (Months)': g.tenureMonths,
    'Start Date': formatDate(g.startDate),
    'Due Date': formatDate(g.dueDate),
    'Risk Level': g.riskLevel.toUpperCase(),
  }))
  const girviSheet = XLSX.utils.json_to_sheet(girviData)
  XLSX.utils.book_append_sheet(wb, girviSheet, 'Girvis')

  const payData = payments.map(p => ({
    'Receipt No': p.receiptNo,
    'Payment Date': formatDate(p.paymentDate),
    'Amount (₹)': p.amount,
    'Mode': p.mode.toUpperCase(),
    'Payment Type': p.paymentType,
    'Interest (₹)': p.interestAmount,
    'Principal (₹)': p.principalAmount,
    'Penalty (₹)': p.penaltyAmount,
    'Balance After (₹)': p.balanceAfter,
  }))
  const paySheet = XLSX.utils.json_to_sheet(payData)
  XLSX.utils.book_append_sheet(wb, paySheet, 'Payments')

  XLSX.writeFile(wb, `Padmavati_Export_${today()}.xlsx`)
  await updateSettings({ lastBackupAt: new Date() })
}

export async function backupToGoogleDrive(accessToken: string): Promise<void> {
  const data = await collectAllData()
  const content = JSON.stringify(data, null, 2)
  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `padmavati_backup_${date}.json`

  const metadata = { name: filename, mimeType: 'application/json', parents: ['appDataFolder'] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'application/json' }))

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })

  if (!res.ok) throw new Error('Google Drive upload failed')
  await updateSettings({ lastBackupAt: new Date() })
}

async function collectAllData() {
  const [customers, girvis, payments, goldRates, settings] = await Promise.all([
    db.customers.toArray(),
    db.girvis.toArray(),
    db.payments.toArray(),
    db.goldRates.toArray(),
    db.settings.toArray(),
  ])
  const sanitizedCustomers = customers.map(({ photo, panPhoto, aadhaarFront, aadhaarBack, ...rest }) => rest)
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    customers: sanitizedCustomers,
    girvis,
    payments,
    goldRates,
    settings: settings.map(s => ({ ...s, passwordHash: '[REDACTED]' })),
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}
