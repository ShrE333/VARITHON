import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { readUser } from './auth';
import Login from './pages/Login';
import PilgrimPortal from './pages/PilgrimPortal';
import AdminHome from './pages/AdminHome';
import LostFound from './pages/LostFound';
import Crowd from './pages/Crowd';
import FeaturePage from './pages/FeaturePage';
import GroupLocation from './pages/GroupLocation';
import DarshanBooking from './pages/DarshanBooking';

function Guard({ role, children }) {
  const user = readUser();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />;
  return children;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/portal" element={<Guard role="user"><PilgrimPortal /></Guard>} />
    <Route path="/feature/group-location" element={<Guard role="user"><GroupLocation /></Guard>} />
    <Route path="/feature/eticketing" element={<Guard role="user"><DarshanBooking /></Guard>} />
    <Route path="/feature/:key" element={<Guard><FeaturePage /></Guard>} />
    <Route path="/admin" element={<Guard role="admin"><AdminHome /></Guard>} />
    <Route path="/admin/lost-found" element={<Guard role="admin"><LostFound /></Guard>} />
    <Route path="/admin/crowd" element={<Guard role="admin"><Crowd /></Guard>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
