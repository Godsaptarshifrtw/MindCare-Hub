import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

type Questionnaire = {
  patientName: string;
  patientId: string;
  problem: string;
  duration: string;
  pastHistory: string;
  medications: string;
};

export default function Treatments() {
  const { user } = useAuth();
  const [data, setData] = useState<Questionnaire>({
    patientName: '',
    patientId: '',
    problem: '',
    duration: '',
    pastHistory: '',
    medications: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [patientSearchName, setPatientSearchName] = useState('');
  const [patientSearchId, setPatientSearchId] = useState('');
  const [patientDetails, setPatientDetails] = useState<any | null>(null);
  const [pastTreatments, setPastTreatments] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  function onChange<K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.patientName || !data.problem || !data.duration) return;
    setSubmitted(true);
  }

  function downloadReport() {
    if (!reportRef.current) return;
    const win = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
    if (!win) return;
    win.document.write('<html><head><title>Treatment Report</title>');
    win.document.write('<style>body{font-family:ui-sans-serif,system-ui; padding:24px; background:#fff;} h1{font-size:18px;margin:0 0 12px} h2{font-size:16px;margin:16px 0 8px} p,li{font-size:12px;line-height:1.6} .section{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px} .row{display:flex;gap:12px} .row>div{flex:1}</style>');
    win.document.write('</head><body>');
    win.document.write(reportRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Treatments</h1>
          <p className="text-sm text-slate-600 mt-1">Create a case report or import a patient to prefill and view history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">Import Patient Details</h2>
              {patientDetails && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full">Imported</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <label htmlFor="searchName" className="text-sm font-medium text-slate-800">Patient Name</label>
                <input id="searchName" value={patientSearchName} onChange={(e) => setPatientSearchName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. John Doe" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="searchId" className="text-sm font-medium text-slate-800">Patient ID</label>
                <input id="searchId" value={patientSearchId} onChange={(e) => setPatientSearchId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="#1234" />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isImporting || (!patientSearchId && !patientSearchName)}
                  onClick={async () => {
                    setIsImporting(true);
                    try {
                      let qRef;
                      if (patientSearchId.trim()) {
                        qRef = query(collection(db, 'patients'), where('patientId', '==', patientSearchId.trim()));
                      } else {
                        qRef = query(collection(db, 'patients'), where('name', '==', patientSearchName.trim()));
                      }
                      const snap = await getDocs(qRef);
                      const doc = snap.docs[0];
                      if (doc) {
                        const info = { id: doc.id, ...doc.data() } as any;
                        setPatientDetails(info);
                        setData((d) => ({
                          ...d,
                          patientName: info.name || d.patientName,
                          patientId: info.patientId || d.patientId,
                        }));
                        const id = info.patientId || patientSearchId.trim();
                        if (id) {
                          const tQ = query(
                            collection(db, 'treatments'),
                            where('patientId', '==', id),
                            orderBy('date', 'desc')
                          );
                          const tSnap = await getDocs(tQ);
                          const items = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
                          setPastTreatments(items);
                        } else {
                          setPastTreatments([]);
                        }
                      } else {
                        setPatientDetails(null);
                        setPastTreatments([]);
                        alert('No matching patient found');
                      }
                    } catch (e) {
                      alert('Failed to import details');
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                  className="w-full rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2.5 disabled:opacity-60 hover:bg-[#005bb5]"
                >
                  {isImporting ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </div>

          {patientDetails && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 -mt-3">
              <p className="text-sm text-slate-700"><strong>Imported:</strong> {patientDetails.name || '—'} <span className="text-slate-400">•</span> ID: {patientDetails.patientId || '—'}</p>
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="patientName" className="text-sm font-medium text-slate-800">Patient Name</label>
                  <input id="patientName" value={data.patientName} onChange={(e) => onChange('patientName', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. John Doe" required />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="patientId" className="text-sm font-medium text-slate-800">Patient ID</label>
                  <input id="patientId" value={data.patientId} onChange={(e) => onChange('patientId', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="#1234" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="problem" className="text-sm font-medium text-slate-800">Patient Problem</label>
                <textarea id="problem" value={data.problem} onChange={(e) => onChange('problem', e.target.value)} className="min-h-24 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Describe the problem" required />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="duration" className="text-sm font-medium text-slate-800">Problem Duration</label>
                <input id="duration" value={data.duration} onChange={(e) => onChange('duration', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="e.g. 2 weeks" required />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="pastHistory" className="text-sm font-medium text-slate-800">Past History</label>
                <textarea id="pastHistory" value={data.pastHistory} onChange={(e) => onChange('pastHistory', e.target.value)} className="min-h-24 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Any relevant past medical history" />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="medications" className="text-sm font-medium text-slate-800">Ongoing Medication</label>
                <textarea id="medications" value={data.medications} onChange={(e) => onChange('medications', e.target.value)} className="min-h-24 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Current medications (if any)" />
              </div>

              <div className="pt-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#0066CC] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#005bb5]">
                  <span>Generate Report</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Treatment Report</h2>
                <button onClick={downloadReport} className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800">Download PDF</button>
              </div>
              <div ref={reportRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="section">
                  <h1>Patient Information</h1>
                  <div className="row">
                    <div>
                      <p><strong>Name:</strong> {data.patientName}</p>
                    </div>
                    <div>
                      <p><strong>Patient ID:</strong> {data.patientId || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <h2>Doctor Details</h2>
                  <div className="row">
                    <div>
                      <p><strong>Doctor:</strong> {user?.displayName || user?.email || 'Doctor'}</p>
                    </div>
                    <div>
                      <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <h2>Case Summary</h2>
                  <p><strong>Problem:</strong> {data.problem}</p>
                  <p><strong>Duration:</strong> {data.duration}</p>
                  <p><strong>Past History:</strong> {data.pastHistory || '—'}</p>
                  <p><strong>Ongoing Medication:</strong> {data.medications || '—'}</p>
                </div>

                <div className="section">
                  <h2>Prescribed Treatment</h2>
                  <p>• Rest, hydration, and follow-up as needed.</p>
                  <p>• Prescription: —</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setSubmitted(false)} className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800">Back to Form</button>
                <button onClick={downloadReport} className="rounded-lg border border-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50">Download</button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:sticky lg:top-4">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Past Treatments</h2>
            {pastTreatments.length === 0 ? (
              <p className="text-sm text-slate-600">No past treatments found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pastTreatments.map((t) => (
                  <li key={t.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.title || 'Treatment'}</p>
                        <p className="text-xs text-slate-600">{t.summary || t.problem || '—'}</p>
                      </div>
                      <div className="text-xs text-slate-500 ml-2 whitespace-nowrap">{t.date?.toDate ? t.date.toDate().toLocaleDateString() : (t.date || '')}</div>
                    </div>
                    {t.prescription && (
                      <p className="text-xs text-slate-600 mt-1">Prescription: {t.prescription}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


