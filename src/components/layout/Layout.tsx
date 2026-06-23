import { NavLink, useLocation } from 'react-router-dom'
import { Home, FileText, Plus, Users, Settings } from 'lucide-react'
import { cn } from '@/utils'

const NAV = [
  { path: '/',          icon: Home,     label: 'Dashboard' },
  { path: '/girvi',     icon: FileText, label: 'Girvi'     },
  { path: '/customers', icon: Users,    label: 'Customers' },
  { path: '/settings',  icon: Settings, label: 'Settings'  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isNewGirvi = pathname === '/girvi/new'

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-lg mx-auto">
      <main className="flex-1 bottom-safe overflow-y-auto">
        <div className="page-enter">{children}</div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 z-30"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-end h-16 px-2">
          {/* Dashboard */}
          <NavItem path={NAV[0].path} icon={<Home className="w-5 h-5" />} label={NAV[0].label} />

          {/* Girvi */}
          <NavItem path={NAV[1].path} icon={<FileText className="w-5 h-5" />} label={NAV[1].label} />

          {/* New Girvi CTA */}
          <div className="flex-1 flex justify-center items-end pb-2">
            <NavLink to="/girvi/new"
              className={cn(
                'flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-gold transition-all duration-200',
                isNewGirvi ? 'bg-gold-600 scale-95' : 'bg-gold-500 hover:bg-gold-600 active:scale-95'
              )}>
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
              <span className="text-white text-[9px] font-semibold mt-0.5 leading-none">New</span>
            </NavLink>
          </div>

          {/* Customers */}
          <NavItem path={NAV[2].path} icon={<Users className="w-5 h-5" />} label={NAV[2].label} />

          {/* Settings */}
          <NavItem path={NAV[3].path} icon={<Settings className="w-5 h-5" />} label={NAV[3].label} />
        </div>
      </nav>
    </div>
  )
}

function NavItem({ path, icon, label }: { path: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={path} end={path === '/'}
      className={({ isActive }) => cn(
        'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors duration-150',
        isActive ? 'text-gold-500' : 'text-gray-400 hover:text-gray-600'
      )}>
      {({ isActive }) => (
        <>
          <span className={cn('transition-transform duration-150', isActive && 'scale-110')}>{icon}</span>
          <span className="text-[10px] font-semibold leading-none">{label}</span>
        </>
      )}
    </NavLink>
  )
}
