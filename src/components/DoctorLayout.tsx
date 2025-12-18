import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm ${
          isActive
            ? 'bg-teal-600 text-white'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
    >
      {label}
    </NavLink>
  );
}

export default function DoctorLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr]">
        <aside className="bg-white border-r border-slate-200 p-4 lg:min-h-screen lg:w-80 flex-shrink-0">
          <div className="mb-6">
            <span className="text-lg font-semibold text-teal-700">MindCare Hub</span>
            <p className="text-xs text-slate-500">Doctor Portal</p>
          </div>
          <nav className="space-y-1">
            <NavItem to="/doctor" label="Dashboard" />
            <NavItem to="/doctor/appointments" label="Appointments" />
            <NavItem to="/doctor/treatments" label="Treatments" />
          </nav>
        </aside>
        <main className="min-h-screen">
          <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="font-medium text-slate-800">Welcome</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { await logout(); navigate('/login'); }}
                  className="rounded-md border border-slate-300 text-sm px-3 py-2 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>
          <div className="max-w-6xl mx-auto p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

