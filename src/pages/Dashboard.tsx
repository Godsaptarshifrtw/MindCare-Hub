import { useQuery } from '@tanstack/react-query';
import { countAppointmentsOnDate, countPatients, countTreatmentsByStatus } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';

export default function Dashboard() {
  const { user } = useAuth();

  const patients = useQuery({ queryKey: ['patients-count'], queryFn: countPatients, refetchInterval: 300000 });
  const todays = useQuery({ queryKey: ['appointments-today'], queryFn: () => countAppointmentsOnDate(new Date()), refetchInterval: 300000 });
  const pendingTreatments = useQuery({ queryKey: ['treatments-ongoing'], queryFn: () => countTreatmentsByStatus('ongoing'), refetchInterval: 300000 });

  const welcome = useMemo(() => {
    const name = user?.displayName || user?.email || 'Clinician';
    return `Welcome back, ${name}`;
  }, [user]);

  const cards = [
    { title: 'Total Patients', query: patients, trend: '+12%', trendUp: true },
    { title: "Today's Appointments", query: todays, trend: '+5 vs yesterday', trendUp: true },
    { title: 'Pending Treatments', query: pendingTreatments, trend: '-8 vs last week', trendUp: false },
    { title: 'Patient Satisfaction', query: { data: '4.8/5', isLoading: false } as any, trend: '+0.2 improvement', trendUp: true },
  ];

  const recentActivities = [
    { id: 1, text: 'New patient registered: John Doe', time: '2 mins ago' },
    { id: 2, text: 'Appointment completed: Dr. Smith', time: '5 mins ago' },
    { id: 3, text: 'Treatment updated: Patient ID #1234', time: '10 mins ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hospital Dashboard</h1>
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
          <ul className="divide-y divide-slate-100">
            {recentActivities.map((a) => (
              <li key={a.id} className="py-3 flex items-center gap-3">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{a.text}</p>
                  <p className="text-xs text-slate-500">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            <button className="w-full rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2 hover:bg-[#005bb5]">+ Add New Patient</button>
            <button className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50">📅 Schedule Appointment</button>
            <button className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50">📋 View Today’s Schedule</button>
            <button className="w-full rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50">📊 Generate Report</button>
          </div>
        </div>
      </div>
    </div>
  );
}


