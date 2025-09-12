import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';

type Treatment = {
  id: string;
  patientId?: string;
  patientName?: string;
  problem?: string;
  duration?: string;
  pastHistory?: string;
  medications?: string;
  status?: string;
  date?: any;
  createdByName?: string;
};

export default function PatientTreatments() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string>('');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUid = useMemo(() => Boolean(user?.uid), [user?.uid]);

  useEffect(() => {
    async function resolveAndLoad() {
      if (!user?.uid) { setTreatments([]); return; }
      setLoading(true);
      setError(null);
      try {
        // 1) Try get patientId from patientProfiles/{uid}
        let pid = '';
        try {
          const profSnap = await getDoc(doc(db, 'patientProfiles', user.uid));
          const profile = profSnap.exists() ? (profSnap.data() as any) : null;
          pid = (profile?.patientId || '').trim();
          if (!pid && profile?.name) {
            // 2) Fallback: find by exact name in patients
            const snap = await getDocs(query(collection(db, 'patients'), where('name', '==', String(profile.name))));
            if (!snap.empty) {
              const info = snap.docs[0].data() as any;
              pid = (info?.patientId || '').trim();
            }
          }
        } catch {}
        setPatientId(pid);

        // Load treatments
        if (pid) {
          try {
            const tQ = query(collection(db, 'treatments'), where('patientId', '==', pid), orderBy('date', 'desc'));
            const tSnap = await getDocs(tQ);
            setTreatments(tSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
          } catch {
            const tSnap = await getDocs(query(collection(db, 'treatments'), where('patientId', '==', pid)));
            const rows = tSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
            rows.sort((a: any, b: any) => {
              const at = a?.date?.toDate ? a.date.toDate().getTime() : (a?.date?.seconds ? a.date.seconds * 1000 : 0);
              const bt = b?.date?.toDate ? b.date.toDate().getTime() : (b?.date?.seconds ? b.date.seconds * 1000 : 0);
              return bt - at;
            });
            setTreatments(rows as any);
          }
        } else {
          setTreatments([]);
          setError('Unable to resolve your Patient ID. Please complete your profile or contact support.');
        }
      } finally {
        setLoading(false);
      }
    }
    void resolveAndLoad();
  }, [hasUid, user?.uid]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Your Treatments</h1>
            <p className="text-sm text-slate-600 mt-1">View treatments recorded by clinicians for your visits.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading treatments…</div>
        ) : error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
        ) : treatments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No treatments found.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ul className="divide-y divide-slate-100">
              {treatments.map((t) => (
                <li key={t.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{t.problem || 'Treatment'}</p>
                      <p className="text-xs text-slate-600 truncate">{t.medications ? `Meds: ${t.medications}` : (t.pastHistory || '—')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">{t.date?.toDate ? t.date.toDate().toLocaleString() : (t.date || '')}</div>
                      <div className="text-[11px] font-medium mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 bg-slate-50">{t.status || 'ongoing'}</div>
                    </div>
                  </div>
                  {(t.pastHistory || t.medications) && (
                    <div className="mt-2 text-xs text-slate-700 whitespace-pre-wrap break-words">
                      {t.pastHistory && (<p><span className="text-slate-500">Past:</span> {t.pastHistory}</p>)}
                      {t.medications && (<p><span className="text-slate-500">Meds:</span> {t.medications}</p>)}
                    </div>
                  )}
                  {t.createdByName && (
                    <div className="mt-2 text-xs text-slate-500">By: {t.createdByName}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}


