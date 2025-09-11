import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

type Row = {
  id: string;
  doctor?: string;
  patientUid?: string;
  appointmentDetails?: {
    date?: any;
    dateString?: string;
    time?: string;
    patientId?: string;
  };
  status?: string;
};

export default function Appointments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [importName, setImportName] = useState('');
  const [importId, setImportId] = useState('');
  const [importedPatient, setImportedPatient] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        try {
          const qRef = query(collection(db, 'appointments'), orderBy('appointmentDetails.date', 'desc'));
          const snap = await getDocs(qRef);
          setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
        } catch {
          const snap = await getDocs(collection(db, 'appointments'));
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          items.sort((a: any, b: any) => {
            const at = a?.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().getTime() : 0;
            const bt = b?.appointmentDetails?.date?.toDate ? b.appointmentDetails.date.toDate().getTime() : 0;
            return bt - at;
          });
          setRows(items as any);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function importPatient() {
    if (!importName.trim() && !importId.trim()) return;
    setImporting(true);
    try {
      let found = null;
      // Try by patientId first (exact match)
      if (importId.trim()) {
        const snap = await getDocs(query(collection(db, 'patients'), where('patientId', '==', importId.trim())));
        if (!snap.empty) {
          found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      // Try by name if not found (exact match)
      if (!found && importName.trim()) {
        const snap = await getDocs(query(collection(db, 'patients'), where('name', '==', importName.trim())));
        if (!snap.empty) {
          found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      // Fallback to patientProfiles
      if (!found) {
        if (importId.trim()) {
          const snap = await getDocs(query(collection(db, 'patientProfiles'), where('patientId', '==', importId.trim())));
          if (!snap.empty) {
            found = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
        if (!found && importName.trim()) {
          const snap = await getDocs(query(collection(db, 'patientProfiles'), where('name', '==', importName.trim())));
          if (!snap.empty) {
            found = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
      }
      // If still not found, try case-insensitive search
      if (!found) {
        const allPatients = await getDocs(collection(db, 'patients'));
        const allProfiles = await getDocs(collection(db, 'patientProfiles'));
        const allDocs = [...allPatients.docs.map(d => ({ id: d.id, ...d.data() } as any)), ...allProfiles.docs.map(d => ({ id: d.id, ...d.data() } as any))];
        
        if (importId.trim()) {
          found = allDocs.find(p => 
            p.patientId && p.patientId.toLowerCase().includes(importId.trim().toLowerCase())
          );
        }
        if (!found && importName.trim()) {
          found = allDocs.find(p => 
            p.name && p.name.toLowerCase().includes(importName.trim().toLowerCase())
          );
        }
      }
      setImportedPatient(found);
    } catch (error) {
      console.error('Import error:', error);
      setImportedPatient(null);
    } finally {
      setImporting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && (r.status || 'scheduled') !== status) return false;
      if (!q) return true;
      const hay = [
        r.doctor,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
      </div>

      {/* Import Patient Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Import Patient Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="import-name" className="block text-sm font-medium text-slate-700 mb-2">Patient Name</label>
            <input
              id="import-name"
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Enter patient name"
            />
          </div>
          <div>
            <label htmlFor="import-id" className="block text-sm font-medium text-slate-700 mb-2">Patient ID</label>
            <input
              id="import-id"
              type="text"
              value={importId}
              onChange={(e) => setImportId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Enter patient ID"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={importPatient}
              disabled={importing || (!importName.trim() && !importId.trim())}
              className="w-full rounded-md bg-teal-600 text-white text-sm font-medium px-4 py-2 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Searching...' : 'Import Details'}
            </button>
          </div>
        </div>
        {importedPatient && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Patient Found</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div><span className="text-slate-600">Name:</span> {importedPatient.name || '—'}</div>
              <div><span className="text-slate-600">ID:</span> {importedPatient.patientId || '—'}</div>
              <div><span className="text-slate-600">Age:</span> {importedPatient.age || '—'}</div>
              <div><span className="text-slate-600">Gender:</span> {importedPatient.gender || '—'}</div>
              <div><span className="text-slate-600">Phone:</span> {importedPatient.phone || '—'}</div>
              <div><span className="text-slate-600">Address:</span> {importedPatient.address || '—'}</div>
            </div>
          </div>
        )}
        {importedPatient === null && !importing && (importName.trim() || importId.trim()) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            No patient found with the provided details.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Search doctor, patient ID, date, time, status"
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
                <th className="px-4 py-2 text-left font-medium">Doctor</th>
                <th className="px-4 py-2 text-left font-medium">Patient ID</th>
                <th className="px-4 py-2 text-left font-medium">When</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td className="px-4 py-3 text-slate-600" colSpan={4}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-3 text-slate-600" colSpan={4}>No appointments found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{r.doctor || 'Doctor'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.appointmentDetails?.patientId || r.patientUid || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{fmt(r.appointmentDetails?.date, r.appointmentDetails?.dateString, r.appointmentDetails?.time)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                        (r.status || 'scheduled') === 'completed' ? 'bg-green-100 text-green-700' : (r.status || 'scheduled') === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>{r.status || 'scheduled'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


