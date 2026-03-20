import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dpmnx06ni/upload';
const CLOUDINARY_PRESET = 'again_school_uploads';

const s = {
  container: { padding: '24px 32px', backgroundColor: '#f5f5f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: '14px 20px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  btn: { padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnSuccess: { backgroundColor: '#2e7d32', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '2px solid #eee', backgroundColor: '#fafafa', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, color: '#333', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 32, width: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#222', marginBottom: 20 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  uploadBox: { border: '2px dashed #d0d0d8', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa', fontSize: 13, color: '#888' },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: '10px 22px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 14, cursor: 'pointer', backgroundColor: '#fff', color: '#555' },
  saveBtn: { padding: '10px 22px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', backgroundColor: '#1a1a2e', color: '#fff' },
  genreBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 500 },
  emptyRow: { padding: 40, textAlign: 'center', color: '#999', fontSize: 14 },
};

const GENRES = ['팝', 'R&B', '재즈', '클래식', '힙합', '인디', '발라드', '일렉트로닉', '기타'];
const emptyForm = { title: '', url: '', duration: '', genre: '' };

export default function MusicManager() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchTracks(); }, []);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTracks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('음악 로드 실패:', err);
    }
    setLoading(false);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'music');
      formData.append('resource_type', 'video');
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
      const data = await res.json();
      setForm((p) => ({
        ...p,
        url: data.secure_url,
        duration: data.duration ? Math.round(data.duration) : '',
        title: p.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
    } catch { alert('업로드 실패'); }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url) { alert('제목과 음악 파일을 입력해주세요.'); return; }
    try {
      const data = {
        title: form.title,
        url: form.url,
        duration: Number(form.duration) || 0,
        genre: form.genre || '',
        updatedAt: Timestamp.now(),
      };
      if (editId) {
        await updateDoc(doc(db, 'music', editId), data);
      } else {
        await addDoc(collection(db, 'music'), { ...data, createdAt: Timestamp.now() });
      }
      setShowModal(false);
      setForm({ ...emptyForm });
      setEditId(null);
      fetchTracks();
    } catch (err) { alert('저장 실패: ' + err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 음악을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'music', id));
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch { alert('삭제 실패'); }
  };

  const handlePlay = (track) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play();
      }
      setPlayingId(track.id);
    }
  };

  const openEdit = (track) => {
    setEditId(track.id);
    setForm({ title: track.title || '', url: track.url || '', duration: track.duration || '', genre: track.genre || '' });
    setShowModal(true);
  };

  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const sv = sec % 60;
    return `${m}:${String(sv).padStart(2, '0')}`;
  };

  return (
    <div style={s.container}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} style={{ display: 'none' }} />

      <div style={s.header}>
        <h1 style={s.title}>음악 관리</h1>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => { setEditId(null); setForm({ ...emptyForm }); setShowModal(true); }}>
          + 음악 추가
        </button>
      </div>

      <div style={s.statsRow}>
        {[
          { label: '전체 음악', value: tracks.length },
          { label: '장르 수', value: [...new Set(tracks.map((t) => t.genre).filter(Boolean))].length },
          { label: '총 재생 시간', value: formatDuration(tracks.reduce((sum, t) => sum + (t.duration || 0), 0)) },
        ].map((c) => (
          <div key={c.label} style={s.statCard}>
            <div style={s.statLabel}>{c.label}</div>
            <div style={s.statValue}>{c.value}</div>
          </div>
        ))}
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>#</th>
            <th style={s.th}>제목</th>
            <th style={s.th}>장르</th>
            <th style={s.th}>재생 시간</th>
            <th style={s.th}>미리듣기</th>
            <th style={{ ...s.th, textAlign: 'center' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td style={s.emptyRow} colSpan={6}>로딩 중...</td></tr>
          ) : tracks.length === 0 ? (
            <tr><td style={s.emptyRow} colSpan={6}>등록된 음악이 없습니다.</td></tr>
          ) : (
            tracks.map((track, idx) => (
              <tr key={track.id}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9fb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ ...s.td, color: '#888', fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>
                  {playingId === track.id ? '▶ ' : ''}{track.title}
                </td>
                <td style={s.td}>
                  {track.genre ? <span style={s.genreBadge}>{track.genre}</span> : '-'}
                </td>
                <td style={s.td}>{formatDuration(track.duration)}</td>
                <td style={s.td}>
                  <button
                    style={{ ...s.btn, ...(playingId === track.id ? s.btnDanger : s.btnSuccess), ...s.btnSmall }}
                    onClick={() => handlePlay(track)}
                  >
                    {playingId === track.id ? '■ 정지' : '▶ 재생'}
                  </button>
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ ...s.btn, ...s.btnPrimary, ...s.btnSmall }} onClick={() => openEdit(track)}>수정</button>
                    <button style={{ ...s.btn, ...s.btnDanger, ...s.btnSmall }} onClick={() => handleDelete(track.id)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>{editId ? '음악 수정' : '음악 추가'}</div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>음악 파일 업로드</label>
              <div style={s.uploadBox} onClick={() => fileInputRef.current?.click()}>
                {uploading ? '업로드 중...' : form.url ? '✅ 업로드 완료 (변경하려면 클릭)' : '클릭하여 음악 파일 업로드 (mp3, wav)'}
              </div>
              <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
                onChange={(e) => handleUpload(e.target.files[0])} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>제목 *</label>
              <input style={s.input} placeholder="음악 제목" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>장르</label>
              <select style={{ ...s.input, backgroundColor: '#fff' }} value={form.genre}
                onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}>
                <option value="">선택 안 함</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>재생 시간 (초)</label>
              <input style={s.input} type="number" placeholder="예: 180" value={form.duration}
                onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
            </div>
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
              <button style={s.saveBtn} onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
