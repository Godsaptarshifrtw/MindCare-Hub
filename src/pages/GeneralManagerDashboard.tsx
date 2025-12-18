import { useQuery } from '@tanstack/react-query';
import { countPatients, countDoctors } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function GeneralManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const welcome = useMemo(() => {
    const name = user?.displayName || user?.email || 'General Manager';
    return `Welcome back, ${name}`;
  }, [user]);

  const patients = useQuery({ queryKey: ['patients-count'], queryFn: countPatients, refetchInterval: 300000 });
  const doctors = useQuery({ queryKey: ['doctors-count'], queryFn: countDoctors, refetchInterval: 300000 });

  const recentActivities = useQuery({
    queryKey: ['gm-recent-activities'],
    queryFn: async () => {
      function toMillis(value: any): number {
        try {
          if (!value) return 0;
          if (value.toDate) return value.toDate().getTime();
          if (typeof value.seconds === 'number') return value.seconds * 1000;
          const d = new Date(value);
          const t = d.getTime();
          return Number.isNaN(t) ? 0 : t;
        } catch { return 0; }
      }

      const [apptSnap, trtSnap, fbSnap] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), orderBy('appointmentDetails.date', 'desc'), limit(5))),
        getDocs(query(collection(db, 'treatments'), orderBy('date', 'desc'), limit(5))),
        getDocs(query(collection(db, 'patientFeedback'), orderBy('createdAt', 'desc'), limit(5))),
      ]);

      const apptItems = apptSnap.docs.map((d) => {
        const a: any = d.data();
        const when = a?.appointmentDetails?.date;
        const doctor = a?.doctor || a?.doctorName || 'Doctor';
        const patient = a?.patientName || a?.appointmentDetails?.patientId || a?.patientUid || 'Patient';
        return { id: `appt-${d.id}`, text: `Appointment booked with ${doctor} by ${patient}`, ts: toMillis(when) };
      });

      const trtItems = trtSnap.docs.map((d) => {
        const t: any = d.data();
        return { id: `trt-${d.id}`, text: `Treatment ${t.status || 'updated'} for ${t.patientName || t.patientId || 'Patient'}`, ts: toMillis(t?.date) };
      });

      const fbItems = fbSnap.docs.map((d) => {
        const f: any = d.data();
        return { id: `fb-${d.id}`, text: `Feedback ${f.status || 'submitted'} for ${f.doctor || 'Doctor'}`, ts: toMillis(f?.createdAt) };
      });

      const merged = [...apptItems, ...trtItems, ...fbItems]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 10)
        .map((i) => ({ id: i.id, text: i.text, time: new Date(i.ts || Date.now()).toLocaleString() }));

      return merged;
    },
    refetchInterval: 120000,
  });

  const cards = [
    { title: 'Total Patients', query: patients, trend: 'Registered', trendUp: true },
    { title: 'Total Doctors', query: doctors, trend: 'Active', trendUp: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">General Manager Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">{welcome}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.title} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">{c.title}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold text-slate-900">
                {c.query.isLoading ? '…' : (c as any).query.error ? '—' : (c as any).query.data}
              </p>
              <span className={`text-xs font-medium px-2 py-1 rounded ${c.trendUp ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                {c.trendUp ? '↗' : '↘'} {c.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Recent Activities</h2>
          </div>
          {recentActivities.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : recentActivities.error ? (
            <p className="text-sm text-slate-500">Unable to load activities.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(recentActivities.data as any[]).map((a) => (
                <li key={a.id} className="py-3 flex items-center gap-3">
                  <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{a.text}</p>
                    <p className="text-xs text-slate-500">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => navigate('/generalmanager/patients')}
              className="w-full rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2 hover:bg-[#005bb5]"
            >
              👥 View Patients
            </button>
            <button 
              onClick={() => navigate('/generalmanager/appointments')}
              className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50"
            >
              📅 View Appointments
            </button>
            <button 
              onClick={() => navigate('/generalmanager/feedback')}
              className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50"
            >
              💬 View Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

