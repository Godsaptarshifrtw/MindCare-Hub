import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection, getDocs, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function PatientFeedback() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState('');
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyErrorDetail, setHistoryErrorDetail] = useState<string | null>(null);

  // Fallback list of doctors if there's no doctors collection yet
  const fallbackDoctors = useMemo(
    () => [
      'Dr. Smith',
      'Dr. Johnson',
      'Dr. Williams',
      'Dr. Brown',
      'Dr. Davis',
    ],
    []
  );
  const [doctors, setDoctors] = useState<string[]>(fallbackDoctors);

  useEffect(() => {
    // Try to populate doctors from a `doctors` collection if it exists
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'doctors'));
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => d.data() as any)
            .map((d) => d.name)
            .filter(Boolean);
          if (list.length) setDoctors(list);
        }
      } catch {
        // ignore if collection doesn't exist or permission denied; use fallback
      }
    })();
  }, [db, fallbackDoctors]);

  // Subscribe to past feedback in realtime
  useEffect(() => {
    if (!user?.uid) {
      setHistory([]);
      setHistoryError(null);
      return;
    }
    const qRef = query(
      collection(db, 'patientFeedback'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setHistory(items);
        setHistoryError(null);
        setHistoryErrorDetail(null);
      },
      async (err) => {
        // Keep whatever we already have; try a non-ordered fallback and surface the error
        setHistoryError('Unable to load past feedback.');
        setHistoryErrorDetail(err?.message || String(err));
        try {
          const fallbackSnap = await getDocs(query(collection(db, 'patientFeedback'), where('uid', '==', user.uid)));
          const items = fallbackSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          // Sort client-side by createdAt desc (if available)
          items.sort((a: any, b: any) => {
            const aTime = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const bTime = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return bTime - aTime;
          });
          setHistory(items);
        } catch {
          // Ignore; keep existing history
        }
      }
    );
    return () => unsub();
  }, [db, user?.uid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!doctor.trim() || !review.trim() || rating < 1) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'patientFeedback'), {
        uid: user?.uid || null,
        doctor: doctor.trim(),
        review: review.trim(),
        rating,
        createdAt: serverTimestamp(),
        status: 'new',
      });
      setSent(true);
      setDoctor('');
      setReview('');
      setRating(0);
    } finally {
      setSending(false);
    }
  }

  function formatDate(value: any) {
    try {
      const date = value?.toDate ? value.toDate() : (typeof value?.seconds === 'number' ? new Date(value.seconds * 1000) : null);
      return date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : '';
    } catch {
      return '';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Feedback</h1>
          <p className="text-sm text-slate-600">Choose doctor, write review, and rate your experience.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          {sent && (
            <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Thanks! Your review was submitted.</p>
          )}
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="doctor" className="text-sm font-medium text-slate-800">Choose Doctor</label>
              <select
                id="doctor"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-slate-800">Rating</label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star>1 ? 's' : ''}`}
                    className="p-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={rating >= star ? '#fbbf24' : 'none'}
                      stroke={rating >= star ? '#fbbf24' : '#9ca3af'}
                      className="h-7 w-7"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.482 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.563 0 00-.182-.557L2.54 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="review" className="text-sm font-medium text-slate-800">Write Review</label>
              <textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="min-h-32 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Share details about your experience"
                required
              />
            </div>

            <div>
              <button type="submit" disabled={sending} className="rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#005bb5] disabled:opacity-60">
                {sending ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Your Past Feedback</h2>
          {/* Intentionally hiding internal Firestore error details from UI */}
          {history.length === 0 ? (
            <p className="text-sm text-slate-600">No past feedback yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {history.map((item) => (
                <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.doctor || item.subject || 'Doctor'}</p>
                      {item.status && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{item.status}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(item.createdAt)}</p>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.review || item.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1,2,3,4,5].map((i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={(item.rating || 0) >= i ? '#fbbf24' : 'none'} stroke={(item.rating || 0) >= i ? '#fbbf24' : '#9ca3af'} className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.482 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.563 0 00-.182-.557L2.54 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z" />
                      </svg>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


