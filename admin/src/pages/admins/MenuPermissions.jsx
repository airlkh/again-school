import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const ALL_MENUS = [
  { path: '/dashboard', label: '대시보드' },
  { path: '/members', label: '회원 관리' },
  { path: '/members/:id', label: '회원 상세' },
  { path: '/school', label: '학교 관리' },
  { path: '/community', label: '커뮤니티' },
  { path: '/content', label: '콘텐츠' },
  { path: '/chat', label: '채팅' },
  { path: '/reports', label: '신고 관리' },
  { path: '/stats', label: '통계' },
  { path: '/settlement', label: '정산' },
  { path: '/admins', label: '관리자 관리' },
  { path: '/admins/permissions', label: '권한 그룹' },
  { path: '/admins/menu-permissions', label: '메뉴 접근 권한' },
  { path: '/admins/logs', label: '작업 로그' },
  { path: '/settings', label: '설정' },
  { path: '/settings/basic', label: '기본 설정' },
  { path: '/settings/signup', label: '회원가입 설정' },
  { path: '/settings/community', label: '커뮤니티 설정' },
  { path: '/settings/notification', label: '알림 설정' },
  { path: '/settings/security', label: '보안 설정' },
];

export default function MenuPermissions() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'permissionGroups'));
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('권한 그룹 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const togglePermission = (groupId, menuPath) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const menus = g.allowedMenus || [];
        const newMenus = menus.includes(menuPath)
          ? menus.filter((m) => m !== menuPath)
          : [...menus, menuPath];
        return { ...g, allowedMenus: newMenus };
      })
    );
    setChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = groups.map((g) =>
        updateDoc(doc(db, 'permissionGroups', g.id), {
          allowedMenus: g.allowedMenus || [],
          updatedAt: serverTimestamp(),
        })
      );
      await Promise.all(promises);
      setChanged(false);
      alert('저장되었습니다.');
    } catch (err) {
      console.error('메뉴 권한 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectAll = (groupId) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, allowedMenus: ALL_MENUS.map((m) => m.path) };
      })
    );
    setChanged(true);
  };

  const deselectAll = (groupId) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, allowedMenus: [] };
      })
    );
    setChanged(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>메뉴 접근 권한 설정</h1>
          <p style={styles.subtitle}>권한 그룹별로 접근 가능한 메뉴를 설정합니다.</p>
        </div>
        <button
          style={{ ...styles.saveBtn, opacity: changed ? 1 : 0.5 }}
          onClick={handleSave}
          disabled={!changed || saving}
        >
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : groups.length === 0 ? (
        <div style={styles.empty}>
          권한 그룹이 없습니다. 먼저 권한 그룹을 생성해주세요.
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.stickyCol }}>메뉴</th>
                  {groups.map((g) => (
                    <th key={g.id} style={styles.th}>
                      <div>{g.name}</div>
                      <div style={styles.thActions}>
                        <button style={styles.miniBtn} onClick={() => selectAll(g.id)}>전체선택</button>
                        <button style={styles.miniBtn} onClick={() => deselectAll(g.id)}>전체해제</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_MENUS.map((menu) => (
                  <tr key={menu.path} style={styles.tr}>
                    <td style={{ ...styles.td, ...styles.stickyCol, fontWeight: 500 }}>
                      {menu.label}
                      <span style={styles.pathText}>{menu.path}</span>
                    </td>
                    {groups.map((g) => (
                      <td key={g.id} style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={(g.allowedMenus || []).includes(menu.path)}
                          onChange={() => togglePermission(g.id, menu.path)}
                          style={styles.checkbox}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 1400,
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
  saveBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  loading: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  empty: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    padding: 40,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 14,
  },
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 600 },
  th: {
    textAlign: 'center',
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
    minWidth: 120,
  },
  thActions: { display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 },
  miniBtn: {
    padding: '2px 6px',
    fontSize: 10,
    color: '#4299e1',
    backgroundColor: '#ebf8ff',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
  },
  stickyCol: {
    position: 'sticky',
    left: 0,
    backgroundColor: '#fff',
    zIndex: 1,
    textAlign: 'left',
    minWidth: 200,
  },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '10px 16px', fontSize: 14, color: '#2d3748', verticalAlign: 'middle' },
  pathText: { display: 'block', fontSize: 11, color: '#a0aec0', marginTop: 2 },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },
};
