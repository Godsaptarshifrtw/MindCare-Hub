import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

type StaffMember = {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
  specialization?: string;
};

// Hardcoded staff members
const hardcodedStaff: StaffMember[] = [
  { id: 'nurse-1', name: 'Priya Sharma', phone: '+91 98765 43210', role: 'Nurse' },
  { id: 'nurse-2', name: 'Anjali Verma', phone: '+91 87654 32109', role: 'Nurse' },
  { id: 'nurse-3', name: 'Sunita Patel', phone: '+91 76543 21098', role: 'Nurse' },
  { id: 'support-1', name: 'Rajesh Kumar', phone: '+91 99887 76655', role: 'Support Staff' },
  { id: 'support-2', name: 'Amit Singh', phone: '+91 88776 65544', role: 'Support Staff' },
  { id: 'support-3', name: 'Deepak Yadav', phone: '+91 77665 54433', role: 'Support Staff' },
  { id: 'psychiatrist-1', name: 'Dr. Meera Reddy', phone: '+91 96543 21098', role: 'Psychiatrist' },
  { id: 'psychiatrist-2', name: 'Dr. Arun Gupta', phone: '+91 95432 10987', role: 'Psychiatrist' },
];

export default function GeneralManagerStaff() {
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Fetch doctors from Firebase
  useEffect(() => {
    async function loadDoctors() {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'doctorProfiles'));
        const docs = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name || 'Unknown Doctor',
            phone: data.phone || '—',
            role: 'Doctor',
            email: data.email || '',
            specialization: data.specialization || data.degree || '',
          };
        });
        setDoctors(docs);
      } catch (error) {
        console.error('Error loading doctors:', error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    }
    void loadDoctors();
  }, []);

  // Combine hardcoded staff with doctors from Firebase
  const allStaff = [...hardcodedStaff, ...doctors];

  // Filter by role and search text
  const filtered = allStaff.filter((s) => {
    if (filterRole !== 'all' && s.role !== filterRole) return false;
    if (!searchText.trim()) return true;
    const q = searchText.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.specialization && s.specialization.toLowerCase().includes(q))
    );
  });

  // Get unique roles for filter dropdown
  const roles = ['all', 'Nurse', 'Support Staff', 'Psychiatrist', 'Doctor'];

  // Role badge colors
  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'Nurse':
        return 'bg-pink-100 text-pink-700';
      case 'Support Staff':
        return 'bg-slate-100 text-slate-700';
      case 'Psychiatrist':
        return 'bg-purple-100 text-purple-700';
      case 'Doctor':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-600 mt-1">View all hospital staff members</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, phone, or role"
            className="w-full sm:max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All Roles' : r}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-600">
              {loading ? 'Loading…' : `${filtered.length} of ${allStaff.length}`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && doctors.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-sm text-slate-600">No staff members found.</div>
        ) : (
          filtered.map((staff) => (
            <div key={staff.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-sm font-semibold">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{staff.name}</p>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs mt-1 ${getRoleBadgeClass(staff.role)}`}>
                    {staff.role}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">📞</span>
                  <span>{staff.phone}</span>
                </div>
                {staff.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">✉️</span>
                    <span className="truncate">{staff.email}</span>
                  </div>
                )}
                {staff.specialization && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">🏥</span>
                    <span>{staff.specialization}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

