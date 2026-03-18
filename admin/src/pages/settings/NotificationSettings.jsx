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

const CHANNEL_OPTIONS = [
  { value: 'push', label: '푸시 알림' },
  { value: 'email', label: '이메일' },
  { value: 'sms', label: 'SMS' },
  { value: 'inApp', label: '인앱 알림' },
];

const TEMPLATE_TYPES = [
  { value: 'push', label: '푸시 알림' },
  { value: 'email', label: '이메일' },
];

export default function NotificationSettings() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'push',
    title: '',
    body: '',
    channels: ['push'],
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'notificationTemplates'));
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('알림 템플릿 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreate = () => {
    setEditTemplate(null);
    setForm({
      name: '',
      type: 'push',
      title: '',
      body: '',
      channels: ['push'],
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    });
    setShowModal(true);
  };

  const openEdit = (tpl) => {
    setEditTemplate(tpl);
    setForm({
      name: tpl.name || '',
      type: tpl.type || 'push',
      title: tpl.title || '',
      body: tpl.body || '',
      channels: tpl.channels || ['push'],
      quietHoursStart: tpl.quietHoursStart || '22:00',
      quietHoursEnd: tpl.quietHoursEnd || '08:00',
    });
    setShowModal(true);
  };

  const toggleChannel = (channel) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.title.trim()) {
      alert('템플릿 이름과 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const ref = editTemplate
        ? doc(db, 'notificationTemplates', editTemplate.id)
        : doc(collection(db, 'notificationTemplates'));
      await setDoc(ref, {
        name: form.name.trim(),
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        channels: form.channels,
        quietHoursStart: form.quietHoursStart,
        quietHoursEnd: form.quietHoursEnd,
        updatedAt: serverTimestamp(),
        ...(!editTemplate && { createdAt: serverTimestamp() }),
      }, { merge: true });
      setShowModal(false);
      await fetchTemplates();
    } catch (err) {
      console.error('알림 템플릿 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`"${tpl.name}" 템플릿을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'notificationTemplates', tpl.id));
      await fetchTemplates();
    } catch (err) {
      console.error('알림 템플릿 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const getTypeLabel = (type) => {
    const found = TEMPLATE_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const getChannelLabel = (ch) => {
    const found = CHANNEL_OPTIONS.find((c) => c.value === ch);
    return found ? found.label : ch;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>알림 설정</h1>
          <p style={styles.subtitle}>푸시 알림 및 이메일 템플릿을 관리합니다.</p>
        </div>
        <button style={styles.addBtn} onClick={openCreate}>
          + 템플릿 추가
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : templates.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.emptyText}>등록된 알림 템플릿이 없습니다.</p>
          <button style={styles.addBtn} onClick={openCreate}>첫 템플릿 만들기</button>
        </div>
      ) : (
        <div style={styles.grid}>
          {templates.map((tpl) => (
            <div key={tpl.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <span style={styles.typeBadge}>{getTypeLabel(tpl.type)}</span>
                  <h3 style={styles.cardTitle}>{tpl.name}</h3>
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => openEdit(tpl)}>수정</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(tpl)}>삭제</button>
                </div>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.fieldRow}>
                  <span style={styles.fieldLabel}>제목:</span>
                  <span>{tpl.title || '-'}</span>
                </div>
                <div style={styles.fieldRow}>
                  <span style={styles.fieldLabel}>내용:</span>
                  <span style={styles.bodyPreview}>{tpl.body || '-'}</span>
                </div>
                <div style={styles.fieldRow}>
                  <span style={styles.fieldLabel}>채널:</span>
                  <div style={styles.channelTags}>
                    {(tpl.channels || []).map((ch) => (
                      <span key={ch} style={styles.channelTag}>{getChannelLabel(ch)}</span>
                    ))}
                  </div>
                </div>
                <div style={styles.fieldRow}>
                  <span style={styles.fieldLabel}>방해 금지:</span>
                  <span>{tpl.quietHoursStart || '22:00'} ~ {tpl.quietHoursEnd || '08:00'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 템플릿 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editTemplate ? '템플릿 수정' : '템플릿 추가'}
            </h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>템플릿 이름</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 새 메시지 알림"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>유형</label>
              <select
                style={styles.select}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>제목</label>
              <input
                style={styles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="알림 제목"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>내용</label>
              <textarea
                style={styles.textarea}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="알림 내용 (변수: {{userName}}, {{content}} 등)"
                rows={4}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>알림 채널</label>
              <div style={styles.checkboxGrid}>
                {CHANNEL_OPTIONS.map((ch) => (
                  <label key={ch.value} style={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={form.channels.includes(ch.value)}
                      onChange={() => toggleChannel(ch.value)}
                    />
                    <span>{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>방해 금지 시간</label>
              <div style={styles.quietHoursRow}>
                <input
                  type="time"
                  style={styles.timeInput}
                  value={form.quietHoursStart}
                  onChange={(e) => setForm({ ...form, quietHoursStart: e.target.value })}
                />
                <span style={{ color: '#a0aec0' }}>~</span>
                <input
                  type="time"
                  style={styles.timeInput}
                  value={form.quietHoursEnd}
                  onChange={(e) => setForm({ ...form, quietHoursEnd: e.target.value })}
                />
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1a202c', margin: '6px 0 0 0' },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: '#faf5ff',
    color: '#6b46c1',
  },
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
  cardBody: { fontSize: 13, color: '#4a5568' },
  fieldRow: { display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  fieldLabel: { fontWeight: 600, color: '#718096', whiteSpace: 'nowrap', minWidth: 70 },
  bodyPreview: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  channelTags: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  channelTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
    backgroundColor: '#ebf4ff',
    color: '#3182ce',
  },
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
    width: 520,
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
  textarea: {
    width: '100%',
    padding: '9px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  checkboxGrid: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#2d3748',
    cursor: 'pointer',
  },
  quietHoursRow: { display: 'flex', alignItems: 'center', gap: 8 },
  timeInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
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
