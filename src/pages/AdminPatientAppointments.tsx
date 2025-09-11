import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

export default function AdminPatientAppointments() {
  const { id } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) { setItems([]); setLoading(false); return; }
      setLoading(true);
      try {
        try {
          const qRef = query(
            collection(db, 'appointments'),
            where('patientUid', '==', id),
            orderBy('appointmentDetails.date', 'desc')
          );
          const snap = await getDocs(qRef);
          setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        } catch {
          const qRef = query(collection(db, 'appointments'), where('patientUid', '==', id));
          const snap = await getDocs(qRef);
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          rows.sort((a: any, b: any) => {
            const aT = a?.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().getTime() : 0;
            const bT = b?.appointmentDetails?.date?.toDate ? b.appointmentDetails.date.toDate().getTime() : 0;
            return bT - aT;
          });
          setItems(rows);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  function fmt(value: any) {
    try {
      return value?.toDate ? value.toDate().toLocaleString() : '';
    } catch { return ''; }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Patient Appointments</h1>
        <p className="text-sm text-slate-600">Admin view</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-slate-600">No appointments found.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {items.map((a) => (
              <li key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{a.doctor || 'Doctor'}</p>
                  <p className="text-xs text-slate-600">{fmt(a.appointmentDetails?.date)} | {a.appointmentDetails?.dateString} {a.appointmentDetails?.time}</p>
                </div>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{a.status || 'scheduled'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


