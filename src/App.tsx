import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Treatments from './pages/Treatments';
import Feedback from './pages/Feedback';
import Reports from './pages/Reports';
import Layout from './components/Layout';
import DoctorLayout from './components/DoctorLayout';
import PatientDashboard from './pages/PatientDashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientProfile from './pages/PatientProfile';
import PatientFeedback from './pages/PatientFeedback';
import PatientAppointments from './pages/PatientAppointments';
import PatientTreatments from './pages/PatientTreatments';
import AdminPatientProfile from './pages/AdminPatientProfile';
import AdminPatientAppointments from './pages/AdminPatientAppointments';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorRegistration from './pages/DoctorRegistration';
import DoctorAppointments from './pages/DoctorAppointments';
import DoctorTreatments from './pages/DoctorTreatments';
import GeneralManagerLayout from './components/GeneralManagerLayout';
import GeneralManagerDashboard from './pages/GeneralManagerDashboard';
import GeneralManagerRegistration from './pages/GeneralManagerRegistration';
import GeneralManagerFeedback from './pages/GeneralManagerFeedback';
import GeneralManagerAppointments from './pages/GeneralManagerAppointments';
import GeneralManagerPatients from './pages/GeneralManagerPatients';

// removed unused Placeholder

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/patient/register" element={<PatientRegistration />} />
        <Route path="/patient/profile" element={<PatientProfile />} />
        <Route path="/patient/feedback" element={<PatientFeedback />} />
        <Route path="/patient/appointments" element={<PatientAppointments />} />
        <Route path="/patient/treatments" element={<PatientTreatments />} />
        <Route path="/doctor/register" element={<DoctorRegistration />} />
        <Route path="/generalmanager/register" element={<GeneralManagerRegistration />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/treatments" element={<Treatments />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/patients/:id/profile" element={<AdminPatientProfile />} />
            <Route path="/patients/:id/appointments" element={<AdminPatientAppointments />} />
          </Route>
          <Route element={<DoctorLayout />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/doctor/treatments" element={<DoctorTreatments />} />
          </Route>
          <Route element={<GeneralManagerLayout />}>
            <Route path="/generalmanager" element={<GeneralManagerDashboard />} />
            <Route path="/generalmanager/patients" element={<GeneralManagerPatients />} />
            <Route path="/generalmanager/patients/:id/profile" element={<AdminPatientProfile />} />
            <Route path="/generalmanager/patients/:id/appointments" element={<AdminPatientAppointments />} />
            <Route path="/generalmanager/appointments" element={<GeneralManagerAppointments />} />
            <Route path="/generalmanager/feedback" element={<GeneralManagerFeedback />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
