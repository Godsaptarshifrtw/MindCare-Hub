import { db } from '../firebase';
import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';

export async function countPatients(): Promise<number> {
  const snap = await getCountFromServer(collection(db, 'patients'));
  return snap.data().count;
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


