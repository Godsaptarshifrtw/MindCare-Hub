import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, limit, orderBy, query, where, Timestamp, getCountFromServer } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const welcome = useMemo(() => {
    const name = user?.displayName || user?.email || 'Doctor';
    return `Welcome back, ${name}`;
  }, [user]);

  // Count today's appointments for this doctor
  const todaysAppointments = useQuery({
    queryKey: ['doctor-appointments-today', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = Timestamp.fromDate(today);
      const end = Timestamp.fromDate(tomorrow);
      try {
        const q = query(
          collection(db, 'appointments'),
          where('doctorId', '==', user.uid),
          where('appointmentDetails.date', '>=', start),
          where('appointmentDetails.date', '<', end)
        );
        const snap = await getCountFromServer(q);
        return snap.data().count;
      } catch {
        // Fallback: count all appointments and filter manually
        const snap = await getDocs(collection(db, 'appointments'));
        const todayStr = today.toDateString();
        return snap.docs.filter(doc => {
          const data = doc.data();
          const apptDate = data?.appointmentDetails?.date;
          if (!apptDate) return false;
          const date = apptDate.toDate ? apptDate.toDate() : new Date(apptDate);
          return date.toDateString() === todayStr && data.doctorId === user.uid;
        }).length;
      }
    },
    refetchInterval: 300000,
    enabled: !!user?.uid,
  });

  // Count total appointments for this doctor
  const totalAppointments = useQuery({
    queryKey: ['doctor-appointments-total', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return 0;
      try {
        const q = query(collection(db, 'appointments'), where('doctorId', '==', user.uid));
        const snap = await getCountFromServer(q);
        return snap.data().count;
      } catch {
        const snap = await getDocs(collection(db, 'appointments'));
        return snap.docs.filter(doc => doc.data().doctorId === user.uid).length;
      }
    },
    refetchInterval: 300000,
    enabled: !!user?.uid,
  });

  // Count ongoing treatments for this doctor
  const ongoingTreatments = useQuery({
    queryKey: ['doctor-treatments-ongoing', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return 0;
      try {
        const q = query(
          collection(db, 'treatments'),
          where('createdByUid', '==', user.uid),
          where('status', '==', 'ongoing')
        );
        const snap = await getCountFromServer(q);
        return snap.data().count;
      } catch {
        const snap = await getDocs(collection(db, 'treatments'));
        return snap.docs.filter(doc => {
          const data = doc.data();
          return data.createdByUid === user.uid && data.status === 'ongoing';
        }).length;
      }
    },
    refetchInterval: 300000,
    enabled: !!user?.uid,
  });

  const recentActivities = useQuery({
    queryKey: ['doctor-recent-activities', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      
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

      const [apptSnap, trtSnap] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), orderBy('appointmentDetails.date', 'desc'), limit(10))),
        getDocs(query(collection(db, 'treatments'), orderBy('date', 'desc'), limit(10))),
      ]);

      const apptItems = apptSnap.docs
        .filter(d => d.data().doctorId === user.uid)
        .map((d) => {
          const a: any = d.data();
          const when = a?.appointmentDetails?.date;
          const patient = a?.patientName || a?.appointmentDetails?.patientId || 'Patient';
          return { id: `appt-${d.id}`, text: `Appointment with ${patient}`, ts: toMillis(when) };
        });

      const trtItems = trtSnap.docs
        .filter(d => d.data().createdByUid === user.uid)
        .map((d) => {
          const t: any = d.data();
          return { id: `trt-${d.id}`, text: `Treatment ${t.status || 'updated'} for ${t.patientName || t.patientId || 'Patient'}`, ts: toMillis(t?.date) };
        });

      const merged = [...apptItems, ...trtItems]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 10)
        .map((i) => ({ id: i.id, text: i.text, time: new Date(i.ts || Date.now()).toLocaleString() }));

      return merged;
    },
    refetchInterval: 120000,
    enabled: !!user?.uid,
  });

  const cards = [
    { title: "Today's Appointments", query: todaysAppointments, trend: 'Check schedule', trendUp: true },
    { title: 'Total Appointments', query: totalAppointments, trend: 'All time', trendUp: true },
    { title: 'Ongoing Treatments', query: ongoingTreatments, trend: 'Active cases', trendUp: true },
    { title: 'Profile Status', query: { data: 'Active', isLoading: false } as any, trend: 'Registered', trendUp: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doctor Dashboard</h1>
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
          ) : (recentActivities.data as any[]).length === 0 ? (
            <p className="text-sm text-slate-500">No recent activities.</p>
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
              onClick={() => navigate('/doctor/treatments')}
              className="w-full rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2 hover:bg-[#005bb5]"
            >
              📋 Create Treatment
            </button>
            <button 
              onClick={() => navigate('/doctor/appointments')}
              className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50"
            >
              📅 View Appointments
            </button>
            <button className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50">
              👤 View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

