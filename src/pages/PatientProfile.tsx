import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
};

export default function PatientProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.uid) {
        setLoading(false);
        setError('Not signed in');
        return;
      }
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'patientProfiles', user.uid));
        if (snap.exists()) {
          setProfile(snap.data() as Profile);
          setError(null);
        } else {
          setProfile(null);
          setError('No profile found. Complete registration first.');
        }
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[#0066CC] text-white inline-flex items-center justify-center font-semibold">
            {(profile?.name || user?.displayName || 'P').charAt(0).toUpperCase()}
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Patient Profile</h1>
          <p className="text-sm text-slate-600">Your saved information from registration.</p>
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
    </div>
  );
}

function Field({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 mt-0.5">{value && value.trim() ? value : '—'}</p>
    </div>
  );
}


