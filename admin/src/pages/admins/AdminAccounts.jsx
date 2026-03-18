import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const ROLE_OPTIONS = [
  { value: 'admin', label: '일반 관리자' },
  { value: 'superadmin', label: '슈퍼 관리자' },
  { value: 'operator', label: '운영자' },
  { value: 'cs', label: 'CS 담당자' },
  { value: 'content', label: '콘텐츠 관리자' },
];

const STATUS_COLORS = {
  active: { bg: '#e6f9ed', color: '#1a8a4a', label: '활성' },
  inactive: { bg: '#fde8e8', color: '#c53030', label: '비활성' },
};

export default function AdminAccounts() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'admin' });
  const [saving, setSaving] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      // admins 컬렉션에서 로드
      const adminsSnap = await getDocs(collection(db, 'admins'));
      const adminList = adminsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // users 컬렉션에서 role='admin'인 사용자도 로드
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const usersSnap = await getDocs(usersQuery);
      const userAdmins = usersSnap.docs
        .filter((d) => !adminList.find((a) => a.id === d.id))
        .map((d) => ({ id: d.id, ...d.data() }));

      setAdmins([...adminList, ...userAdmins]);
    } catch (err) {
      console.error('관리자 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email) {
      alert('이름과 이메일을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const adminRef = doc(collection(db, 'admins'));
      await setDoc(adminRef, {
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        status: 'active',
        createdAt: serverTimestamp(),
        lastLogin: null,
      });
      setShowModal(false);
      setNewAdmin({ name: '', email: '', role: 'admin' });
      await fetchAdmins();
    } catch (err) {
      console.error('관리자 추가 실패:', err);
      alert('관리자 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (admin) => {
    if (!window.confirm(`${admin.name || admin.email} 관리자를 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', admin.id));
      // users 컬렉션에 있는 경우 role 제거
      try {
        await updateDoc(doc(db, 'users', admin.id), { role: 'user' });
      } catch (_) {
        // users 컬렉션에 없을 수 있음
      }
      await fetchAdmins();
    } catch (err) {
      console.error('관리자 삭제 실패:', err);
      alert('관리자 삭제에 실패했습니다.');
    }
  };

  const toggleStatus = async (admin) => {
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'admins', admin.id), { status: newStatus });
      await fetchAdmins();
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('ko-KR');
  };

  const getRoleLabel = (role) => {
    const found = ROLE_OPTIONS.find((r) => r.value === role);
    return found ? found.label : role || '-';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>관리자 계정 관리</h1>
          <p style={styles.subtitle}>관리자 계정을 추가, 수정, 삭제할 수 있습니다.</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          + 관리자 추가
        </button>
      </div>

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loading}>로딩 중...</div>
        ) : admins.length === 0 ? (
          <div style={styles.empty}>등록된 관리자가 없습니다.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>이름</th>
                <th style={styles.th}>이메일</th>
                <th style={styles.th}>역할</th>
                <th style={styles.th}>마지막 로그인</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const status = admin.status || 'active';
                const statusInfo = STATUS_COLORS[status] || STATUS_COLORS.active;
                return (
                  <tr key={admin.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {(admin.name || admin.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{admin.name || '(이름 없음)'}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{admin.email || '-'}</td>
                    <td style={styles.td}>
                      <span style={styles.roleBadge}>{getRoleLabel(admin.role)}</span>
                    </td>
                    <td style={styles.td}>{formatDate(admin.lastLogin)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusPill,
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.color,
                        }}
                        onClick={() => toggleStatus(admin)}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.removeBtn}
                        onClick={() => handleRemoveAdmin(admin)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 관리자 추가 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>관리자 추가</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>이름</label>
              <input
                style={styles.input}
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                placeholder="관리자 이름"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>이메일</label>
              <input
                style={styles.input}
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="admin@example.com"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>역할</label>
              <select
                style={styles.select}
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                취소
              </button>
              <button style={styles.saveBtn} onClick={handleAddAdmin} disabled={saving}>
                {saving ? '저장 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 1200,
    margin: '0 auto',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700, color: '#1a202c', margin: 0 },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 4 },
  addBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '12px 16px', fontSize: 14, color: '#2d3748', verticalAlign: 'middle' },
  nameCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  roleBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: '#ebf4ff',
    color: '#3182ce',
  },
  statusPill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '5px 12px',
    fontSize: 12,
    color: '#c53030',
    backgroundColor: '#fde8e8',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
  },
  loading: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  empty: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '28px 32px',
    width: 440,
    maxWidth: '90vw',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1a202c', marginTop: 0, marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '9px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '9px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  cancelBtn: {
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#4a5568',
    backgroundColor: '#edf2f7',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
