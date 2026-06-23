import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Store, Percent, Gem, Palette, Database, Shield, ChevronRight,
  Upload, Download, Trash2, RefreshCw, CheckCircle2
} from 'lucide-react'
import { db, updateSettings } from '@/db/database'
import { exportExcel, exportJSON, importJSON } from '@/services/backupService'
import { saveManualRate } from '@/services/goldRateService'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime, cn } from '@/utils'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [section, setSection] = useState<string | null>(null)

  const liveSettings = useLiveQuery(() => db.settings.toCollection().first())

  if (!liveSettings) {
    return (
      <Layout>
        <div className="p-4 space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-enter">
        <div className="page-header">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Settings</h1>
            <p className="text-xs text-gray-400">Manage your business & app</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <SettingsSection icon={<Store className="w-5 h-5 text-gold-600" />} title="Shop Information"
            expanded={section === 'shop'} onToggle={() => setSection(s => s === 'shop' ? null : 'shop')}>
            <ShopInfoForm s={liveSettings} />
          </SettingsSection>

          <SettingsSection icon={<Percent className="w-5 h-5 text-blue-600" />} title="Loan & Interest Settings"
            expanded={section === 'loan'} onToggle={() => setSection(s => s === 'loan' ? null : 'loan')}>
            <LoanSettingsForm s={liveSettings} />
          </SettingsSection>

          <SettingsSection icon={<Gem className="w-5 h-5 text-gold-500" />} title="Gold & Silver Rates"
            expanded={section === 'rates'} onToggle={() => setSection(s => s === 'rates' ? null : 'rates')}>
            <GoldRatesForm />
          </SettingsSection>

          <SettingsSection icon={<Database className="w-5 h-5 text-green-600" />} title="Data & Backup"
            expanded={section === 'backup'} onToggle={() => setSection(s => s === 'backup' ? null : 'backup')}>
            <BackupSection s={liveSettings} />
          </SettingsSection>

          <SettingsSection icon={<Shield className="w-5 h-5 text-red-500" />} title="Security"
            expanded={section === 'security'} onToggle={() => setSection(s => s === 'security' ? null : 'security')}>
            <SecuritySection />
          </SettingsSection>

          <SettingsSection icon={<Palette className="w-5 h-5 text-purple-500" />} title="Appearance & Templates"
            expanded={section === 'appearance'} onToggle={() => setSection(s => s === 'appearance' ? null : 'appearance')}>
            <AppearanceSection s={liveSettings} />
          </SettingsSection>

          <div className="card p-4 space-y-2">
            <Row label="App Name" value="Padmavati Girvi Manager" />
            <Row label="Version" value="1.0.0" />
            {liveSettings.lastBackupAt && (
              <Row label="Last Backup" value={formatDateTime(liveSettings.lastBackupAt)} />
            )}
          </div>

          <button onClick={() => { logout(); navigate('/login') }} className="w-full btn-danger">
            Sign Out
          </button>
        </div>
      </div>
    </Layout>
  )
}

function SettingsSection({ icon, title, children, expanded, onToggle }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; expanded: boolean; onToggle: () => void
}) {
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">{icon}</div>
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && <div className="px-4 pb-4 border-t border-gray-50">{children}</div>}
    </div>
  )
}

function ShopInfoForm({ s }: { s: any }) {
  const [form, setForm] = useState({
    shopName: s.shopName ?? '',
    ownerName: s.ownerName ?? '',
    address: s.address ?? '',
    phone: s.phone ?? '',
    gstin: s.gstin ?? ''
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateSettings(form)
      toast.success('Shop info saved!')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="pt-4 space-y-3">
      {([
        { key: 'shopName' as const, label: 'Shop Name', placeholder: 'Padmavati Jewellers' },
        { key: 'ownerName' as const, label: 'Owner Name', placeholder: 'Enter owner name' },
        { key: 'address' as const, label: 'Address', placeholder: 'Full address' },
        { key: 'phone' as const, label: 'Phone', placeholder: '+91 98765 43210' },
        { key: 'gstin' as const, label: 'GSTIN', placeholder: 'Optional' },
      ]).map(f => (
        <div key={f.key}>
          <label className="label">{f.label}</label>
          <input className="input" placeholder={f.placeholder}
            value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
        </div>
      ))}
      <button onClick={save} disabled={saving} className="btn-primary w-full mt-2">
        {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save</>}
      </button>
    </div>
  )
}

function LoanSettingsForm({ s }: { s: any }) {
  const [form, setForm] = useState({
    defaultInterestRate: s.defaultInterestRate ?? 2.5,
    interestType: s.interestType ?? 'simple',
    calculationMethod: s.calculationMethod ?? 'monthly',
    penaltyRate: s.penaltyRate ?? 3,
    maxLTV: s.maxLTV ?? 75,
    defaultTenure: s.defaultTenure ?? 12,
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try { await updateSettings(form); toast.success('Saved!') }
    catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Default Interest Rate (% p.a.)</label>
          <input type="number" step="0.1" className="input" value={form.defaultInterestRate}
            onChange={e => setForm(p => ({ ...p, defaultInterestRate: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Penalty Rate (% p.a.)</label>
          <input type="number" step="0.1" className="input" value={form.penaltyRate}
            onChange={e => setForm(p => ({ ...p, penaltyRate: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Interest Type</label>
          <select className="input" value={form.interestType}
            onChange={e => setForm(p => ({ ...p, interestType: e.target.value }))}>
            <option value="simple">Simple</option>
            <option value="compound">Compound</option>
            <option value="reducing">Reducing Balance</option>
          </select>
        </div>
        <div>
          <label className="label">Calculation</label>
          <select className="input" value={form.calculationMethod}
            onChange={e => setForm(p => ({ ...p, calculationMethod: e.target.value }))}>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="label">Max LTV %</label>
          <input type="number" className="input" value={form.maxLTV}
            onChange={e => setForm(p => ({ ...p, maxLTV: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Default Tenure (months)</label>
          <input type="number" className="input" value={form.defaultTenure}
            onChange={e => setForm(p => ({ ...p, defaultTenure: Number(e.target.value) }))} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save</>}
      </button>
    </div>
  )
}

function GoldRatesForm() {
  const [gold22K, setGold22K] = useState('')
  const [silver, setSilver] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!gold22K || !silver) { toast.error('Enter both rates'); return }
    setSaving(true)
    try {
      await saveManualRate(Number(gold22K), Number(silver))
      toast.success('Rates updated!')
      setGold22K(''); setSilver('')
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="bg-gold-50 rounded-2xl p-3">
        <p className="text-xs text-gray-500">Add VITE_GOLD_API_KEY in .env for live rates</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Gold Rate 22K (Rs./g)</label>
          <input type="number" className="input" placeholder="e.g. 6800" value={gold22K}
            onChange={e => setGold22K(e.target.value)} />
        </div>
        <div>
          <label className="label">Silver Rate (Rs./g)</label>
          <input type="number" className="input" placeholder="e.g. 85" value={silver}
            onChange={e => setSilver(e.target.value)} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : 'Update Rates Manually'}
      </button>
    </div>
  )
}

function BackupSection({ s }: { s: any }) {
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<void>, msg: string) {
    setBusy(key)
    try { await fn(); toast.success(msg) }
    catch (e) { toast.error(String(e)) }
    finally { setBusy(null) }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (!confirm('This will REPLACE all existing data. Are you sure?')) return
      setBusy('import')
      try {
        const result = await importJSON(file)
        toast.success(`Restored: ${result.customers} customers, ${result.girvis} girvis`)
      } catch (e) { toast.error(String(e)) }
      finally { setBusy(null) }
    }
    input.click()
  }

  async function handleClearAll() {
    if (!confirm('DELETE ALL data permanently? Cannot be undone!')) return
    const input = prompt('Type DELETE to confirm:')
    if (input !== 'DELETE') { toast.error('Cancelled'); return }
    setBusy('clear')
    try {
      await db.transaction('rw', [db.girvis, db.customers, db.payments], async () => {
        await db.girvis.clear(); await db.customers.clear(); await db.payments.clear()
      })
      toast.success('All data cleared')
    } catch { toast.error('Failed') }
    finally { setBusy(null) }
  }

  return (
    <div className="pt-4 space-y-2">
      {s.lastBackupAt && (
        <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <p className="text-xs text-green-700">Last backup: {formatDateTime(s.lastBackupAt)}</p>
        </div>
      )}
      {[
        { key: 'excel', icon: <Download className="w-4 h-4" />, label: 'Export as Excel', sub: 'Download all data as spreadsheet', fn: () => exportExcel(), msg: 'Excel exported!' },
        { key: 'json', icon: <Download className="w-4 h-4" />, label: 'Export as JSON Backup', sub: 'Full data backup file', fn: () => exportJSON(), msg: 'JSON backup downloaded!' },
      ].map(b => (
        <button key={b.key} onClick={() => run(b.key, b.fn, b.msg)} disabled={busy === b.key}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 text-left hover:bg-gray-50 transition-colors disabled:opacity-50">
          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">{b.icon}</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{b.label}</p>
            <p className="text-xs text-gray-400">{b.sub}</p>
          </div>
          {busy === b.key && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
        </button>
      ))}
      <button onClick={handleImport} disabled={busy === 'import'}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 text-left hover:bg-gray-50 disabled:opacity-50">
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0"><Upload className="w-4 h-4" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Import / Restore from JSON</p>
          <p className="text-xs text-gray-400">Restore from a previous backup</p>
        </div>
        {busy === 'import' && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
      </button>
      <button onClick={handleClearAll} disabled={busy === 'clear'}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-100 text-left hover:bg-red-50 disabled:opacity-50">
        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0"><Trash2 className="w-4 h-4 text-red-500" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-600">Clear All Data</p>
          <p className="text-xs text-gray-400">Permanently delete everything</p>
        </div>
        {busy === 'clear' && <RefreshCw className="w-4 h-4 text-red-400 animate-spin" />}
      </button>
    </div>
  )
}

function SecuritySection() {
  const { changePassword } = useAuthStore()
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!newPass) { toast.error('Enter new password'); return }
    if (newPass !== confirm) { toast.error('Passwords do not match'); return }
    if (newPass.length < 6) { toast.error('Minimum 6 characters'); return }
    setSaving(true)
    try {
      await changePassword(newPass)
      toast.success('Password changed!')
      setNewPass(''); setConfirm('')
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="pt-4 space-y-3">
      <div>
        <label className="label">New Password</label>
        <input type="password" className="input" placeholder="Min 6 characters"
          value={newPass} onChange={e => setNewPass(e.target.value)} />
      </div>
      <div>
        <label className="label">Confirm Password</label>
        <input type="password" className="input" placeholder="Re-enter password"
          value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : <><Shield className="w-4 h-4" /> Change Password</>}
      </button>
    </div>
  )
}

function AppearanceSection({ s }: { s: any }) {
  return (
    <div className="pt-4 space-y-3">
      <div>
        <label className="label">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'auto'] as const).map(t => (
            <button key={t} onClick={() => updateSettings({ theme: t })}
              className={cn('py-2 rounded-xl text-sm font-semibold border transition-all capitalize',
                s.theme === t ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200')}>
              {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🌗'} {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Receipt Footer Text</label>
        <textarea className="input resize-none" rows={3} defaultValue={s.receiptFooter ?? ''}
          onBlur={async (e) => { await updateSettings({ receiptFooter: e.target.value }) }} />
      </div>
      <div>
        <label className="label">WhatsApp Template</label>
        <textarea className="input resize-none" rows={4} defaultValue={s.whatsappTemplate ?? ''}
          onBlur={async (e) => { await updateSettings({ whatsappTemplate: e.target.value }) }} />
        <p className="text-xs text-gray-400 mt-1">Variables: {'{name} {girviId} {amount} {dueDate}'}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}
