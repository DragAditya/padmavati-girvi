import jsPDF from 'jspdf'
import type { Girvi, Customer, Payment, AppSettings } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/utils'

// ─── Girvi Receipt PDF ────────────────────────────────────────────────────────
export function generateGirviReceiptPDF(
  girvi: Girvi,
  customer: Customer,
  settings: AppSettings
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const w = doc.internal.pageSize.getWidth()
  let y = 10

  const line = () => { doc.setDrawColor(212, 160, 23); doc.line(10, y, w - 10, y); y += 4 }
  const text = (t: string, x: number, size = 10, bold = false, color = [30, 30, 30] as [number, number, number]) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(t, x, y)
  }

  // Header
  doc.setFillColor(212, 160, 23)
  doc.rect(0, 0, w, 22, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(settings.shopName, w / 2, 10, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(settings.address, w / 2, 16, { align: 'center' })
  doc.text(`Tel: ${settings.phone}`, w / 2, 20, { align: 'center' })

  y = 28
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('GIRVI RECEIPT', w / 2, y, { align: 'center' })
  y += 6

  line()

  // Girvi Info
  const col1 = 12, col2 = w / 2 + 2
  text('Girvi ID:', col1, 9, true); text(girvi.girviCode, col1 + 22, 9, false, [180, 134, 11] as [number, number, number])
  text('Date:', col2, 9, true); text(formatDate(girvi.startDate), col2 + 14, 9)
  y += 5
  text('Due Date:', col1, 9, true); text(formatDate(girvi.dueDate), col1 + 20, 9)
  if (girvi.referenceNo) { text('Ref:', col2, 9, true); text(girvi.referenceNo, col2 + 10, 9) }
  y += 5; line()

  // Customer
  text('CUSTOMER DETAILS', col1, 9, true)
  y += 5
  text(`Name: ${customer.name}`, col1, 9)
  text(`Mobile: ${customer.mobile}`, col2, 9)
  y += 5
  text(`Address: ${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}`, col1, 8)
  y += 5; line()

  // Ornaments
  text('ORNAMENTS / PRODUCTS', col1, 9, true)
  y += 5

  // Table header
  doc.setFillColor(255, 248, 231)
  doc.rect(10, y - 3, w - 20, 7, 'F')
  text('Item', 12, 8, true)
  text('Metal/Purity', 52, 8, true)
  text('Gross Wt', 82, 8, true)
  text('Net Wt', 102, 8, true)
  text('Value', 122, 8, true)
  y += 5

  girvi.ornaments.forEach((orn, i) => {
    if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(10, y - 3, w - 20, 6, 'F') }
    text(`${i + 1}. ${orn.productName}`, 12, 7)
    text(`${orn.metal} ${orn.purity}`, 52, 7)
    text(`${orn.grossWeight}g`, 82, 7)
    text(`${orn.netWeight}g`, 102, 7)
    text(formatCurrency(orn.estimatedValue), 122, 7)
    y += 6
  })

  line()

  // Loan Details
  text('LOAN DETAILS', col1, 9, true)
  y += 5
  const loanDetails = [
    ['Net Gold Weight', `${girvi.netGoldWeight} g`],
    ['Estimated Value', formatCurrency(girvi.estimatedValue)],
    ['Principal Amount', formatCurrency(girvi.principalAmount)],
    ['Interest Rate', `${girvi.interestRate}% p.a. (${girvi.interestType})`],
    ['Tenure', `${girvi.tenureMonths} Months`],
    ['Calculation', girvi.calculationMethod],
  ]
  loanDetails.forEach(([label, value]) => {
    text(`${label}:`, col1, 8, true)
    text(value, col1 + 40, 8)
    y += 5
  })

  // Highlight principal
  y += 2
  doc.setFillColor(255, 248, 231)
  doc.rect(10, y - 4, w - 20, 9, 'F')
  doc.setDrawColor(212, 160, 23)
  doc.rect(10, y - 4, w - 20, 9)
  text('LOAN AMOUNT:', 14, 11, true)
  text(formatCurrency(girvi.principalAmount), w - 14, 11, true, [180, 134, 11] as [number, number, number])
  doc.text(formatCurrency(girvi.principalAmount), w - 14, y + 3, { align: 'right' })

  y += 12; line()

  // Footer
  text(settings.receiptFooter, w / 2, 8)
  y += 6
  text('Customer Signature', col1, 8)
  text('Authorised Signatory', w - 50, 8)
  y += 10
  doc.line(col1, y, col1 + 35, y)
  doc.line(w - 50, y, w - 15, y)

  doc.save(`${girvi.girviCode}-receipt.pdf`)
}

// ─── Payment Receipt PDF ──────────────────────────────────────────────────────
export function generatePaymentReceiptPDF(
  payment: Payment,
  girvi: Girvi,
  customer: Customer,
  settings: AppSettings
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 140] })
  const w = doc.internal.pageSize.getWidth()
  let y = 8

  // Header
  doc.setFillColor(212, 160, 23)
  doc.rect(0, 0, w, 18, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(settings.shopName, w / 2, 8, { align: 'center' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('PAYMENT RECEIPT', w / 2, 15, { align: 'center' })

  y = 22
  const row = (label: string, value: string, bold = false) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(label, 8, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, w - 8, y, { align: 'right' })
    y += 5
  }

  row('Receipt No', payment.receiptNo)
  row('Date', formatDateTime(payment.paymentDate))

  doc.setDrawColor(212, 160, 23)
  doc.line(8, y, w - 8, y)
  y += 4

  row('Customer', customer.name)
  row('Mobile', customer.mobile)
  row('Girvi ID', girvi.girviCode)

  doc.line(8, y, w - 8, y)
  y += 4

  row('Payment Amount', formatCurrency(payment.amount), true)
  row('Payment Mode', payment.mode.toUpperCase())
  row('Payment Type', payment.paymentType)
  if (payment.referenceNo) row('Reference', payment.referenceNo)

  doc.line(8, y, w - 8, y)
  y += 4

  if (payment.interestAmount > 0) row('Interest Paid', formatCurrency(payment.interestAmount))
  if (payment.principalAmount > 0) row('Principal Paid', formatCurrency(payment.principalAmount))
  if (payment.penaltyAmount > 0) row('Penalty Paid', formatCurrency(payment.penaltyAmount))

  // Outstanding
  y += 2
  doc.setFillColor(255, 248, 231)
  doc.rect(6, y - 3, w - 12, 8, 'F')
  row('Balance Outstanding', formatCurrency(payment.balanceAfter), true)

  y += 8
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Thank you for your payment', w / 2, y, { align: 'center' })

  doc.save(`${payment.receiptNo}.pdf`)
}
