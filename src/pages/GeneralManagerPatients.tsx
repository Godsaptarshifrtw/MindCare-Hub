import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getCountFromServer, getDoc, getDocs, query, where } from 'firebase/firestore';

type Patient = {
  id: string;
  name?: string;
  patientId?: string;
  age?: string;
  gender?: string;
  phone?: string;
  address?: string;
};

export default function GeneralManagerPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [summaries, setSummaries] = useState<Record<string, { appointments: number; hasProfile: boolean }>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'patients'));
        let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (rows.length === 0) {
          const alt = await getDocs(collection(db, 'patientProfiles'));
          rows = alt.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
        setPatients(rows as any);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [p.name, p.patientId, p.phone, p.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [patients, queryText]);

  useEffect(() => {
    async function loadSummaries(items: Patient[]) {
      const limitCount = 24;
      const slice = items.slice(0, limitCount);
      const results: Record<string, { appointments: number; hasProfile: boolean }> = {};
      await Promise.all(slice.map(async (p) => {
        const id = p.id;
        let apptCount = 0;
        try {
          const c1 = await getCountFromServer(query(collection(db, 'appointments'), where('patientUid', '==', id)));
          apptCount = c1.data().count;
          if (apptCount === 0 && p.patientId) {
            const c2 = await getCountFromServer(query(collection(db, 'appointments'), where('appointmentDetails.patientId', '==', p.patientId)) as any);
            apptCount = c2.data().count;
          }
        } catch {}
        let hasProfile = false;
        try {
          const prof = await getDoc(doc(db, 'patientProfiles', id));
          hasProfile = prof.exists();
        } catch {}
        results[id] = { appointments: apptCount, hasProfile };
      }));
      setSummaries((prev) => ({ ...prev, ...results }));
    }
    if (patients.length) void loadSummaries(patients);
  }, [patients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search by name, ID, or phone"
            className="w-full sm:max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <div className="text-xs text-slate-600">
            {loading ? 'Loading…' : `${filtered.length} of ${patients.length} patients`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-sm text-slate-600">No patients found.</div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-sm font-semibold">
                  {(p.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name || 'Unnamed Patient'}</p>
                  <p className="text-xs text-slate-600 truncate">ID: {p.patientId || '—'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>Age: {p.age || '—'}</div>
                <div>Gender: {p.gender || '—'}</div>
                <div className="col-span-2 truncate">Phone: {p.phone || '—'}</div>
                <div className="col-span-2 flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                    Appointments: {summaries[p.id]?.appointments ?? '—'}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${summaries[p.id]?.hasProfile ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    Profile: {summaries[p.id]?.hasProfile ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/generalmanager/patients/${p.id}/appointments`)}
                  className="rounded-md bg-teal-600 text-white text-xs font-medium px-2.5 py-1.5 hover:bg-teal-700"
                >
                  Appointments
                </button>
                <button
                  onClick={() => navigate(`/generalmanager/patients/${p.id}/profile`)}
                  className="rounded-md border border-slate-300 text-xs font-medium px-2.5 py-1.5 hover:bg-slate-50"
                >
                  Profile
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

