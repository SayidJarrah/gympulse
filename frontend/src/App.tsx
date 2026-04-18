import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RegisterPage } from './pages/auth/RegisterPage'
import { LoginPage } from './pages/auth/LoginPage'
import { PlansPage } from './pages/plans/PlansPage'
import { PlanDetailPage } from './pages/plans/PlanDetailPage'
import { AdminPlansPage } from './pages/admin/AdminPlansPage'
import { AdminMembershipsPage } from './pages/admin/AdminMembershipsPage'
import { AdminTrainersPage } from './pages/admin/AdminTrainersPage'
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage'
import { AdminClassTemplatesPage } from './pages/admin/AdminClassTemplatesPage'
import { AdminSchedulerPage } from './pages/admin/AdminSchedulerPage'
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage'
import { MyMembershipPage } from './pages/membership/MyMembershipPage'
import { UserProfilePage } from './pages/profile/UserProfilePage'
import { MyBookingsPage } from './pages/profile/MyBookingsPage'
import { TrainerListPage } from './pages/trainers/TrainerListPage'
import { TrainerFavoritesPage } from './pages/trainers/TrainerFavoritesPage'
import { TrainerProfilePage } from './pages/trainers/TrainerProfilePage'
import { GroupClassesSchedulePage } from './pages/schedule/GroupClassesSchedulePage'
import { AdminRoute } from './components/layout/AdminRoute'
import { AuthRoute } from './components/layout/AuthRoute'
import { UserRoute } from './components/layout/UserRoute'
import { PulseLandingPage } from './pages/landing/PulseLandingPage'
import { MemberHomePage } from './pages/home/MemberHomePage'
import { PersonalTrainingPage } from './pages/training/PersonalTrainingPage'
import { TrainerSessionsPage } from './pages/trainer/TrainerSessionsPage'
import { AdminPtSessionsPage } from './pages/admin/AdminPtSessionsPage'
import { TrainerRoute } from './components/layout/TrainerRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Public plan routes */}
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/plans/:id" element={<PlanDetailPage />} />

        {/* Authenticated user routes */}
        <Route
          path="/home"
          element={
            <UserRoute>
              <MemberHomePage />
            </UserRoute>
          }
        />
        <Route
          path="/membership"
          element={
            <AuthRoute>
              <MyMembershipPage />
            </AuthRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthRoute>
              <UserProfilePage />
            </AuthRoute>
          }
        />
        <Route
          path="/profile/bookings"
          element={
            <UserRoute>
              <MyBookingsPage />
            </UserRoute>
          }
        />
        <Route
          path="/trainers"
          element={
            <AuthRoute>
              <TrainerListPage />
            </AuthRoute>
          }
        />
        <Route
          path="/trainers/favorites"
          element={
            <AuthRoute>
              <TrainerFavoritesPage />
            </AuthRoute>
          }
        />
        <Route
          path="/trainers/:id"
          element={
            <AuthRoute>
              <TrainerProfilePage />
            </AuthRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <UserRoute>
              <GroupClassesSchedulePage />
            </UserRoute>
          }
        />

        {/* Admin routes — guarded; non-admins are redirected to /plans */}
        <Route
          path="/admin/plans"
          element={
            <AdminRoute>
              <AdminPlansPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/memberships"
          element={
            <AdminRoute>
              <AdminMembershipsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/trainers"
          element={
            <AdminRoute>
              <AdminTrainersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/class-templates"
          element={
            <AdminRoute>
              <AdminClassTemplatesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/rooms"
          element={
            <AdminRoute>
              <AdminRoomsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/scheduler"
          element={
            <AdminRoute>
              <AdminSchedulerPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <AdminRoute>
              <AdminUserDetailPage />
            </AdminRoute>
          }
        />

        {/* Personal training routes */}
        <Route
          path="/training"
          element={
            <UserRoute>
              <PersonalTrainingPage />
            </UserRoute>
          }
        />
        <Route
          path="/trainer/sessions"
          element={
            <TrainerRoute>
              <TrainerSessionsPage />
            </TrainerRoute>
          }
        />
        <Route
          path="/admin/pt-sessions"
          element={
            <AdminRoute>
              <AdminPtSessionsPage />
            </AdminRoute>
          }
        />

        <Route path="/" element={<PulseLandingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
