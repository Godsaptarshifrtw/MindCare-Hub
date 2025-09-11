import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { Timestamp, addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  availableSlots?: string[];
};

type Appointment = {
  id: string;
  doctor?: string;
  date?: any;
  status?: string;
};

export default function PatientAppointments() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Load doctors from Firestore
  useEffect(() => {
    async function loadDoctors() {
      try {
        const snap = await getDocs(collection(db, 'doctors'));
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setDoctors(docs);
        } else {
          // Fallback doctors if no collection exists
          setDoctors([
            { id: '1', name: 'Dr. Smith', specialty: 'General Medicine' },
            { id: '2', name: 'Dr. Johnson', specialty: 'Cardiology' },
            { id: '3', name: 'Dr. Williams', specialty: 'Dermatology' },
            { id: '4', name: 'Dr. Brown', specialty: 'Pediatrics' },
            { id: '5', name: 'Dr. Davis', specialty: 'Orthopedics' },
          ]);
        }
      } catch {
        // Use fallback doctors
        setDoctors([
          { id: '1', name: 'Dr. Smith', specialty: 'General Medicine' },
          { id: '2', name: 'Dr. Johnson', specialty: 'Cardiology' },
          { id: '3', name: 'Dr. Williams', specialty: 'Dermatology' },
          { id: '4', name: 'Dr. Brown', specialty: 'Pediatrics' },
          { id: '5', name: 'Dr. Davis', specialty: 'Orthopedics' },
        ]);
      }
    }
    void loadDoctors();
  }, []);

  // Recompute available doctors when date/time changes
  useEffect(() => {
    async function computeAvailability() {
      if (!selectedDate || !selectedTime) {
        setAvailableDoctors(doctors);
        return;
      }
      setCheckingAvailability(true);
      try {
        const slotQ = query(
          collection(db, 'appointments'),
          where('appointmentDetails.dateString', '==', selectedDate),
          where('appointmentDetails.time', '==', selectedTime)
        );
        const snap = await getDocs(slotQ);
        const bookedDoctorIds = new Set<string>(
          snap.docs
            .map((d) => (d.data() as any))
            .filter((r) => (r?.status || 'scheduled') !== 'cancelled')
            .map((r) => r.doctorId)
            .filter(Boolean)
        );
        const avail = doctors.filter((d) => !bookedDoctorIds.has(d.id));
        setAvailableDoctors(avail);
        if (selectedDoctor && bookedDoctorIds.has(selectedDoctor)) {
          setSelectedDoctor('');
        }
      } catch {
        setAvailableDoctors(doctors);
      } finally {
        setCheckingAvailability(false);
      }
    }
    void computeAvailability();
  }, [db, doctors, selectedDate, selectedTime]);

  // Load patient's existing appointments (with fallback when ordered query index missing)
  useEffect(() => {
    async function loadAppointments() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        try {
          const qRef = query(
            collection(db, 'appointments'),
            where('patientUid', '==', user.uid),
            orderBy('appointmentDetails.date', 'desc')
          );
          const snap = await getDocs(qRef);
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setAppointments(rows as any);
        } catch {
          const qRef = query(
            collection(db, 'appointments'),
            where('patientUid', '==', user.uid)
          );
          const snap = await getDocs(qRef);
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          rows.sort((a: any, b: any) => {
            const aT = a?.appointmentDetails?.date?.toDate ? a.appointmentDetails.date.toDate().getTime() : 0;
            const bT = b?.appointmentDetails?.date?.toDate ? b.appointmentDetails.date.toDate().getTime() : 0;
            return bT - aT;
          });
          setAppointments(rows as any);
        }
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }
    void loadAppointments();
  }, [user?.uid]);

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedDoctor || !user?.uid) return;
    
    setBooking(true);
    try {
      // Convert selectedDate (yyyy-mm-dd) and selectedTime (e.g., 10:00 AM) to a Date
      const parsedTime = (() => {
        const [time, meridiem] = selectedTime.split(' ');
        const [hh, mm] = time.split(':').map(Number);
        let hours = hh % 12;
        if (meridiem?.toUpperCase() === 'PM') hours += 12;
        return { hours, minutes: mm || 0 };
      })();
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
      const selectedDoc = doctors.find(d => d.id === selectedDoctor);
      
      await addDoc(collection(db, 'appointments'), {
        patientUid: user.uid,
        doctor: selectedDoc?.name || 'Unknown Doctor',
        doctorId: selectedDoctor,
        appointmentDetails: {
          date: Timestamp.fromDate(appointmentDateTime),
          time: selectedTime,
          dateString: selectedDate,
        },
        status: 'scheduled',
        createdAt: serverTimestamp(),
      });
      
      setBooked(true);
      setSelectedDate('');
      setSelectedTime('');
      setSelectedDoctor('');
      
      // Reload appointments
      const qRef = query(
        collection(db, 'appointments'),
        where('patientUid', '==', user.uid),
        orderBy('appointmentDetails.date', 'desc')
      );
      const snap = await getDocs(qRef);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAppointments(rows as any);
    } catch (error) {
      console.error('Error booking appointment:', error);
    } finally {
      setBooking(false);
    }
  }


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Book Appointment</h1>
          <p className="text-sm text-slate-600">Choose date, time, and doctor for your appointment.</p>
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {booked && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Appointment booked successfully!
            </div>
          )}
          
          <form onSubmit={handleBookAppointment} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
                <select
                  id="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  required
                >
                  <option value="">Choose time</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="doctor" className="block text-sm font-medium text-slate-700 mb-2">Select Doctor</label>
                <select
                  id="doctor"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  required
                  disabled={!selectedDate || !selectedTime || checkingAvailability}
                >
                  <option value="">Choose doctor</option>
                  {availableDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.specialty && `- ${doctor.specialty}`}
                    </option>
                  ))}
                </select>
                {!selectedDate || !selectedTime ? (
                  <p className="mt-1 text-xs text-slate-500">Pick date and time first to view available doctors.</p>
                ) : checkingAvailability ? (
                  <p className="mt-1 text-xs text-slate-500">Checking availability…</p>
                ) : availableDoctors.length === 0 ? (
                  <p className="mt-1 text-xs text-red-600">No doctors available at this time. Try another slot.</p>
                ) : null}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={booking || !selectedDate || !selectedTime || !selectedDoctor}
                className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {booking ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Appointments</h2>
          {loading ? (
            <div className="text-sm text-slate-600">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="text-sm text-slate-600">No appointments scheduled.</div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment: any) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{appointment.doctor}</p>
                    <p className="text-xs text-slate-600">
                      {appointment.appointmentDetails?.dateString} at {appointment.appointmentDetails?.time}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {appointment.status || 'Scheduled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


