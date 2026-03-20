import React, { useState, useEffect, useRef } from 'react';
import { db, app } from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, query, orderBy, getDocs, doc,
  addDoc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dpmnx06ni/image/upload';
const CLOUDINARY_PRESET = 'again_school_uploads';

const styles = {
  container: { padding: '24px 32px', backgroundColor: '#f5f5f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  btn: { padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnSuccess: { backgroundColor: '#2e7d32', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #d0d0d8', color: '#555' },
  btnSchedule: { backgroundColor: '#7c3aed', color: '#fff' },
  formCard: { backgroundColor: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 14px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 14, outline: 'none', minHeight: 120, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 10 },
  toggle: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' },
  toggleDot: { width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s' },
  formActions: { display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #eee', backgroundColor: '#fafafa', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, color: '#333', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  actions: { display: 'flex', gap: 6 },
  pinnedBadge: { padding: '2px 8px', backgroundColor: '#fff3e0', color: '#e65100', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  scheduledBadge: { padding: '2px 8px', backgroundColor: '#ede9fe', color: '#7c3aed', borderRadius: 4, fontSize: 11, fontWeight: 600, marginLeft: 4 },
  emptyRow: { padding: 40, textAlign: 'center', color: '#999', fontSize: 14 },
  searchInput: { padding: '8px 14px', border: '1px solid #d0d0d8', borderRadius: 6, fontSize: 13, width: 260, outline: 'none' },
  filterBar: { display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' },
  imagePreview: { width: 80, height: 80, objectFit: 'cover', borderRadius: 6, marginTop: 8 },
  uploadBox: { border: '2px dashed #d0d0d8', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa' },
};

const emptyForm = { title: '', content: '', pinned: false, imageUrl: '', linkUrl: '', scheduledAt: '' };

export default function NoticePosts() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setNotices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('공지 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'notices');
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.secure_url }));
    } catch (e) {
      alert('이미지 업로드 실패');
    }
    setUploading(false);
  };

  const sendPush = async (title, content, imageUrl, linkUrl) => {
    try {
      const functions = getFunctions(app, 'asia-northeast3');
      const fn = httpsCallable(functions, 'sendNoticeToAll');
      const result = await fn({ title, content: content.substring(0, 100), imageUrl, linkUrl });
      return result.data?.count || 0;
    } catch (e) {
      console.error('푸시 발송 실패:', e);
      return 0;
    }
  };

  const handleSubmit = async (isScheduled = false) => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    if (isScheduled && !form.scheduledAt) {
      alert('예약 발송 시간을 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      const noticeData = {
        title: form.title,
        content: form.content,
        pinned: form.pinned,
        imageUrl: form.imageUrl || '',
        linkUrl: form.linkUrl || '',
        updatedAt: Timestamp.now(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'notices', editingId), noticeData);
        setNotices((prev) => prev.map((n) => n.id === editingId ? { ...n, ...noticeData } : n));
        alert('공지가 수정되었습니다.');
      } else {
        const scheduledAt = isScheduled ? Timestamp.fromDate(new Date(form.scheduledAt)) : null;
        const docRef = await addDoc(collection(db, 'notices'), {
          ...noticeData,
          published: !isScheduled,
          scheduledAt: scheduledAt,
          createdAt: Timestamp.now(),
        });

        setNotices((prev) => [{
          id: docRef.id, ...noticeData,
          published: !isScheduled,
          scheduledAt,
          createdAt: Timestamp.now(),
        }, ...prev]);

        if (!isScheduled) {
          const count = await sendPush(form.title, form.content, form.imageUrl, form.linkUrl);
          alert(`공지가 등록되었습니다. ${count}명에게 알림 발송`);
        } else {
          alert(`예약 발송이 설정되었습니다.\n발송 시간: ${new Date(form.scheduledAt).toLocaleString('ko-KR')}`);
        }
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error('저장 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  const handleSendScheduled = async (notice) => {
    if (!window.confirm('지금 즉시 발송하시겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'notices', notice.id), { published: true, scheduledAt: null });
      const count = await sendPush(notice.title, notice.content, notice.imageUrl, notice.linkUrl);
      setNotices((prev) => prev.map((n) => n.id === notice.id ? { ...n, published: true, scheduledAt: null } : n));
      alert(`${count}명에게 알림 발송 완료`);
    } catch (e) {
      alert('발송 실패');
    }
  };

  const handleEdit = (notice) => {
    setForm({
      title: notice.title || '',
      content: notice.content || '',
      pinned: !!notice.pinned,
      imageUrl: notice.imageUrl || '',
      linkUrl: notice.linkUrl || '',
      scheduledAt: '',
    });
    setEditingId(notice.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 이 공지를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(s) || (n.content || '').toLowerCase().includes(s);
  });

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str, len = 50) => {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>공지글 관리</h1>
        <button style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => { setShowForm(true); setForm({ ...emptyForm }); setEditingId(null); }}>
          + 새 공지 작성
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <div style={styles.formTitle}>{editingId ? '공지 수정' : '새 공지 작성'}</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>제목 *</label>
            <input style={styles.input} placeholder="공지 제목" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>내용 *</label>
            <textarea style={styles.textarea} placeholder="공지 내용" value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>이미지 첨부</label>
            <div style={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
              {uploading ? '업로드 중...' : form.imageUrl ? '이미지 변경 클릭' : '클릭하여 이미지 업로드'}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e.target.files[0])} />
            {form.imageUrl && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={form.imageUrl} style={styles.imagePreview} alt="미리보기" />
                <button style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                  onClick={() => setForm({ ...form, imageUrl: '' })}>제거</button>
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>링크 URL (이미지 클릭 시 이동)</label>
            <input style={styles.input} placeholder="https://..." value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>예약 발송 시간 (선택)</label>
            <input type="datetime-local" style={styles.input} value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>상단 고정</label>
            <div style={styles.toggleRow}>
              <button style={{ ...styles.toggle, backgroundColor: form.pinned ? '#e94560' : '#ccc' }}
                onClick={() => setForm({ ...form, pinned: !form.pinned })}>
                <div style={{ ...styles.toggleDot, left: form.pinned ? 23 : 3 }} />
              </button>
              <span style={{ fontSize: 13, color: '#555' }}>{form.pinned ? '고정됨' : '고정 안 함'}</span>
            </div>
          </div>

          <div style={styles.formActions}>
            <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={() => handleSubmit(false)} disabled={saving}>
              {saving ? '저장 중...' : editingId ? '수정 완료' : '즉시 발송'}
            </button>
            {!editingId && (
              <button style={{ ...styles.btn, ...styles.btnSchedule }} onClick={() => handleSubmit(true)} disabled={saving}>
                예약 발송
              </button>
            )}
            <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(false); }}>
              취소
            </button>
          </div>
        </div>
      )}

      <div style={styles.filterBar}>
        <input style={styles.searchInput} placeholder="공지 제목 또는 내용 검색..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <span style={{ fontSize: 13, color: '#888' }}>총 {filteredNotices.length}건</span>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>고정</th>
            <th style={styles.th}>제목</th>
            <th style={styles.th}>내용 미리보기</th>
            <th style={styles.th}>이미지</th>
            <th style={styles.th}>작성일</th>
            <th style={styles.th}>예약</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td style={styles.emptyRow} colSpan={7}>로딩 중...</td></tr>
          ) : filteredNotices.length === 0 ? (
            <tr><td style={styles.emptyRow} colSpan={7}>공지글이 없습니다.</td></tr>
          ) : (
            filteredNotices.map((notice) => (
              <tr key={notice.id}>
                <td style={styles.td}>{notice.pinned && <span style={styles.pinnedBadge}>고정</span>}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{notice.title || '-'}</td>
                <td style={styles.td}>{truncate(notice.content)}</td>
                <td style={styles.td}>
                  {notice.imageUrl ? (
                    <img src={notice.imageUrl} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} alt="" />
                  ) : '-'}
                </td>
                <td style={styles.td}>{formatDate(notice.createdAt)}</td>
                <td style={styles.td}>
                  {notice.scheduledAt ? (
                    <span style={styles.scheduledBadge}>예약: {formatDate(notice.scheduledAt)}</span>
                  ) : '-'}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    {notice.scheduledAt && !notice.published && (
                      <button style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSmall }}
                        onClick={() => handleSendScheduled(notice)}>즉시발송</button>
                    )}
                    <button style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }}
                      onClick={() => handleEdit(notice)}>수정</button>
                    <button style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                      onClick={() => handleDelete(notice.id)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
