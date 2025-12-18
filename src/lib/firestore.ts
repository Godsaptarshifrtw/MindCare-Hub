import { db } from '../firebase';
import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';

export async function countPatients(): Promise<number> {
  const patientsSnap = await getCountFromServer(collection(db, 'patients'));
  const profilesSnap = await getCountFromServer(collection(db, 'patientProfiles'));
  return (patientsSnap.data().count || 0) + (profilesSnap.data().count || 0);
}

export async function countAppointmentsOnDate(date: Date): Promise<number> {
  const start = Timestamp.fromDate(new Date(date.setHours(0,0,0,0)));
  const end = Timestamp.fromDate(new Date(date.setHours(23,59,59,999)));
  const q = query(collection(db, 'appointments'), where('appointmentDetails.date', '>=', start), where('appointmentDetails.date', '<=', end));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function countTreatmentsByStatus(status: 'ongoing' | 'completed' | 'discontinued'): Promise<number> {
  const q = query(collection(db, 'treatments'), where('status', '==', status));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function countPendingFeedback(): Promise<number> {
  const q = query(collection(db, 'feedback'), where('status', '==', 'pending'));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function countDoctors(): Promise<number> {
  const doctorsSnap = await getCountFromServer(collection(db, 'doctorProfiles'));
  return doctorsSnap.data().count || 0;
}


