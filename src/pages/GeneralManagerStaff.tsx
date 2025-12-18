import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

type StaffMember = {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
  specialization?: string;
  staffId?: string;
  age?: number;
  gender?: string;
  address?: string;
  education?: string;
};

// Hardcoded staff members with full details
const hardcodedStaff: StaffMember[] = [
  { id: 'nurse-1', staffId: 'NRS001', name: 'Priya Sharma', phone: '+91 98765 43210', role: 'Nurse', email: 'priya.sharma@mindcare.in', age: 28, gender: 'Female', address: '123 MG Road, Bangalore', education: 'B.Sc Nursing' },
  { id: 'nurse-2', staffId: 'NRS002', name: 'Anjali Verma', phone: '+91 87654 32109', role: 'Nurse', email: 'anjali.verma@mindcare.in', age: 32, gender: 'Female', address: '45 Park Street, Kolkata', education: 'B.Sc Nursing' },
  { id: 'nurse-3', staffId: 'NRS003', name: 'Sunita Patel', phone: '+91 76543 21098', role: 'Nurse', email: 'sunita.patel@mindcare.in', age: 26, gender: 'Female', address: '78 Gandhi Nagar, Ahmedabad', education: 'GNM Nursing' },
  { id: 'support-1', staffId: 'SUP001', name: 'Rajesh Kumar', phone: '+91 99887 76655', role: 'Support Staff', email: 'rajesh.kumar@mindcare.in', age: 35, gender: 'Male', address: '56 Nehru Place, Delhi', education: '12th Pass' },
  { id: 'support-2', staffId: 'SUP002', name: 'Amit Singh', phone: '+91 88776 65544', role: 'Support Staff', email: 'amit.singh@mindcare.in', age: 29, gender: 'Male', address: '90 Civil Lines, Jaipur', education: '10th Pass' },
  { id: 'support-3', staffId: 'SUP003', name: 'Deepak Yadav', phone: '+91 77665 54433', role: 'Support Staff', email: 'deepak.yadav@mindcare.in', age: 31, gender: 'Male', address: '12 Laxmi Nagar, Lucknow', education: 'ITI Diploma' },
  { id: 'psychiatrist-1', staffId: 'PSY001', name: 'Dr. Meera Reddy', phone: '+91 96543 21098', role: 'Psychiatrist', email: 'meera.reddy@mindcare.in', age: 42, gender: 'Female', address: '34 Banjara Hills, Hyderabad', education: 'MD Psychiatry' },
  { id: 'psychiatrist-2', staffId: 'PSY002', name: 'Dr. Arun Gupta', phone: '+91 95432 10987', role: 'Psychiatrist', email: 'arun.gupta@mindcare.in', age: 48, gender: 'Male', address: '67 Marine Drive, Mumbai', education: 'MD Psychiatry' },
];

export default function GeneralManagerStaff() {
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [customStaff, setCustomStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for new staff
  const [newStaff, setNewStaff] = useState({
    name: '',
    staffId: '',
    age: '',
    phone: '',
    gender: '',
    address: '',
    email: '',
    education: '',
    role: 'Nurse',
  });

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
            staffId: `DOC${d.id.slice(0, 4).toUpperCase()}`,
            name: data.name || 'Unknown Doctor',
            phone: data.phone || '—',
            role: 'Doctor',
            email: data.email || '',
            specialization: data.specialization || data.degree || '',
            age: data.age || undefined,
            gender: data.gender || '',
            address: data.address || '',
            education: data.degree || '',
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

  // Fetch custom staff from Firebase
  useEffect(() => {
    async function loadCustomStaff() {
      try {
        const snap = await getDocs(collection(db, 'staff'));
        const items = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            staffId: data.staffId || '',
            name: data.name || '',
            phone: data.phone || '',
            role: data.role || '',
            email: data.email || '',
            age: data.age || undefined,
            gender: data.gender || '',
            address: data.address || '',
            education: data.education || '',
          };
        });
        setCustomStaff(items);
      } catch {
        setCustomStaff([]);
      }
    }
    void loadCustomStaff();
  }, []);

  // Combine hardcoded staff with doctors and custom staff from Firebase
  const allStaff = [...hardcodedStaff, ...doctors, ...customStaff];

  // Filter by role and search text
  const filtered = allStaff.filter((s) => {
    if (filterRole !== 'all' && s.role !== filterRole) return false;
    if (!searchText.trim()) return true;
    const q = searchText.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.specialization && s.specialization.toLowerCase().includes(q)) ||
      (s.staffId && s.staffId.toLowerCase().includes(q))
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

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.phone.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'staff'), {
        ...newStaff,
        age: newStaff.age ? parseInt(newStaff.age) : null,
        createdAt: serverTimestamp(),
      });
      // Refresh custom staff
      const snap = await getDocs(collection(db, 'staff'));
      const items = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          staffId: data.staffId || '',
          name: data.name || '',
          phone: data.phone || '',
          role: data.role || '',
          email: data.email || '',
          age: data.age || undefined,
          gender: data.gender || '',
          address: data.address || '',
          education: data.education || '',
        };
      });
      setCustomStaff(items);
      setShowAddModal(false);
      setNewStaff({ name: '', staffId: '', age: '', phone: '', gender: '', address: '', email: '', education: '', role: 'Nurse' });
    } catch (error) {
      console.error('Error adding staff:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-600 mt-1">View all hospital staff members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2 hover:bg-[#005bb5]"
        >
          + Add Staff
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, phone, ID, or role"
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
                {staff.staffId && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">🆔</span>
                    <span>{staff.staffId}</span>
                  </div>
                )}
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
              </div>
              <button
                onClick={() => setViewingStaff(staff)}
                className="mt-3 text-xs text-[#0066CC] hover:underline self-start"
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* View Details Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Staff Details</h2>
              <button onClick={() => setViewingStaff(null)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-lg font-semibold">
                {viewingStaff.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-medium text-slate-900">{viewingStaff.name}</p>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs mt-1 ${getRoleBadgeClass(viewingStaff.role)}`}>
                  {viewingStaff.role}
                </span>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Staff ID</span>
                <span className="text-slate-900 font-medium">{viewingStaff.staffId || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Age</span>
                <span className="text-slate-900 font-medium">{viewingStaff.age || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Gender</span>
                <span className="text-slate-900 font-medium">{viewingStaff.gender || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Phone</span>
                <span className="text-slate-900 font-medium">{viewingStaff.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900 font-medium truncate max-w-[180px]">{viewingStaff.email || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Address</span>
                <span className="text-slate-900 font-medium text-right max-w-[180px]">{viewingStaff.address || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Education</span>
                <span className="text-slate-900 font-medium">{viewingStaff.education || viewingStaff.specialization || '—'}</span>
              </div>
            </div>
            <button
              onClick={() => setViewingStaff(null)}
              className="mt-6 w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Add New Staff</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>
            <form onSubmit={handleAddStaff} className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Name *</label>
                <input
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Staff ID</label>
                  <input
                    value={newStaff.staffId}
                    onChange={(e) => setNewStaff({ ...newStaff, staffId: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. NRS004"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Age</label>
                  <input
                    type="number"
                    value={newStaff.age}
                    onChange={(e) => setNewStaff({ ...newStaff, age: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Phone *</label>
                  <input
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Gender</label>
                  <select
                    value={newStaff.gender}
                    onChange={(e) => setNewStaff({ ...newStaff, gender: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Address</label>
                <input
                  value={newStaff.address}
                  onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Education/Degree</label>
                  <input
                    value={newStaff.education}
                    onChange={(e) => setNewStaff({ ...newStaff, education: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Role *</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                    required
                  >
                    <option value="Nurse">Nurse</option>
                    <option value="Support Staff">Support Staff</option>
                    <option value="Psychiatrist">Psychiatrist</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2 hover:bg-[#005bb5] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
