import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { FacultyLayout } from './layouts/FacultyLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { LoginPage } from './auth/LoginPage';

export const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminLayout />;
    case 'faculty':
      return <FacultyLayout />;
    case 'student':
      return <StudentLayout />;
    default:
      return <LoginPage />;
  }
};