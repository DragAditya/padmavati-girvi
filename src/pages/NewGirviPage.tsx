import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Plus, Trash2, Camera, Info,
  User, Phone, MapPin, Scan, Save, X, CheckCircle2
} from 'lucide-react'
import { db, getSettings, getNextGirviCode } from '@/db/database'
import { useGoldRate, useCustomerSearch } from '@/hooks'
import {
  calcNetWeight, calcEstimatedValue, calcSimpleInterest, calcEMI,
  calcRiskLevel, fileToBase64, uuid,
  PURITY_OPTIONS, INDIAN_STATES, RELATION_OPTIONS,
  formatCurrency, cn
} from '@/utils'
import { addMonths } from 'date-fns'
import toast from 'react-hot-toast'

const ornamentSchema = z.object({
  id: z.string(),
  productName: z.string().min(1, 'Product name required'),
  metal: z.enum(['Gold', 'Silver', 'Other']),
  purity: z.string().min(1, 'Select purity'),
  pieces: z.coerce.number().min(1, 'Min 1 piece'),
  grossWeight: z.coerce.number().min(0.001, 'Enter gross weight'),
  lessWeight: z.coerce.number().min(0),
  description: z.string().optional(),
  photo: z.string().optional(),
})

const schema = z.object({
  referenceNo: z.string().optional(),
  date: z.string(),
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile'),
  address: z.string().min(3, 'Enter address'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
  city: z.string().min(1, 'Enter city'),
  state: z.string().min(1, 'Select state'),
  relativeName: z.string().optional(),
  relation: z.string().optional(),
  panNumber: z.string().optional().refine(
    v => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
    { message: 'Invalid PAN format' }
  ),
  aadhaarNumber: z.string().optional().refine(
    v => !v || /^\d{12}$/.test(v.replace(/\s/g, '')),
    { message: 'Invalid Aadhaar number' }
  ),
  ornaments: z.array(ornamentSchema).min(1, 'Add at least one ornament'),
  principalAmount: z.coerce.number().min(1000, 'Minimum Rs.1,000'),
  interestRate: z.coerce.number().min(0.1).max(50),
  interestType: z.enum(['simple', 'compound', 'reducing']),
  calculationMethod: z.enum(['monthly', 'daily', 'yearly']),
  emiRequired: z.boolean(),
  tenureMonths: z.coerce.number().min(1).max(120),
  remarks: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1">{msg}</p>
}

export default function NewGirviPage() {
  const navigate = useNavigate()
  const { rate } = useGoldRate()
  const [saving, setSaving] = useState(false)
  const [existingCustomerId, setExistingCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [girviCode, setGirviCode] = useState('GIRVI-...')
  const [customerPhotos, setCustomerPhotos] = useState<{
    photo?: string; panPhoto?: string; aadhaarFront?: string; aadhaarBack?: string
  }>({})

  const suggestions = useCustomerSearch(customerSearch)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      ornaments: [{ id: uuid(), productName: '', metal: 'Gold', purity: '22K', pieces: 1, grossWeight: 0, lessWeight: 0 }],
      interestRate: 2.5,
      interestType: 'simple',
      calculationMethod: 'monthly',
      emiRequired: false,
      tenureMonths: 12,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ornaments' })
  const watchedOrnaments = watch('ornaments')
  const watchedPrincipal = watch('principalAmount')
  const watchedRate = watch('interestRate')
  const watchedTenure = watch('tenureMonths')
  const watchedEMI = watch('emiRequired')

  useEffect(() => {
    getNextGirviCode().then(setGirviCode)
    getSettings().then(s => {
      setValue('interestRate', s.defaultInterestRate)
      setValue('interestType', s.interestType)
      setValue('calculationMethod', s.calculationMethod)
      setValue('tenureMonths', s.defaultTenure)
    })
  }, [setValue])

  const totalNetGold = watchedOrnaments
    .filter(o => o.metal === 'Gold')
    .reduce((s, o) => s + calcNetWeight(Number(o.grossWeight) || 0, Number(o.lessWeight) || 0), 0)

  const totalNetSilver = watchedOrnaments
    .filter(o => o.metal === 'Silver')
    .reduce((s, o) => s + calcNetWeight(Number(o.grossWeight) || 0, Number(o.lessWeight) || 0), 0)

  const totalEstValue = watchedOrnaments.reduce((s, o) => {
    const net = calcNetWeight(Number(o.grossWeight) || 0, Number(o.lessWeight) || 0)
    if (o.metal === 'Gold' && rate) return s + calcEstimatedValue(net, rate.gold22K, o.purity || '22K')
    if (o.metal === 'Silver' && rate) return s + (net * rate.silverRate)
    return s
  }, 0)

  const totalInterest = watchedPrincipal && watchedRate && watchedTenure
    ? calcSimpleInterest(Number(watchedPrincipal), Number(watchedRate), Number(watchedTenure))
    : 0

  const emiAmount = watchedEMI && watchedPrincipal && watchedRate && watchedTenure
    ? calcEMI(Number(watchedPrincipal), Number(watchedRate), Number(watchedTenure))
    : 0

  const ltv = totalEstValue > 0 ? Math.round((Number(watchedPrincipal) / totalEstValue) * 100) : 0

  const selectCustomer = useCallback((c: any) => {
    setValue('customerName', c.name)
    setValue('mobile', c.mobile)
    setValue('address', c.address)
    setValue('pincode', c.pincode)
    setValue('city', c.city)
    setValue('state', c.state)
    if (c.relativeName) setValue('relativeName', c.relativeName)
    if (c.relation) setValue('relation', c.relation)
    if (c.panNumber) setValue('panNumber', c.panNumber)
    if (c.aadhaarNumber) setValue('aadhaarNumber', c.aadhaarNumber)
    setExistingCustomerId(typeof c.id === 'number' ? c.id : null)
    setCustomerSearch(c.name)
    setShowSuggestions(false)
    if (c.photo) setCustomerPhotos(p => ({ ...p, photo: c.photo }))
  }, [setValue])

  async function capturePhoto(key: keyof typeof customerPhotos) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) { toast.error('Image too large. Max 2MB.'); return }
      const b64 = await fileToBase64(file)
      setCustomerPhotos(p => ({ ...p, [key]: b64 }))
    }
    input.click()
  }

  async function captureOrnamentPhoto(index: number) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) { toast.error('Image too large. Max 2MB.'); return }
      const b64 = await fileToBase64(file)
      setValue(`ornaments.${index}.photo`, b64)
    }
    input.click()
  }

  const onSubmit = async (data: FormData, isDraft = false) => {
    setSaving(true)
    try {
      const settings = await getSettings()
      const now = new Date()
      const startDate = new Date(data.date)
      const dueDate = addMonths(startDate, data.tenureMonths)
      const code = await getNextGirviCode()

      let customerId: number = existingCustomerId ?? 0

      if (!existingCustomerId) {
        const newId = await db.customers.add({
          name: data.customerName,
          mobile: data.mobile,
          address: data.address,
          pincode: data.pincode,
          city: data.city,
          state: data.state,
          relativeName: data.relativeName,
          relation: data.relation,
          panNumber: data.panNumber,
          aadhaarNumber: data.aadhaarNumber?.replace(/\s/g, ''),
          photo: customerPhotos.photo,
          panPhoto: customerPhotos.panPhoto,
          aadhaarFront: customerPhotos.aadhaarFront,
          aadhaarBack: customerPhotos.aadhaarBack,
          isVIP: false,
          createdAt: now,
          updatedAt: now,
        })
        customerId = newId as number
      } else {
        await db.customers.update(existingCustomerId, {
          ...(customerPhotos.photo && { photo: customerPhotos.photo }),
          ...(customerPhotos.panPhoto && { panPhoto: customerPhotos.panPhoto }),
          ...(customerPhotos.aadhaarFront && { aadhaarFront: customerPhotos.aadhaarFront }),
          ...(customerPhotos.aadhaarBack && { aadhaarBack: customerPhotos.aadhaarBack }),
          panNumber: data.panNumber,
          aadhaarNumber: data.aadhaarNumber?.replace(/\s/g, ''),
          updatedAt: now,
        })
      }

      const ornaments = data.ornaments.map(o => ({
        id: o.id,
        productName: o.productName,
        metal: o.metal,
        purity: o.purity,
        pieces: o.pieces,
        grossWeight: Number(o.grossWeight),
        lessWeight: Number(o.lessWeight),
        netWeight: calcNetWeight(Number(o.grossWeight), Number(o.lessWeight)),
        description: o.description,
        estimatedValue: o.metal === 'Gold' && rate
          ? calcEstimatedValue(calcNetWeight(Number(o.grossWeight), Number(o.lessWeight)), rate.gold22K, o.purity)
          : o.metal === 'Silver' && rate
            ? calcNetWeight(Number(o.grossWeight), Number(o.lessWeight)) * rate.silverRate
            : 0,
        photo: o.photo,
      }))

      const status = isDraft ? 'draft' : 'active'
      const riskLevel = calcRiskLevel(data.principalAmount, totalEstValue, dueDate)

      const girviId = await db.girvis.add({
        girviCode: code,
        referenceNo: data.referenceNo,
        customerId,
        status,
        ornaments,
        netGoldWeight: totalNetGold,
        netSilverWeight: totalNetSilver,
        goldRateAtTime: rate?.gold22K ?? settings.defaultInterestRate,
        estimatedValue: totalEstValue,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        interestType: data.interestType,
        calculationMethod: data.calculationMethod,
        emiRequired: data.emiRequired,
        tenureMonths: data.tenureMonths,
        startDate,
        dueDate,
        remarks: data.remarks,
        totalInterestPaid: 0,
        totalPrincipalPaid: 0,
        outstandingAmount: data.principalAmount,
        riskLevel,
        createdAt: now,
        updatedAt: now,
      })

      toast.success(isDraft ? 'Saved as draft!' : `Girvi ${code} created!`)
      navigate(`/girvi/${girviId as number}`)
    } catch (err) {
      toast.error('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">New Girvi</h1>
            <p className="text-xs text-gold-600 font-mono">{girviCode}</p>
          </div>
        </div>
        <span className="badge bg-gray-100 text-gray-500">Draft</span>
      </div>

      <form onSubmit={handleSubmit(d => onSubmit(d, false))} className="pb-32 space-y-4 p-4">

        {/* Section 1: Customer Details */}
        <SectionCard number={1} title="Customer Details" extra={
          <button type="button" className="flex items-center gap-1 text-gold-600 text-xs font-semibold">
            <Scan className="w-3.5 h-3.5" /> Scan KYC
          </button>
        }>
          <div className="flex gap-3 mb-4">
            <button type="button" onClick={() => capturePhoto('photo')}
              className="w-24 h-24 border-2 border-dashed border-gold-300 rounded-2xl flex flex-col items-center justify-center gap-1 bg-gold-50 flex-shrink-0 overflow-hidden">
              {customerPhotos.photo
                ? <img src={customerPhotos.photo} className="w-full h-full object-cover rounded-2xl" alt="Customer" />
                : <><Camera className="w-6 h-6 text-gold-500" /><span className="text-xs text-gold-600 font-medium text-center">Customer<br/>Photo</span></>}
            </button>

            <div className="flex-1 space-y-2">
              <div className="relative">
                <label className="label">Customer Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('customerName')}
                    className={cn('input pl-9', errors.customerName && 'input-error')}
                    placeholder="Enter full name"
                    onChange={e => {
                      register('customerName').onChange(e)
                      setCustomerSearch(e.target.value)
                      setShowSuggestions(true)
                    }}
                  />
                </div>
                <FieldError msg={errors.customerName?.message} />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-modal mt-1 overflow-hidden">
                    {suggestions.map(c => (
                      <button key={c.id} type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-gold-50 transition-colors border-b border-gray-50 last:border-0"
                        onClick={() => selectCustomer(c)}>
                        <p className="font-semibold text-sm text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.mobile} • {c.city}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Mobile *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('mobile')} className={cn('input pl-9', errors.mobile && 'input-error')}
                    placeholder="10-digit mobile" maxLength={10} inputMode="numeric" />
                </div>
                <FieldError msg={errors.mobile?.message} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input {...register('address')} className={cn('input pl-9', errors.address && 'input-error')}
                  placeholder="House / Street / Area" />
              </div>
              <FieldError msg={errors.address?.message} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Pincode *</label>
                <input {...register('pincode')} className={cn('input', errors.pincode && 'input-error')}
                  placeholder="6-digit" maxLength={6} inputMode="numeric" />
                <FieldError msg={errors.pincode?.message} />
              </div>
              <div>
                <label className="label">City *</label>
                <input {...register('city')} className={cn('input', errors.city && 'input-error')}
                  placeholder="City" />
                <FieldError msg={errors.city?.message} />
              </div>
            </div>

            <div>
              <label className="label">State *</label>
              <select {...register('state')} className={cn('input', errors.state && 'input-error')}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <FieldError msg={errors.state?.message} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Relative Name</label>
                <input {...register('relativeName')} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="label">Relation</label>
                <select {...register('relation')} className="input">
                  <option value="">Select</option>
                  {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: KYC */}
        <SectionCard number={2} title="KYC Details">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">PAN Number</label>
              <input {...register('panNumber')}
                className={cn('input font-mono uppercase', errors.panNumber && 'input-error')}
                placeholder="AAAAA9999A" maxLength={10}
                onChange={e => setValue('panNumber', e.target.value.toUpperCase())} />
              <FieldError msg={errors.panNumber?.message} />
            </div>
            <div>
              <label className="label">Aadhaar Number</label>
              <input {...register('aadhaarNumber')}
                className={cn('input font-mono', errors.aadhaarNumber && 'input-error')}
                placeholder="12-digit" maxLength={14} inputMode="numeric" />
              <FieldError msg={errors.aadhaarNumber?.message} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'panPhoto' as const, label: 'PAN Card' },
              { key: 'aadhaarFront' as const, label: 'Aadhaar Front' },
              { key: 'aadhaarBack' as const, label: 'Aadhaar Back' },
            ]).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => capturePhoto(key)}
                className="border-2 border-dashed border-gold-300 rounded-xl p-3 flex flex-col items-center gap-1 bg-gold-50 aspect-[4/3] justify-center overflow-hidden">
                {customerPhotos[key]
                  ? <img src={customerPhotos[key]} className="w-full h-full object-cover rounded-lg" alt={label} />
                  : <><Camera className="w-5 h-5 text-gold-500" /><span className="text-[10px] text-gold-600 font-medium text-center">{label}</span></>}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Section 3: Ornaments */}
        <SectionCard number={3} title="Products / Ornaments" extra={
          <span className="text-xs text-gray-400">{fields.length} item{fields.length !== 1 ? 's' : ''}</span>
        }>
          <div className="space-y-4">
            {fields.map((field, index) => {
              const orn = watchedOrnaments[index]
              const netWt = calcNetWeight(Number(orn?.grossWeight) || 0, Number(orn?.lessWeight) || 0)
              const estVal = orn?.metal === 'Gold' && rate
                ? calcEstimatedValue(netWt, rate.gold22K, orn.purity || '22K')
                : orn?.metal === 'Silver' && rate ? netWt * rate.silverRate : 0

              return (
                <div key={field.id} className="border border-gray-200 rounded-2xl p-3 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 bg-gold-500 rounded-lg text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => captureOrnamentPhoto(index)}
                      className="w-16 h-16 border-2 border-dashed border-gold-300 rounded-xl flex flex-col items-center justify-center bg-gold-50 flex-shrink-0 overflow-hidden">
                      {orn?.photo
                        ? <img src={orn.photo} className="w-full h-full object-cover rounded-xl" alt="" />
                        : <><Camera className="w-4 h-4 text-gold-500" /><span className="text-[9px] text-gold-600">Photo</span></>}
                    </button>
                    <div className="flex-1 space-y-2">
                      <div>
                        <input {...register(`ornaments.${index}.productName`)}
                          className={cn('input text-sm', errors.ornaments?.[index]?.productName && 'input-error')}
                          placeholder="Product name (e.g. Gold Necklace)" />
                        <FieldError msg={errors.ornaments?.[index]?.productName?.message} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select {...register(`ornaments.${index}.metal`)} className="input text-sm">
                          <option value="Gold">Gold</option>
                          <option value="Silver">Silver</option>
                          <option value="Other">Other</option>
                        </select>
                        <select {...register(`ornaments.${index}.purity`)} className="input text-sm">
                          {PURITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="label text-[10px]">Pcs</label>
                      <input {...register(`ornaments.${index}.pieces`)} type="number" min={1}
                        className="input text-sm text-center" defaultValue={1} />
                    </div>
                    <div>
                      <label className="label text-[10px]">Gross (g)</label>
                      <input {...register(`ornaments.${index}.grossWeight`)} type="number" step="0.001"
                        className={cn('input text-sm', errors.ornaments?.[index]?.grossWeight && 'input-error')}
                        placeholder="0.000" inputMode="decimal" />
                    </div>
                    <div>
                      <label className="label text-[10px]">Less (g)</label>
                      <input {...register(`ornaments.${index}.lessWeight`)} type="number" step="0.001"
                        className="input text-sm" placeholder="0.000" inputMode="decimal" />
                    </div>
                    <div>
                      <label className="label text-[10px]">Net (g)</label>
                      <div className="input text-sm font-mono font-bold text-gold-700 bg-gold-50 text-center">
                        {netWt.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  <input {...register(`ornaments.${index}.description`)} className="input text-sm"
                    placeholder="Description (optional)" />

                  {estVal > 0 && (
                    <div className="flex items-center justify-between bg-gold-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Info className="w-3.5 h-3.5" /> Estimated Value
                      </div>
                      <p className="font-mono font-bold text-gold-700">{formatCurrency(estVal)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button type="button"
            onClick={() => append({ id: uuid(), productName: '', metal: 'Gold', purity: '22K', pieces: 1, grossWeight: 0, lessWeight: 0 })}
            className="btn-outline w-full mt-3">
            <Plus className="w-4 h-4" /> Add Another Product
          </button>
        </SectionCard>

        {/* Section 4: Loan Details */}
        <SectionCard number={4} title="Loan Details">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoBox label="Net Gold Weight" value={`${totalNetGold.toFixed(3)} g`} mono />
            <InfoBox label="Net Silver Weight" value={`${totalNetSilver.toFixed(3)} g`} mono />
            <InfoBox label="Gold Rate (22K)" value={rate ? `Rs.${rate.gold22K.toLocaleString('en-IN')}/g` : 'Loading...'} mono />
            <InfoBox label="Estimated Value" value={formatCurrency(totalEstValue)} highlight mono />
          </div>

          {ltv > 75 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-4">
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700">LTV is {ltv}% — exceeds recommended 75%.</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="label">Principal / Loan Amount (Rs.) *</label>
              <input {...register('principalAmount')} type="number" inputMode="numeric"
                className={cn('input font-mono font-bold text-lg', errors.principalAmount && 'input-error')}
                placeholder="100000" />
              <FieldError msg={errors.principalAmount?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Interest Rate (% p.a.) *</label>
                <input {...register('interestRate')} type="number" step="0.1" inputMode="decimal"
                  className={cn('input', errors.interestRate && 'input-error')} />
                <FieldError msg={errors.interestRate?.message} />
              </div>
              <div>
                <label className="label">Interest Type *</label>
                <select {...register('interestType')} className="input">
                  <option value="simple">Simple</option>
                  <option value="compound">Compound</option>
                  <option value="reducing">Reducing Balance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Calculation Method</label>
                <select {...register('calculationMethod')} className="input">
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="label">Tenure (Months) *</label>
                <input {...register('tenureMonths')} type="number" inputMode="numeric"
                  className={cn('input', errors.tenureMonths && 'input-error')} />
                <FieldError msg={errors.tenureMonths?.message} />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="label mb-0">EMI Required?</label>
                <p className="text-xs text-gray-400">Enable monthly EMI</p>
              </div>
              <Controller control={control} name="emiRequired" render={({ field }) => (
                <button type="button" onClick={() => field.onChange(!field.value)}
                  className={cn('w-12 h-6 rounded-full transition-colors relative flex-shrink-0',
                    field.value ? 'bg-gold-500' : 'bg-gray-200')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    field.value ? 'translate-x-6' : 'translate-x-0.5')} />
                </button>
              )} />
            </div>

            {watchedPrincipal > 0 && (
              <div className="bg-gold-50 rounded-2xl p-4 space-y-2.5 border border-gold-200">
                <p className="font-semibold text-sm text-gray-800">Loan Summary</p>
                <SummaryRow label="Principal" value={formatCurrency(Number(watchedPrincipal))} />
                <SummaryRow label={`Interest (${watchedTenure}m @ ${watchedRate}%)`} value={formatCurrency(totalInterest)} />
                <SummaryRow label="Total Payable" value={formatCurrency(Number(watchedPrincipal) + totalInterest)} bold />
                {watchedEMI && <SummaryRow label="Monthly EMI" value={formatCurrency(emiAmount)} color="text-gold-700" />}
              </div>
            )}

            <div>
              <label className="label">Remarks (Optional)</label>
              <textarea {...register('remarks')} className="input resize-none" rows={2} placeholder="Any additional notes..." />
            </div>
          </div>
        </SectionCard>
      </form>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 p-4 flex gap-3"
           style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <button type="button" onClick={handleSubmit(d => onSubmit(d, true))}
          className="btn-outline flex-1" disabled={saving}>
          <Save className="w-4 h-4" /> Draft
        </button>
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost px-4">
          <X className="w-4 h-4" />
        </button>
        <button type="button" onClick={handleSubmit(d => onSubmit(d, false))}
          className="btn-primary flex-[2]" disabled={saving}>
          {saving
            ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            : <><CheckCircle2 className="w-4 h-4" /> Save Girvi</>}
        </button>
      </div>
    </div>
  )
}

function SectionCard({ number, title, children, extra }: {
  number: number; title: string; children: React.ReactNode; extra?: React.ReactNode
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 bg-gold-500 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            {number}
          </span>
          <span className="font-bold text-gray-800">{title}</span>
        </div>
        {extra}
      </div>
      {children}
    </div>
  )
}

function InfoBox({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3', highlight ? 'bg-gold-50 border border-gold-200' : 'bg-gray-50')}>
      <p className="text-[10px] text-gray-500 font-medium">{label}</p>
      <p className={cn('text-sm font-bold mt-0.5', mono && 'font-mono', highlight ? 'text-gold-700' : 'text-gray-800')}>{value}</p>
    </div>
  )
}

function SummaryRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={cn('font-mono text-sm', bold ? 'font-bold text-gray-900' : 'text-gray-700', color)}>{value}</span>
    </div>
  )
}
