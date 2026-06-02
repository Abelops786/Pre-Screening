'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getStoredUser, clearAuth } from '@/lib/auth';
import type { User } from '@/types';
import {
  LayoutDashboard, Users, UserCircle, LogOut,
  Menu, X, ChevronRight, Settings, Briefcase, Building2, ClipboardList,
} from 'lucide-react';

const navItems = [
  { href: '/admin',             label: 'Overview',        icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER'] },
  { href: '/admin/jobs',        label: 'Jobs',            icon: Briefcase,       roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/departments', label: 'Departments',     icon: Building2,       roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/questionnaires', label: 'Questionnaires', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/candidates',  label: 'Candidates',      icon: Users,           roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER'] },
  { href: '/admin/users',       label: 'User Management', icon: UserCircle,      roles: ['SUPER_ADMIN'] },
  { href: '/admin/settings',    label: 'Settings',        icon: Settings,        roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,     setUser]     = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/login'); return; }
    setUser(stored);
  }, [router]);

  const logout = () => { clearAuth(); router.replace('/login'); };

  const allowedNav = navItems.filter((n) => !user || n.roles.includes(user.role));

  const Sidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-900 text-white flex flex-col transform transition-transform duration-200
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
      <div className="p-5 border-b border-brand-700 flex flex-col items-start gap-1">
        <Image src="/logo.webp" alt="Logo" width={140} height={40} className="object-contain" unoptimized />
        <p className="text-xs text-brand-300">Admin Portal</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {allowedNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-brand-600 text-white' : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-brand-700">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-brand-300">{user.role.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-200 hover:text-white hover:bg-brand-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <p className="font-semibold text-gray-800">{process.env.NEXT_PUBLIC_APP_NAME || 'TalentScreen'}</p>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
