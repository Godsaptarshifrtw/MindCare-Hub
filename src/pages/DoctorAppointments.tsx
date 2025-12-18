import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, where, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

type Row = {
  id: string;
  doctor?: string;
  doctorId?: string;
  patientUid?: string;
  patientName?: string;
  appointmentDetails?: {
    date?: any;
    dateString?: string;
    time?: string;
    patientId?: string;
  };
  status?: string;
};

type PatientProfile = {
  name?: string;
  age?: string;
  gender?: string;
  phone?: string;
  address?: string;
  allergies?: string;
  currentMedications?: string;
  patientId?: string;
};

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [viewingProfile, setViewingProfile] = useState<PatientProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedPatientUid, setSelectedPatientUid] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        try {
          // Try to query by doctorId with orderBy
          const qRef = query(
            collection(db, 'appointments'),
            where('doctorId', '==', user.uid),
            orderBy('appointmentDetails.date', 'desc')
          );
          const snap = await getDocs(qRef);
          setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
        } catch {
          // Fallback: query by doctorId only (without orderBy if index is missing)
          try {
            const qRef = query(
              collection(db, 'appointments'),
              where('doctorId', '==', user.uid)
            );
            const snap = await getDocs(qRef);
            const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            // Sort manually by date
            items.sort((a: any, b: any) => {
              const aTime = a?.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().getTime() : (a?.appointmentDetails?.date?.seconds ? a.appointmentDetails.date.seconds * 1000 : 0);
              const bTime = b?.appointmentDetails?.date?.toDate ? b.appointmentDetails.date.toDate().getTime() : (b?.appointmentDetails?.date?.seconds ? b.appointmentDetails.date.seconds * 1000 : 0);
              return bTime - aTime;
            });
            setRows(items as any);
          } catch {
            // Last fallback: get all and filter strictly by doctorId only
            const snap = await getDocs(collection(db, 'appointments'));
            const items = snap.docs
              .filter(d => {
                const data = d.data();
                // ONLY match by doctorId - this is the most reliable way
                return data.doctorId === user.uid;
              })
              .map((d) => ({ id: d.id, ...(d.data() as any) }));
            // Sort by date
            items.sort((a: any, b: any) => {
              const aTime = a?.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().getTime() : (a?.appointmentDetails?.date?.seconds ? a.appointmentDetails.date.seconds * 1000 : 0);
              const bTime = b?.appointmentDetails?.date?.toDate ? b.appointmentDetails.date.toDate().getTime() : (b?.appointmentDetails?.date?.seconds ? b.appointmentDetails.date.seconds * 1000 : 0);
              return bTime - aTime;
            });
            setRows(items as any);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user?.uid]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && (r.status || 'scheduled') !== status) return false;
      if (!q) return true;
      const hay = [
        r.patientName,
        r.appointmentDetails?.patientId,
        r.appointmentDetails?.dateString,
        r.appointmentDetails?.time,
        r.status,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }, [rows, qText, status]);

  function fmt(value: any, dateString?: string, time?: string) {
    try {
      if (value?.toDate) return value.toDate().toLocaleString();
      return [dateString, time].filter(Boolean).join(' ');
    } catch { return [dateString, time].filter(Boolean).join(' '); }
  }

  async function handleViewProfile(patientUid: string | undefined, patientId: string | undefined) {
    if (!patientUid && !patientId) {
      setProfileError('Patient information not available');
      return;
    }
    
    setLoadingProfile(true);
    setProfileError(null);
    setSelectedPatientUid(patientUid || null);
    
    try {
      // Try patientUid first (most common case)
      if (patientUid) {
        const profSnap = await getDoc(doc(db, 'patientProfiles', patientUid));
        if (profSnap.exists()) {
          setViewingProfile(profSnap.data() as PatientProfile);
          setLoadingProfile(false);
          return;
        }
      }
      
      // Fallback: try patients collection by ID if patientId is provided
      if (patientId) {
        try {
          const patSnap = await getDoc(doc(db, 'patients', patientId));
          if (patSnap.exists()) {
            setViewingProfile(patSnap.data() as PatientProfile);
            setLoadingProfile(false);
            return;
          }
        } catch {}
      }
      
      // If still not found, try searching by patientId in patientProfiles
      if (patientId && !patientUid) {
        // We'd need to query, but for now show error
        setProfileError('Patient profile not found');
      } else {
        setProfileError('Patient profile not found');
      }
    } catch (error) {
      setProfileError('Failed to load patient profile');
    } finally {
      setLoadingProfile(false);
    }
  }

  function Field({ label, value, full }: { label: string; value?: string; full?: boolean }) {
    return (
      <div className={full ? 'sm:col-span-2' : ''}>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-900 mt-0.5">{value && String(value).trim() ? String(value) : '—'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Appointments</h1>
          <p className="text-sm text-slate-600 mt-1">View all appointments scheduled for you.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Search patient name, ID, date, time, status"
            className="w-full sm:max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="text-xs text-slate-600">{loading ? 'Loading…' : `${filtered.length} of ${rows.length}`}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Patient Name</th>
                <th className="px-4 py-2 text-left font-medium">Patient ID</th>
                <th className="px-4 py-2 text-left font-medium">Date & Time</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td className="px-4 py-3 text-slate-600" colSpan={5}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-3 text-slate-600" colSpan={5}>No appointments found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{r.patientName || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.appointmentDetails?.patientId || r.patientUid || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{fmt(r.appointmentDetails?.date, r.appointmentDetails?.dateString, r.appointmentDetails?.time)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                        (r.status || 'scheduled') === 'completed' ? 'bg-green-100 text-green-700' : (r.status || 'scheduled') === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>{r.status || 'scheduled'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewProfile(r.patientUid, r.appointmentDetails?.patientId)}
                        className="text-sm text-[#0066CC] hover:text-[#005bb5] font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Profile Modal */}
      {selectedPatientUid !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => { setViewingProfile(null); setSelectedPatientUid(null); setProfileError(null); }}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">Patient Profile</h3>
              <button
                onClick={() => { setViewingProfile(null); setSelectedPatientUid(null); setProfileError(null); }}
                className="rounded-md border border-slate-300 text-sm font-medium px-3 py-1.5 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              {loadingProfile ? (
                <div className="text-center py-8 text-sm text-slate-600">Loading profile…</div>
              ) : profileError ? (
                <div className="text-center py-8 text-sm text-red-600">{profileError}</div>
              ) : viewingProfile ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-1">Overview</h2>
                    <p className="text-sm text-slate-600">Basic info and contact details</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <Field label="Name" value={viewingProfile.name} />
                    <Field label="Patient ID" value={viewingProfile.patientId} />
                    <Field label="Age" value={viewingProfile.age} />
                    <Field label="Gender" value={viewingProfile.gender} />
                    <Field label="Phone" value={viewingProfile.phone} />
                    <Field label="Address" value={viewingProfile.address} full />
                  </div>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-1">Health Information</h2>
                    <p className="text-sm text-slate-600 mb-4">Allergies and medications</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <Field label="Allergies" value={viewingProfile.allergies} full />
                    <Field label="Current Medications" value={viewingProfile.currentMedications} full />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

