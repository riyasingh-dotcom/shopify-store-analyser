import type { ShopInfo } from '@/types/shopify';

// ── inline SVG icons ──────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}
function CubeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── nav item ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

function NavItem({ icon, label, active, disabled }: NavItemProps) {
  const base = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
  const style = disabled
    ? `${base} text-gray-400 cursor-not-allowed`
    : active
    ? `${base} bg-indigo-50 text-indigo-700`
    : `${base} text-gray-600 hover:bg-gray-100 hover:text-gray-900`;

  return (
    <div className={style}>
      {icon}
      <span>{label}</span>
      {disabled && (
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
          Soon
        </span>
      )}
    </div>
  );
}

// ── sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  shop: ShopInfo;
  isMockData: boolean;
}

export default function Sidebar({ shop, isMockData }: SidebarProps) {
  const initials = shop.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#96bf48]">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
            <path d="M15.337 6.94a.5.5 0 00-.464-.31h-1.39l-.52-2.81A2.5 2.5 0 0010.5 2h-.01a2.5 2.5 0 00-2.452 1.82L7.517 6.63H6.127a.5.5 0 00-.496.435l-1 8.5A.5.5 0 005.127 16h13.746a.5.5 0 00.496-.565l-1-8.5a.5.5 0 00-.032-.085zM10.49 3.5c.69 0 1.29.477 1.45 1.148l.42 1.982H8.64l.398-1.97A1 1 0 0110.49 3.5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Store Analyser</p>
          <p className="text-xs text-gray-400">Analytics Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-5">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Main</p>
        <NavItem icon={<HomeIcon />} label="Overview" active />
        <NavItem icon={<CubeIcon />} label="Products" />
        <NavItem icon={<BagIcon />}  label="Orders" />
        <p className="mb-2 mt-5 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">More</p>
        <NavItem icon={<ChartIcon />} label="Analytics" disabled />
        <NavItem icon={<CogIcon />}   label="Settings"  disabled />
      </nav>

      {/* Store info footer */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{shop.name}</p>
            <p className="truncate text-xs text-gray-500">{shop.plan.displayName}</p>
          </div>
          <div className="ml-auto">
            <span className={`block h-2 w-2 rounded-full ${isMockData ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          </div>
        </div>
      </div>
    </aside>
  );
}
