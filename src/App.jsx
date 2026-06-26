import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { BrandProvider } from './context/BrandContext'
import { NotificationProvider } from './context/NotificationContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { BrandRoute, ManagerRoute } from './components/layout/BrandRoute'

// Public pages
import WelcomePage from './pages/public/WelcomePage'
import LoginPage from './pages/public/LoginPage'
import SignupPage from './pages/public/SignupPage'
import ForgotPasswordPage from './pages/public/ForgotPasswordPage'
import ResetPasswordPage from './pages/public/ResetPasswordPage'
import ChangePasswordPage from './pages/public/ChangePasswordPage'
import VerifyEmailPage from './pages/public/VerifyEmailPage'
// App pages
import BrandSelectorPage from './pages/app/BrandSelectorPage'
import CreateBrandPage from './pages/app/CreateBrandPage'

// Brand pages
import DashboardPage from './pages/dashboard/DashboardPage'
import CalendarPage from './pages/calendar/CalendarPage'
import SchedulePage from './pages/schedule/SchedulePage'
import ChatListPage from './pages/chat/ChatListPage'
import ChatRoomPage from './pages/chat/ChatRoomPage'
import LeavesPage from './pages/leaves/LeavesPage'
import SwapsPage from './pages/swaps/SwapsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ProfilePage from './pages/profile/ProfilePage'
import AnnouncementsPage from './pages/announcements/AnnouncementsPage'
import AvailabilityPage from './pages/profile/AvailabilityPage'

// Manager pages
import ManageStaffsPage from './pages/manager/ManageStaffsPage'
import ManageShiftsPage from './pages/manager/ManageShiftsPage'
import ManageSpecialDaysPage from './pages/manager/ManageSpecialDaysPage'
import BrandSettingsPage from './pages/manager/BrandSettingsPage'
import AddStaffPage from './pages/manager/AddStaffPage'
import ManageSchedulePage from './pages/manager/ManageSchedulePage'
import ManageDefaultsPage from './pages/manager/ManageDefaultsPage'
import ManageTemplatesPage from './pages/manager/ManageTemplatesPage'
import AnalyticsPage from './pages/manager/AnalyticsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandProvider>
          <NotificationProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', borderRadius: '12px', padding: '12px 16px' },
                success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
              }}
            />
            <Routes>
              {/* Public */}
              <Route path="/" element={<WelcomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
              <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />

              {/* App */}
              <Route path="/brands" element={<ProtectedRoute><BrandSelectorPage /></ProtectedRoute>} />
              <Route path="/brands/create" element={<ProtectedRoute><CreateBrandPage /></ProtectedRoute>} />

              {/* Brand routes */}
              <Route path="/:brandId" element={<ProtectedRoute><BrandRoute><DashboardPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/calendar" element={<ProtectedRoute><BrandRoute><CalendarPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/schedule" element={<ProtectedRoute><BrandRoute><SchedulePage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/chat" element={<ProtectedRoute><BrandRoute><ChatListPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/chat/:conversationId" element={<ProtectedRoute><BrandRoute><ChatRoomPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/leaves" element={<ProtectedRoute><BrandRoute><LeavesPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/swaps" element={<ProtectedRoute><BrandRoute><SwapsPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/notifications" element={<ProtectedRoute><BrandRoute><NotificationsPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/profile" element={<ProtectedRoute><BrandRoute><ProfilePage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/availability" element={<ProtectedRoute><BrandRoute><AvailabilityPage /></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/announcements" element={<ProtectedRoute><BrandRoute><AnnouncementsPage /></BrandRoute></ProtectedRoute>} />

              {/* Manager routes */}
              <Route path="/:brandId/manage/staffs" element={<ProtectedRoute><BrandRoute><ManagerRoute><ManageStaffsPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/shifts" element={<ProtectedRoute><BrandRoute><ManagerRoute><ManageShiftsPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/special-days" element={<ProtectedRoute><BrandRoute><ManagerRoute><ManageSpecialDaysPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/add-staff" element={<ProtectedRoute><BrandRoute><ManagerRoute><AddStaffPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/settings" element={<ProtectedRoute><BrandRoute><ManagerRoute><BrandSettingsPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/schedule" element={<ProtectedRoute><BrandRoute><ManagerRoute><ManageSchedulePage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/templates" element={<ProtectedRoute><BrandRoute><ManagerRoute><ManageTemplatesPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/defaults" element={<ProtectedRoute><BrandRoute><ManagerRoute><ManageDefaultsPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />
              <Route path="/:brandId/manage/analytics" element={<ProtectedRoute><BrandRoute><ManagerRoute><AnalyticsPage /></ManagerRoute></BrandRoute></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </BrandProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
