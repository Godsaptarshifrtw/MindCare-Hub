import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nextAppointments, setNextAppointments] = useState<any[]>([]);
  const [lastFeedbacks, setLastFeedbacks] = useState<any[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);

  useEffect(() => {
    // Try Firestore first (by user.uid), fallback to localStorage for gating
    async function fetchProfile() {
      try {
        if (user?.uid) {
          const ref = doc(db, 'patientProfiles', user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const p = snap.data() as any;
            setName(p.name || '');
            setAge(p.age || '');
            setGender(p.gender || '');
            setPhone(p.phone || '');
            setAddress(p.address || '');
            setAllergies(p.allergies || '');
            setCurrentMeds(p.currentMedications || '');
            setSubmitted(true);
            setShowModal(false);
            return;
          }
        }
      } catch {}
      const stored = localStorage.getItem('patientRegistration');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { name: string; age: string; gender: string; phone?: string; address?: string; allergies?: string; currentMedications?: string };
          setName(parsed.name || '');
          setAge(parsed.age || '');
          setGender(parsed.gender || '');
          setPhone(parsed.phone || '');
          setAddress(parsed.address || '');
          setAllergies(parsed.allergies || '');
          setCurrentMeds(parsed.currentMedications || '');
          setSubmitted(true);
          setShowModal(false);
        } catch { setShowModal(true); }
      } else {
        setShowModal(true);
      }
    }
    void fetchProfile();
  }, [user?.uid]);

  // No modal flow now; ignore ?reg

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age.trim() || !gender) return;
    const payload = {
      name: name.trim(),
      age: age.trim(),
      gender,
      phone: phone.trim(),
      address: address.trim(),
      allergies: allergies.trim(),
      currentMedications: currentMeds.trim(),
      updatedAt: serverTimestamp(),
    };
    try {
      if (user?.uid) {
        await setDoc(doc(db, 'patientProfiles', user.uid), payload, { merge: true });
      }
      localStorage.setItem('patientRegistration', JSON.stringify(payload));
      setSubmitted(true);
      setShowModal(false);
    } catch {
      // keep modal open on failure
    }
  }

  // Load highlights: next appointment and recent feedback
  useEffect(() => {
    async function loadHighlights() {
      if (!user?.uid) { setNextAppointments([]); setLastFeedbacks([]); return; }
      setLoadingHighlights(true);
      try {
        // Next appointment: earliest upcoming for this patient
        try {
          const apptQ = query(
            collection(db, 'appointments'),
            where('patientUid', '==', user.uid),
            orderBy('appointmentDetails.date', 'asc'),
            limit(5)
          );
          const apptSnap = await getDocs(apptQ);
          setNextAppointments(apptSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        } catch {
          // Fallback: fetch without order and pick nearest future by client
          const apptQ = query(collection(db, 'appointments'), where('patientUid', '==', user.uid));
          const snap = await getDocs(apptQ);
          let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          const now = Date.now();
          rows = rows.filter((r: any) => (r?.status || 'scheduled') !== 'cancelled');
          rows.sort((a: any, b: any) => {
            const at = a?.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().getTime() : Infinity;
            const bt = b?.appointmentDetails?.date?.toDate ? b.appointmentDetails.date.toDate().getTime() : Infinity;
            return at - bt;
          });
          const upcoming = rows.filter((r: any) => (r?.appointmentDetails?.date?.toDate ? r.appointmentDetails.date.toDate().getTime() : 0) >= now).slice(0, 5);
          setNextAppointments(upcoming);
        }

        // Last feedback: most recent by createdAt
        try {
          const fbQ = query(
            collection(db, 'patientFeedback'),
            where('uid', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(3)
          );
          const fbSnap = await getDocs(fbQ);
          setLastFeedbacks(fbSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        } catch {
          const fbQ = query(collection(db, 'patientFeedback'), where('uid', '==', user.uid));
          const snap = await getDocs(fbQ);
          let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          rows.sort((a: any, b: any) => {
            const at = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const bt = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return bt - at;
          });
          setLastFeedbacks(rows.slice(0, 3));
        }
      } finally {
        setLoadingHighlights(false);
      }
    }
    void loadHighlights();
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-max lg:sticky lg:top-4">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-slate-900 text-white inline-flex items-center justify-center font-semibold">P</div>
              <div>
                <p className="text-sm font-medium text-slate-900">Patient Portal</p>
                <p className="text-xs text-slate-500">Welcome</p>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <button onClick={() => navigate('/patient')} className="w-full text-left block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Dashboard</button>
            <button onClick={() => navigate('/patient/profile')} className="w-full text-left block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Patient Profile</button>
            <button onClick={() => navigate('/patient/appointments')} className="w-full text-left block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Appointments</button>
            <button onClick={() => navigate('/patient/feedback')} className="w-full text-left block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Feedback</button>
            <button onClick={() => navigate('/patient/treatments')} className="w-full text-left block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Treatment</button>
            <button onClick={async () => { await logout(); navigate('/login'); }} className="w-full text-left block rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50">Log out</button>
          </nav>
        </aside>

        {/* Main */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Patient Dashboard</h1>
            <p className="text-sm text-slate-600">Welcome to your portal.</p>
          </div>
          {!submitted && !showModal && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">
              Complete your registration to continue. <button onClick={() => setShowModal(true)} className="underline underline-offset-2">Open form</button>
            </div>
          )}
          {/* Registration modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
              <div role="dialog" aria-modal="true" aria-labelledby="patient-reg-title" className="relative w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-5">
                <h2 id="patient-reg-title" className="text-base font-semibold text-slate-900 mb-3">Complete Your Registration</h2>
                <p className="text-sm text-slate-600 mb-4">Please fill the following details to continue.</p>
                <form onSubmit={handleRegister} className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label htmlFor="patient-name" className="text-sm font-medium text-slate-800">Patient Name</label>
                    <input id="patient-name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. John Doe" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <label htmlFor="patient-age" className="text-sm font-medium text-slate-800">Age</label>
                      <input id="patient-age" type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. 32" />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="patient-gender" className="text-sm font-medium text-slate-800">Gender</label>
                      <select id="patient-gender" value={gender} onChange={(e) => setGender(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                        <option value="" disabled>Select gender</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="patient-phone" className="text-sm font-medium text-slate-800">Phone Number</label>
                    <input id="patient-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. +1 555 000 1111" />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="patient-address" className="text-sm font-medium text-slate-800">Address</label>
                    <textarea id="patient-address" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Street, City, State" />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="patient-allergies" className="text-sm font-medium text-slate-800">Allergies (e.g., medicines, food)</label>
                    <textarea id="patient-allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="List allergies" />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="patient-meds" className="text-sm font-medium text-slate-800">Current Medications</label>
                    <textarea id="patient-meds" value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="List current medications" />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#005bb5]">Register</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-base font-semibold text-slate-900">Patient Profile</h2>
              <p className="text-sm text-slate-600 mt-1">View and manage your personal details.</p>
              <div className="mt-2 text-sm text-slate-700">
                <p><span className="text-slate-500">Name:</span> {name || '—'}</p>
                <p><span className="text-slate-500">Mobile:</span> {phone || '—'}</p>
              </div>
              <div className="mt-3">
                <button onClick={() => navigate('/patient/profile')} className="rounded-md bg-teal-600 text-white text-sm px-3 py-2 hover:bg-teal-700">Open Profile</button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-base font-semibold text-slate-900">Appointments</h2>
              {!loadingHighlights && nextAppointments.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {nextAppointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{a.doctor || 'Doctor'}</span>
                      <span className="text-slate-500 shrink-0">{a.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().toLocaleString() : `${a.appointmentDetails?.dateString} ${a.appointmentDetails?.time || ''}`}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600 mt-1">Book a new visit or view your bookings.</p>
              )}
              <div className="mt-3">
                <button onClick={() => navigate('/patient/appointments')} className="rounded-md bg-teal-600 text-white text-sm px-3 py-2 hover:bg-teal-700">Manage Appointments</button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-base font-semibold text-slate-900">Feedback</h2>
              {!loadingHighlights && lastFeedbacks.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {lastFeedbacks.map((f) => (
                    <li key={f.id} className="">
                      <p className="font-medium">{f.doctor || 'Doctor'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={(f.rating || 0) >= i ? '#fbbf24' : 'none'} stroke={(f.rating || 0) >= i ? '#fbbf24' : '#9ca3af'} className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.562 0 00-.586 0L6.482 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.562 0 00-.182-.557L2.54 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-slate-600 line-clamp-2 mt-1">{f.review || f.message || ''}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600 mt-1">Share your experience and view past feedback.</p>
              )}
              <div className="mt-3">
                <button onClick={() => navigate('/patient/feedback')} className="rounded-md bg-teal-600 text-white text-sm px-3 py-2 hover:bg-teal-700">Give Feedback</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


