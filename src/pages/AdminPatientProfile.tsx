import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

type Profile = {
  name?: string;
  age?: string;
  gender?: string;
  phone?: string;
  address?: string;
  allergies?: string;
  currentMedications?: string;
  patientId?: string;
};

export default function AdminPatientProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) { setError('Missing id'); setLoading(false); return; }
      setLoading(true);
      try {
        // Prefer patientProfiles; fallback to patients collection
        const profSnap = await getDoc(doc(db, 'patientProfiles', id));
        if (profSnap.exists()) {
          setProfile(profSnap.data() as Profile);
          setError(null);
        } else {
          const patSnap = await getDoc(doc(db, 'patients', id));
          if (patSnap.exists()) {
            setProfile(patSnap.data() as Profile);
            setError(null);
          } else {
            setProfile(null);
            setError('Patient not found');
          }
        }
      } catch {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Patient Profile</h1>
        <p className="text-sm text-slate-600">Admin view</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-600">Loading…</div>
        ) : error ? (
          <div className="p-5 text-sm text-red-700">{error}</div>
        ) : profile ? (
          <>
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Overview</h2>
              <p className="text-sm text-slate-600 mt-1">Basic info and contact details</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Name" value={profile.name} />
              <Field label="Patient ID" value={profile.patientId} />
              <Field label="Age" value={profile.age} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Address" value={profile.address} full />
            </div>
            <div className="px-5 py-4 border-t border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Health</h2>
              <p className="text-sm text-slate-600 mt-1">Allergies and medications</p>
            </div>
            <div className="p-5 grid grid-cols-1 gap-6">
              <Field label="Allergies" value={profile.allergies} full />
              <Field label="Current Medications" value={profile.currentMedications} full />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 mt-0.5">{value && String(value).trim() ? String(value) : '—'}</p>
    </div>
  );
}


