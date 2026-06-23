# 💎 Padmavati Girvi Manager

A production-ready, mobile-first Progressive Web App (PWA) for managing gold pledge (Girvi) records at Padmavati Jewellers.

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ (https://nodejs.org)
- npm 9+

### Step 1 — Install
```bash
unzip padmavati-girvi.zip
cd padmavati-girvi
npm install
```

### Step 2 — Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
VITE_GOLD_API_KEY=your_key_here        # Get free key at goldapi.io
VITE_GOOGLE_CLIENT_ID=your_client_id  # Optional: for Google Drive backup
```

> **Note:** App works without API keys — gold rates will use manual entry fallback.

### Step 3 — Run Development Server
```bash
npm run dev
```
Open http://localhost:5173

### Step 4 — Login
- **Username:** `admin`
- **Password:** `padmavati123`

> Change password in Settings → Security after first login.

---

## 🏗️ Build & Deploy

### Build for Production
```bash
npm run build
```
Output: `dist/` folder (ready to deploy)

### Deploy to Vercel (Recommended — Free)
```bash
npm install -g vercel
vercel --prod
```
Set environment variables in Vercel dashboard.

### Deploy to Netlify
```bash
npm run build
# Drag & drop `dist/` folder to app.netlify.com
```

### Self-hosted (nginx)
```bash
npm run build
# Copy dist/ to your web server
# Add nginx rewrite rule: try_files $uri $uri/ /index.html;
```

---

## 📱 Install as App (PWA)

**Android (Chrome):**
1. Open the app URL in Chrome
2. Tap menu (⋮) → "Add to Home Screen"
3. App installs like a native app

**iPhone (Safari):**
1. Open URL in Safari
2. Tap Share → "Add to Home Screen"

---

## 🔑 Default Credentials

| Field    | Value           |
|----------|----------------|
| Username | `admin`         |
| Password | `padmavati123`  |

Change in: **Settings → Security → Change Password**

---

## 💰 Live Gold Rates Setup

1. Go to https://goldapi.io
2. Sign up for free account (100 requests/day free)
3. Copy your API key
4. Add to `.env`: `VITE_GOLD_API_KEY=your_key`

**Without API key:** App uses cached rates or manual entry — still fully functional.

---

## 💾 3-Layer Backup System

| Layer | How | When |
|-------|-----|------|
| **Excel** | Settings → Export as Excel | Manual, anytime |
| **JSON** | Settings → Export as JSON | Manual, anytime |
| **Google Drive** | Settings → Connect Google Drive | Auto (daily) |

### Restore from Backup
Settings → Import / Restore from JSON → select your backup file

---

## 🗂️ What's Included

```
Pages:
✅ Login           — Secure login with session management
✅ Dashboard       — Live stats, gold rates, insights, recent girvis
✅ Girvi List      — All pledges with search, filter, sort
✅ New Girvi       — Full form with KYC, ornaments, loan details
✅ Girvi Detail    — Complete view with payment history
✅ Collect Payment — Record payments with auto-split
✅ Customer List   — All customers with stats
✅ Customer Profile — Full history, girvis, payments
✅ Reports         — Charts, analytics, overdue list
✅ Settings        — Shop info, rates, backup, security

Features:
✅ Live gold rates (GoldAPI.io with fallback)
✅ Estimated value auto-calculation
✅ Interest & EMI calculations
✅ PDF receipt generation
✅ Excel export
✅ JSON backup & restore
✅ Customer photo capture
✅ KYC document upload
✅ Overdue auto-detection
✅ Risk level badges
✅ WhatsApp reminder links
✅ Offline support (PWA)
✅ Installable on mobile
✅ Full-text search
```

---

## 🛠️ Tech Stack

| Tech | Purpose |
|------|---------|
| React 18 + TypeScript | UI framework |
| Vite 5 | Build tool |
| Tailwind CSS 3 | Styling |
| Dexie.js (IndexedDB) | Local database |
| Zustand | State management |
| React Hook Form + Zod | Forms & validation |
| Recharts | Analytics charts |
| jsPDF | PDF receipt generation |
| SheetJS (xlsx) | Excel export |
| date-fns | Date calculations |
| Framer Motion | Animations |
| vite-plugin-pwa | PWA & service worker |

---

## 📊 Database (IndexedDB — Local, Permanent)

All data stored locally in the browser — **no server, no cloud required**.

Tables:
- `customers` — Customer profiles & KYC
- `girvis` — All pledge records
- `payments` — Payment history
- `goldRates` — Rate history (last 90 days)
- `settings` — App configuration

Data persists permanently unless:
1. Browser storage is manually cleared
2. You use "Clear All Data" in Settings
3. Private/Incognito mode (clears on tab close)

**Recommendation:** Export JSON backup weekly for safety.

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOLD_API_KEY` | Optional | goldapi.io API key for live rates |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google OAuth for Drive backup |
| `VITE_APP_VERSION` | Optional | Version string (default: 1.0.0) |

---

## 📝 Customization

### Change Default Credentials
In `src/store/authStore.ts`, the default hash is for `padmavati123`.
To generate a new hash:
```js
// In browser console:
const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('your_new_password'))
console.log(Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join(''))
```

### Change Shop Name
Settings → Shop Information → Shop Name

### Change Default Interest Rate
Settings → Loan & Interest → Default Interest Rate

---

## 🐛 Troubleshooting

**App won't load:**
- Clear browser cache: Ctrl+Shift+R
- Check Node.js version: `node --version` (need 18+)

**Gold rates not loading:**
- Add `VITE_GOLD_API_KEY` to `.env`
- Use Settings → Gold & Silver Rates → manual override

**Data lost after browser update:**
- IndexedDB should persist, but use Settings → Export JSON regularly
- Restore: Settings → Import / Restore from JSON

**PDF not downloading:**
- Check browser popup blocker — allow downloads from app URL

---

## 📞 Support

Built for Padmavati Jewellers, Amalner/Dhule region, Maharashtra.

---

*Version 1.0.0 | June 2026 | Built with ❤️ using React + TypeScript*
