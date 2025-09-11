import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function PatientRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age.trim() || !gender) return;
    if (!user?.uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'patientProfiles', user.uid), {
        name: name.trim(),
        age: age.trim(),
        gender,
        phone: phone.trim(),
        address: address.trim(),
        allergies: allergies.trim(),
        currentMedications: currentMeds.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      navigate('/patient');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-xl font-semibold text-slate-900">Patient Registration</h1>
          <p className="text-sm text-slate-600 mt-1">Please complete your details to continue.</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-800">Full Name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. John Doe" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="age" className="text-sm font-medium text-slate-800">Age</label>
                <input id="age" type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. 32" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="gender" className="text-sm font-medium text-slate-800">Gender</label>
                <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                  <option value="" disabled>Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-slate-800">Phone Number</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. +1 555 000 1111" />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-slate-800">Address</label>
              <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Street, City, State" />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="allergies" className="text-sm font-medium text-slate-800">Allergies (e.g., medicines, food)</label>
              <textarea id="allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="List allergies" />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="meds" className="text-sm font-medium text-slate-800">Current Medications</label>
              <textarea id="meds" value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="List current medications" />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#005bb5] disabled:opacity-60">
                {saving ? 'Saving…' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


