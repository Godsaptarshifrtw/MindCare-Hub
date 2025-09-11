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
import PatientDashboard from './pages/PatientDashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientProfile from './pages/PatientProfile';
import PatientFeedback from './pages/PatientFeedback';
import PatientAppointments from './pages/PatientAppointments';
import AdminPatientProfile from './pages/AdminPatientProfile';
import AdminPatientAppointments from './pages/AdminPatientAppointments';

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
