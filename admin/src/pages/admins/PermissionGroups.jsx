import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_MENUS = [
  '/dashboard',
  '/members',
  '/school',
  '/community',
  '/content',
  '/chat',
  '/reports',
  '/stats',
  '/settlement',
  '/admins',
  '/settings',
];

export default function PermissionGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', allowedMenus: [] });
  const [saving, setSaving] = useState(false);

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

  const openCreate = () => {
    setEditGroup(null);
    setForm({ name: '', description: '', allowedMenus: [] });
    setShowModal(true);
  };

  const openEdit = (group) => {
    setEditGroup(group);
    setForm({
      name: group.name || '',
      description: group.description || '',
      allowedMenus: group.allowedMenus || [],
    });
    setShowModal(true);
  };

  const toggleMenu = (menu) => {
    setForm((prev) => ({
      ...prev,
      allowedMenus: prev.allowedMenus.includes(menu)
        ? prev.allowedMenus.filter((m) => m !== menu)
        : [...prev.allowedMenus, menu],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('그룹 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const ref = editGroup
        ? doc(db, 'permissionGroups', editGroup.id)
        : doc(collection(db, 'permissionGroups'));
      await setDoc(ref, {
        name: form.name.trim(),
        description: form.description.trim(),
        allowedMenus: form.allowedMenus,
        updatedAt: serverTimestamp(),
        ...(!editGroup && { createdAt: serverTimestamp() }),
      }, { merge: true });
      setShowModal(false);
      await fetchGroups();
    } catch (err) {
      console.error('권한 그룹 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`"${group.name}" 그룹을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'permissionGroups', group.id));
      await fetchGroups();
    } catch (err) {
      console.error('권한 그룹 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const getMenuLabel = (path) => {
    const labels = {
      '/dashboard': '대시보드',
      '/members': '회원 관리',
      '/school': '학교 관리',
      '/community': '커뮤니티',
      '/content': '콘텐츠',
      '/chat': '채팅',
      '/reports': '신고 관리',
      '/stats': '통계',
      '/settlement': '정산',
      '/admins': '관리자',
      '/settings': '설정',
    };
    return labels[path] || path;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>권한 그룹 관리</h1>
          <p style={styles.subtitle}>관리자 역할별 권한 그룹을 설정합니다.</p>
        </div>
        <button style={styles.addBtn} onClick={openCreate}>
          + 그룹 추가
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : groups.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.emptyText}>등록된 권한 그룹이 없습니다.</p>
          <button style={styles.addBtn} onClick={openCreate}>첫 그룹 만들기</button>
        </div>
      ) : (
        <div style={styles.grid}>
          {groups.map((group) => (
            <div key={group.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{group.name}</h3>
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => openEdit(group)}>수정</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(group)}>삭제</button>
                </div>
              </div>
              {group.description && (
                <p style={styles.cardDesc}>{group.description}</p>
              )}
              <div style={styles.menuTags}>
                {(group.allowedMenus || []).length === 0 ? (
                  <span style={styles.noMenu}>접근 가능 메뉴 없음</span>
                ) : (
                  (group.allowedMenus || []).map((menu) => (
                    <span key={menu} style={styles.menuTag}>{getMenuLabel(menu)}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 그룹 생성/수정 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editGroup ? '권한 그룹 수정' : '권한 그룹 추가'}
            </h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>그룹 이름</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 슈퍼관리자, 운영자, CS담당자"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>설명</label>
              <input
                style={styles.input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="그룹에 대한 간단한 설명"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>접근 가능 메뉴</label>
              <div style={styles.checkboxGrid}>
                {DEFAULT_MENUS.map((menu) => (
                  <label key={menu} style={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={form.allowedMenus.includes(menu)}
                      onChange={() => toggleMenu(menu)}
                      style={styles.checkbox}
                    />
                    <span>{getMenuLabel(menu)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
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
  loading: { padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    padding: 40,
    textAlign: 'center',
  },
  emptyText: { color: '#a0aec0', fontSize: 14, marginBottom: 16 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1a202c', margin: 0 },
  cardActions: { display: 'flex', gap: 6 },
  editBtn: {
    padding: '4px 10px',
    fontSize: 12,
    color: '#4299e1',
    backgroundColor: '#ebf8ff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
  },
  deleteBtn: {
    padding: '4px 10px',
    fontSize: 12,
    color: '#c53030',
    backgroundColor: '#fde8e8',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
  },
  cardDesc: { fontSize: 13, color: '#718096', margin: '0 0 12px 0' },
  menuTags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  menuTag: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#ebf4ff',
    color: '#3182ce',
  },
  noMenu: { fontSize: 12, color: '#a0aec0' },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
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
    width: 500,
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflowY: 'auto',
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
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#2d3748',
    cursor: 'pointer',
  },
  checkbox: { cursor: 'pointer' },
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
