import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function GeneralManagerRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('General Manager');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!user?.uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'generalManagerProfiles', user.uid), {
        name: name.trim(),
        age: age.trim(),
        phone: phone.trim(),
        email: email.trim() || user.email || '',
        position: position.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      navigate('/generalmanager');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-xl font-semibold text-slate-900">General Manager Registration</h1>
          <p className="text-sm text-slate-600 mt-1">Please complete your details to continue.</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-800">Full Name <span className="text-red-500">*</span></label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. John Doe" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="age" className="text-sm font-medium text-slate-800">Age</label>
                <input id="age" type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. 40" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-slate-800">Phone Number</label>
                <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. +1 555 000 1111" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-800">Email</label>
              <input id="email" type="email" value={email || user?.email || ''} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. manager@example.com" />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="position" className="text-sm font-medium text-slate-800">Position</label>
              <input id="position" value={position} onChange={(e) => setPosition(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="General Manager" />
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

