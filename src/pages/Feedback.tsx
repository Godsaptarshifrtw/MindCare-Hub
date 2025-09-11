import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

type Row = {
  id: string;
  uid?: string;
  doctor?: string;
  review?: string;
  rating?: number;
  subject?: string;
  message?: string;
  createdAt?: any;
  status?: string;
};

export default function Feedback() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState('');
  const [status, setStatus] = useState<string>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        try {
          const qRef = query(collection(db, 'patientFeedback'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(qRef);
          setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
        } catch {
          const snap = await getDocs(collection(db, 'patientFeedback'));
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          items.sort((a: any, b: any) => {
            const at = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const bt = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
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

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && (r.status || 'new') !== status) return false;
      if (!q) return true;
      const hay = [r.doctor, r.subject, r.review, r.message, r.uid]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }, [rows, qText, status]);

  function fmt(value: any) {
    try {
      return value?.toDate ? value.toDate().toLocaleString() : '';
    } catch { return ''; }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Feedback</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Search doctor, subject, review, uid"
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
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
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
                <th className="px-4 py-2 text-left font-medium">When</th>
                <th className="px-4 py-2 text-left font-medium">Doctor</th>
                <th className="px-4 py-2 text-left font-medium">Rating</th>
                <th className="px-4 py-2 text-left font-medium">Summary</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td className="px-4 py-3 text-slate-600" colSpan={5}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-3 text-slate-600" colSpan={5}>No feedback found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{fmt(r.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-900">{r.doctor || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={(r.rating || 0) >= i ? '#fbbf24' : 'none'} stroke={(r.rating || 0) >= i ? '#fbbf24' : '#9ca3af'} className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.562 0 00-.586 0L6.482 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.562 0 00-.182-.557L2.54 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z" />
                          </svg>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[420px]">
                      <div className="truncate">
                        {r.review || r.message || r.subject || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                        (r.status || 'new') === 'resolved' ? 'bg-green-100 text-green-700' : (r.status || 'new') === 'reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>{r.status || 'new'}</span>
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


