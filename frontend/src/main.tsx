import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '@/shared/layouts/AppLayout';
import { AuthProvider } from '@/shared/hooks/useAuth';
import LoginPage from '@/modules/auth/pages/LoginPage';
import UserListPage from '@/modules/users/pages/UserListPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import TicketListPage from '@/modules/tickets/pages/TicketListPage';
import EnrollmentListPage from '@/modules/enrollments/pages/EnrollmentListPage';
import PublicEnrollmentForm from '@/modules/enrollments/pages/PublicEnrollmentForm';
import LeadBoardPage from '@/modules/crm/pages/LeadBoardPage';
import CalendarPage from '@/modules/calendar/pages/CalendarPage';
import CourseListPage from '@/modules/courses/pages/CourseListPage';
import ProfilePage from '@/modules/users/pages/ProfilePage';
import SalesDashboardPage from '@/modules/crm/pages/SalesDashboardPage';

// Email Module
import EmailDashboardPage from '@/modules/email/pages/EmailDashboardPage';
import EmailTemplatePage from '@/modules/email/pages/EmailTemplatePage';
import EmailCampaignPage from '@/modules/email/pages/EmailCampaignPage';
import EmailSettingsPage from '@/modules/email/pages/EmailSettingsPage';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/enrollment/:uuid" element={<PublicEnrollmentForm />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UserListPage />} />
            <Route path="tickets" element={<TicketListPage />} />
            <Route path="enrollments" element={<EnrollmentListPage />} />
            <Route path="leads" element={<LeadBoardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="courses" element={<CourseListPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="sales-analysis" element={<SalesDashboardPage />} />

            {/* Email Marketing */}
            <Route path="email" element={<EmailDashboardPage />} />
            <Route path="email/templates/:id" element={<EmailTemplatePage />} />
            <Route path="email/campaigns/:id" element={<EmailCampaignPage />} />
            <Route path="email/settings" element={<EmailSettingsPage />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
