import { differenceInDays, format, formatDistanceToNow } from 'date-fns'
import type { RiskLevel, Girvi } from '@/types'

// ─── SHA-256 Hash ─────────────────────────────────────────────────────────────
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── UUID ─────────────────────────────────────────────────────────────────────
export function uuid(): string {
  return crypto.randomUUID()
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatWeight(grams: number): string {
  return `${grams.toFixed(3)} g`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy, hh:mm a')
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatIndianNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

// ─── Calculations ─────────────────────────────────────────────────────────────
export const PURITY_MAP: Record<string, number> = {
  '24K': 1.0000,
  '22K': 0.9167,
  '916': 0.9160,
  '18K': 0.7500,
  '750': 0.7500,
  '14K': 0.5833,
  '585': 0.5833,
  '10K': 0.4167,
  '375': 0.3750,
}

export function calcNetWeight(gross: number, less: number): number {
  return Math.max(0, Math.round((gross - less) * 1000) / 1000)
}

export function calcEstimatedValue(
  netWeight: number,
  goldRate22K: number,
  purity: string
): number {
  const factor = PURITY_MAP[purity] ?? 0.9167
  const rate24K = goldRate22K / (22 / 24)
  return Math.round(netWeight * rate24K * factor)
}

export function calcSilverValue(netWeight: number, silverRate: number): number {
  return Math.round(netWeight * silverRate)
}

export function calcSimpleInterest(
  principal: number,
  ratePerAnnum: number,
  months: number
): number {
  return Math.round(principal * (ratePerAnnum / 100) * (months / 12))
}

export function calcMonthlyInterest(
  principal: number,
  ratePerAnnum: number
): number {
  return Math.round(principal * (ratePerAnnum / 100) / 12)
}

export function calcEMI(
  principal: number,
  ratePerAnnum: number,
  months: number
): number {
  if (months === 0) return principal
  const r = ratePerAnnum / (12 * 100)
  if (r === 0) return Math.round(principal / months)
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  return Math.round(emi)
}

export function calcPenaltyInterest(
  outstanding: number,
  penaltyRatePerAnnum: number,
  daysOverdue: number
): number {
  if (daysOverdue <= 0) return 0
  return Math.round(outstanding * (penaltyRatePerAnnum / 100) * (daysOverdue / 365))
}

export function calcInterestAccrued(girvi: Girvi): number {
  const daysSinceStart = differenceInDays(new Date(), new Date(girvi.startDate))
  const monthsElapsed = daysSinceStart / 30
  return calcSimpleInterest(girvi.principalAmount, girvi.interestRate, monthsElapsed)
}

export function calcRiskLevel(
  outstandingAmount: number,
  estimatedValue: number,
  dueDate: Date | string
): RiskLevel {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const daysOverdue = differenceInDays(new Date(), due)
  const ltv = outstandingAmount / Math.max(estimatedValue, 1)
  if (daysOverdue > 30 || ltv > 0.85) return 'high'
  if (daysOverdue > 0 || ltv > 0.70) return 'medium'
  return 'low'
}

export function calcDaysUntilDue(dueDate: Date | string): number {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  return differenceInDays(due, new Date())
}

export function calcLTV(principal: number, estimatedValue: number): number {
  return Math.round((principal / Math.max(estimatedValue, 1)) * 100)
}

// ─── Girvi Code ───────────────────────────────────────────────────────────────
export function generateGirviCode(sequence: number): string {
  const year = new Date().getFullYear()
  return `GIRVI-${year}-${String(sequence).padStart(4, '0')}`
}

export function generateReceiptNo(): string {
  const ts = Date.now().toString(36).toUpperCase()
  return `RCP-${ts}`
}

// ─── Validators ───────────────────────────────────────────────────────────────
export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile)
}

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)
}

export function isValidAadhaar(aadhaar: string): boolean {
  return /^\d{12}$/.test(aadhaar.replace(/\s/g, ''))
}

export function isValidPincode(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

// ─── Class Names ──────────────────────────────────────────────────────────────
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Status Colors ────────────────────────────────────────────────────────────
export function statusColor(status: string): string {
  switch (status) {
    case 'active':  return 'text-success bg-success/10'
    case 'overdue': return 'text-danger bg-danger/10'
    case 'closed':  return 'text-gray-500 bg-gray-100'
    case 'draft':   return 'text-gray-400 bg-gray-50'
    default:        return 'text-gray-500 bg-gray-100'
  }
}

export function riskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low':    return 'text-success bg-success/10'
    case 'medium': return 'text-warning bg-warning/10'
    case 'high':   return 'text-danger bg-danger/10'
  }
}

// ─── Image helpers ────────────────────────────────────────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// ─── Indian States ────────────────────────────────────────────────────────────
export const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]

export const PURITY_OPTIONS = ['24K','22K','916','18K','750','14K','585']

export const RELATION_OPTIONS = [
  'Father','Mother','Spouse','Son','Daughter',
  'Brother','Sister','Friend','Other',
]
