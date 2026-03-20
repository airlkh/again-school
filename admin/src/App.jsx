import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

import Login from './pages/Login';
import AdminLayout from './components/layout/AdminLayout';

// Dashboard
import DashboardHome from './pages/dashboard/DashboardHome';
import RealtimeStatus from './pages/dashboard/RealtimeStatus';
import AlertCenter from './pages/dashboard/AlertCenter';

// Members
import MemberList from './pages/members/MemberList';
import MemberDetail from './pages/members/MemberDetail';
import MemberSanction from './pages/members/MemberSanction';
import DormantMembers from './pages/members/DormantMembers';
import AdminMemo from './pages/members/AdminMemo';

// School
import PendingVerification from './pages/school/PendingVerification';
import VerificationReview from './pages/school/VerificationReview';
import VerifiedMembers from './pages/school/VerifiedMembers';
import SchoolData from './pages/school/SchoolData';
import VerificationStats from './pages/school/VerificationStats';

// Community
import PostManagement from './pages/community/PostManagement';
import CommentManagement from './pages/community/CommentManagement';
import PopularPosts from './pages/community/PopularPosts';
import NoticePosts from './pages/community/NoticePosts';
import CommunitySettingsPage from './pages/community/CommunitySettings';

// Chat
import ChatRooms from './pages/chat/ChatRooms';
import ChatReports from './pages/chat/ChatReports';
import ChatLogs from './pages/chat/ChatLogs';
import ChatSanctions from './pages/chat/ChatSanctions';
import SpamDetection from './pages/chat/SpamDetection';

// Reports
import AllReports from './pages/reports/AllReports';
import ReportDetail from './pages/reports/ReportDetail';
import ReportStatus from './pages/reports/ReportStatus';
import RepeatReports from './pages/reports/RepeatReports';
import SanctionLink from './pages/reports/SanctionLink';

// Content
import Notices from './pages/content/Notices';
import Events from './pages/content/Events';
import Banners from './pages/content/Banners';
import FAQ from './pages/content/FAQ';
import Policies from './pages/content/Policies';
import MusicManager from './pages/content/MusicManager';

// Content - Additional
import Stories from './pages/content/Stories';
import Meetups from './pages/content/Meetups';
import Jobs from './pages/content/Jobs';

// Settlement
import RevenueDashboard from './pages/settlement/RevenueDashboard';
import SettlementTargets from './pages/settlement/SettlementTargets';
import SettlementProcess from './pages/settlement/SettlementProcess';
import SettlementHistory from './pages/settlement/SettlementHistory';
import AnomalyDetection from './pages/settlement/AnomalyDetection';

// Stats
import MemberStats from './pages/stats/MemberStats';
import ActivityStats from './pages/stats/ActivityStats';
import ReportStats from './pages/stats/ReportStats';
import RevenueStats from './pages/stats/RevenueStats';
import RetentionAnalysis from './pages/stats/RetentionAnalysis';

// Admins
import AdminAccounts from './pages/admins/AdminAccounts';
import PermissionGroups from './pages/admins/PermissionGroups';
import MenuPermissions from './pages/admins/MenuPermissions';
import ActivityLogs from './pages/admins/ActivityLogs';

// Settings
import BasicSettings from './pages/settings/BasicSettings';
import SignupSettings from './pages/settings/SignupSettings';
import CommunitySysSettings from './pages/settings/CommunitySettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import SecuritySettings from './pages/settings/SecuritySettings';

// System
import ErrorLogs from './pages/system/ErrorLogs';

// Public (no auth required)
import PrivacyPage from './pages/public/PrivacyPage';
import TermsPage from './pages/public/TermsPage';
import CommunityPage from './pages/public/CommunityPage';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          const data = snap.data();
          if (data?.role === 'admin') {
            setUser(u);
            setIsAdmin(true);
          } else {
            setUser(u);
            setIsAdmin(false);
          }
        } catch {
          setUser(u);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #eee', borderTopColor: '#FF3124', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#888', fontSize: 14 }}>로딩 중...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages (no auth required) */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/community-guidelines" element={<CommunityPage />} />

        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <AdminLayout user={user} /> : <Navigate to="/login" />}>
          <Route index element={<DashboardHome />} />
          <Route path="dashboard/realtime" element={<RealtimeStatus />} />
          <Route path="dashboard/alerts" element={<AlertCenter />} />

          <Route path="members" element={<MemberList />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="members/sanctions" element={<MemberSanction />} />
          <Route path="members/dormant" element={<DormantMembers />} />
          <Route path="members/memos" element={<AdminMemo />} />

          <Route path="school/pending" element={<PendingVerification />} />
          <Route path="school/review" element={<VerificationReview />} />
          <Route path="school/verified" element={<VerifiedMembers />} />
          <Route path="school/data" element={<SchoolData />} />
          <Route path="school/stats" element={<VerificationStats />} />

          <Route path="community/posts" element={<PostManagement />} />
          <Route path="community/comments" element={<CommentManagement />} />
          <Route path="community/popular" element={<PopularPosts />} />
          <Route path="community/notices" element={<NoticePosts />} />
          <Route path="community/settings" element={<CommunitySettingsPage />} />

          <Route path="chat/rooms" element={<ChatRooms />} />
          <Route path="chat/reports" element={<ChatReports />} />
          <Route path="chat/logs" element={<ChatLogs />} />
          <Route path="chat/sanctions" element={<ChatSanctions />} />
          <Route path="chat/spam" element={<SpamDetection />} />

          <Route path="reports" element={<AllReports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="reports/status" element={<ReportStatus />} />
          <Route path="reports/repeat" element={<RepeatReports />} />
          <Route path="reports/sanctions" element={<SanctionLink />} />

          <Route path="content/notices" element={<Notices />} />
          <Route path="content/events" element={<Events />} />
          <Route path="content/banners" element={<Banners />} />
          <Route path="content/faq" element={<FAQ />} />
          <Route path="content/policies" element={<Policies />} />
          <Route path="content/stories" element={<Stories />} />
          <Route path="content/meetups" element={<Meetups />} />
          <Route path="content/jobs" element={<Jobs />} />
          <Route path="content/music" element={<MusicManager />} />

          <Route path="settlement/revenue" element={<RevenueDashboard />} />
          <Route path="settlement/targets" element={<SettlementTargets />} />
          <Route path="settlement/process" element={<SettlementProcess />} />
          <Route path="settlement/history" element={<SettlementHistory />} />
          <Route path="settlement/anomaly" element={<AnomalyDetection />} />

          <Route path="stats/members" element={<MemberStats />} />
          <Route path="stats/activity" element={<ActivityStats />} />
          <Route path="stats/reports" element={<ReportStats />} />
          <Route path="stats/revenue" element={<RevenueStats />} />
          <Route path="stats/retention" element={<RetentionAnalysis />} />

          <Route path="admins" element={<AdminAccounts />} />
          <Route path="admins/permissions" element={<PermissionGroups />} />
          <Route path="admins/menu-permissions" element={<MenuPermissions />} />
          <Route path="admins/logs" element={<ActivityLogs />} />

          <Route path="settings/basic" element={<BasicSettings />} />
          <Route path="settings/signup" element={<SignupSettings />} />
          <Route path="settings/community" element={<CommunitySysSettings />} />
          <Route path="settings/notifications" element={<NotificationSettings />} />
          <Route path="settings/security" element={<SecuritySettings />} />

          <Route path="system/error-logs" element={<ErrorLogs />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
