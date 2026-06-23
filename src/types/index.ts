// ─── Customer ────────────────────────────────────────────────────────────────
export interface Customer {
  id?: number
  name: string
  mobile: string
  address: string
  pincode: string
  city: string
  state: string
  relativeName?: string
  relation?: string
  photo?: string        // base64
  panNumber?: string
  aadhaarNumber?: string
  panPhoto?: string     // base64
  aadhaarFront?: string // base64
  aadhaarBack?: string  // base64
  isVIP: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ─── Ornament ─────────────────────────────────────────────────────────────────
export interface Ornament {
  id: string            // uuid v4
  productName: string
  metal: 'Gold' | 'Silver' | 'Other'
  purity: string
  pieces: number
  grossWeight: number
  lessWeight: number
  netWeight: number
  description?: string
  estimatedValue: number
  photo?: string        // base64
}

// ─── Girvi ────────────────────────────────────────────────────────────────────
export type GirviStatus = 'draft' | 'active' | 'overdue' | 'closed'
export type InterestType = 'simple' | 'compound' | 'reducing'
export type CalcMethod = 'monthly' | 'daily' | 'yearly'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface Girvi {
  id?: number
  girviCode: string
  referenceNo?: string
  customerId: number
  status: GirviStatus
  ornaments: Ornament[]
  netGoldWeight: number
  netSilverWeight: number
  goldRateAtTime: number
  estimatedValue: number
  principalAmount: number
  interestRate: number
  interestType: InterestType
  calculationMethod: CalcMethod
  emiRequired: boolean
  tenureMonths: number
  startDate: Date
  dueDate: Date
  remarks?: string
  totalInterestPaid: number
  totalPrincipalPaid: number
  outstandingAmount: number
  riskLevel: RiskLevel
  createdAt: Date
  updatedAt: Date
  closedAt?: Date
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque'
export type PaymentType = 'interest' | 'principal' | 'both' | 'closure'

export interface Payment {
  id?: number
  girviId: number
  customerId: number
  paymentDate: Date
  amount: number
  mode: PaymentMode
  referenceNo?: string
  paymentType: PaymentType
  interestAmount: number
  principalAmount: number
  penaltyAmount: number
  balanceAfter: number
  notes?: string
  receiptNo: string
  createdAt: Date
}

// ─── Gold Rate ────────────────────────────────────────────────────────────────
export interface GoldRate {
  id?: number
  date: Date
  gold22K: number
  gold24K: number
  gold18K: number
  silverRate: number
  source: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface AppSettings {
  id?: number
  shopName: string
  ownerName: string
  address: string
  phone: string
  gstin?: string
  logo?: string
  defaultInterestRate: number
  interestType: InterestType
  calculationMethod: CalcMethod
  penaltyRate: number
  maxLTV: number
  defaultTenure: number
  username: string
  passwordHash: string
  theme: 'light' | 'dark' | 'auto'
  googleDriveConnected: boolean
  googleDriveToken?: string
  autoBackupSchedule: 'daily' | 'weekly' | 'manual'
  lastBackupAt?: Date
  receiptFooter: string
  whatsappTemplate: string
  createdAt: Date
  updatedAt: Date
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  activeGirvi: number
  closedGirvi: number
  totalCustomers: number
  outstandingAmount: number
  todayCollection: number
  todayInterest: number
  dueTodayCount: number
  dueTodayAmount: number
  overdueCount: number
  overdueAmount: number
  totalGoldWeight: number
  totalSilverWeight: number
  newGirviToday: number
  newGirviClosed: number
  newCustomersMonth: number
}

// ─── AI Insight ───────────────────────────────────────────────────────────────
export interface Insight {
  id: string
  text: string
  subtext?: string
  type: 'warning' | 'info' | 'success'
  actionLabel?: string
  actionFilter?: Record<string, unknown>
}

// ─── Form Types ───────────────────────────────────────────────────────────────
export interface NewGirviFormData {
  referenceNo?: string
  date: string
  customerSearch?: string
  existingCustomerId?: number
  customerName: string
  mobile: string
  address: string
  pincode: string
  city: string
  state: string
  relativeName?: string
  relation?: string
  panNumber?: string
  aadhaarNumber?: string
  ornaments: OrnamentFormData[]
  principalAmount: number
  interestRate: number
  interestType: InterestType
  calculationMethod: CalcMethod
  emiRequired: boolean
  tenureMonths: number
  remarks?: string
}

export interface OrnamentFormData {
  id: string
  productName: string
  metal: 'Gold' | 'Silver' | 'Other'
  purity: string
  pieces: number
  grossWeight: number
  lessWeight: number
  description?: string
  photo?: string
}

export interface CollectPaymentFormData {
  paymentDate: string
  amount: number
  mode: PaymentMode
  referenceNo?: string
  paymentType: PaymentType
  notes?: string
}
