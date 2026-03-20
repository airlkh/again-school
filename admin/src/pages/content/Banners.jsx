import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dpmnx06ni/image/upload';
const CLOUDINARY_PRESET = 'again_school_uploads';

const s = {
  container: { padding: 0 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addBtn: { padding: '10px 22px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', backgroundColor: '#e94560', color: '#fff' },
  count: { fontSize: 14, color: '#888' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: '14px 20px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b6b80', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' },
  td: { padding: '13px 16px', fontSize: 13, color: '#333', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  thumbnail: { width: 80, height: 44, objectFit: 'cover', borderRadius: 6, backgroundColor: '#f0f0f5' },
  badge: (active) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: active ? '#e8f5e9' : '#f5f5f5', color: active ? '#2e7d32' : '#757575', cursor: 'pointer' }),
  expiredBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: '#fff3e0', color: '#e65100' },
  actionBtn: { padding: '5px 10px', border: '1px solid #d0d0d0', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#555', marginRight: 4 },
  deleteBtn: { padding: '5px 10px', border: '1px solid #ffcdd2', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: '#fff', color: '#c62828' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 32, width: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#222', marginBottom: 20 },
  section: { fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 10, marginTop: 20, borderBottom: '1px solid #eee', paddingBottom: 6 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  checkLabel: { fontSize: 14, color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { padding: '10px 22px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 14, cursor: 'pointer', backgroundColor: '#fff', color: '#555' },
  saveBtn: { padding: '10px 22px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', backgroundColor: '#e94560', color: '#fff' },
  uploadBox: { border: '2px dashed #d0d0d8', borderRadius: 8, padding: 12, textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa', fontSize: 13, color: '#888' },
  targetTag: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, backgroundColor: '#e8f0fe', color: '#1a73e8', marginRight: 4, marginBottom: 2 },
  statsCell: { fontSize: 11, color: '#888' },
};

const defaultForm = {
  title: '', imageUrl: '', linkUrl: '', position: '피드중간', order: 0, active: true,
  startDate: '', endDate: '',
  targetRegion: '', targetSchoolType: '', targetAgeMin: '', targetAgeMax: '',
  dailyLimit: '', totalLimit: '',
};

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setBanners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('배너 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'banners');
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
      const data = await res.json();
      setForm((p) => ({ ...p, imageUrl: data.secure_url }));
    } catch { alert('이미지 업로드 실패'); }
    setUploading(false);
  };

  const isExpired = (banner) => {
    if (!banner.endDate) return false;
    return new Date(banner.endDate) < new Date();
  };

  const isScheduled = (banner) => {
    if (!banner.startDate) return false;
    return new Date(banner.startDate) > new Date();
  };

  const getStatus = (banner) => {
    if (isExpired(banner)) return { label: '만료', style: s.expiredBadge };
    if (isScheduled(banner)) return { label: '예약', style: { ...s.expiredBadge, backgroundColor: '#ede9fe', color: '#7c3aed' } };
    return { label: banner.active !== false ? '활성' : '비활성', style: s.badge(banner.active !== false) };
  };

  const getTargetTags = (banner) => {
    const tags = [];
    if (banner.targetRegion) tags.push(`📍 ${banner.targetRegion}`);
    if (banner.targetSchoolType) tags.push(`🏫 ${banner.targetSchoolType}`);
    if (banner.targetAgeMin || banner.targetAgeMax) tags.push(`👤 ${banner.targetAgeMin || ''}~${banner.targetAgeMax || ''}세`);
    return tags;
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, order: banners.length });
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditId(banner.id);
    setForm({
      title: banner.title || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '',
      position: banner.position || '피드중간',
      order: banner.order ?? 0,
      active: banner.active !== false,
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
      targetRegion: banner.targetRegion || '',
      targetSchoolType: banner.targetSchoolType || '',
      targetAgeMin: banner.targetAgeMin || '',
      targetAgeMax: banner.targetAgeMax || '',
      dailyLimit: banner.dailyLimit || '',
      totalLimit: banner.totalLimit || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('제목을 입력해주세요.'); return; }
    try {
      const data = {
        title: form.title,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl,
        position: form.position,
        order: Number(form.order) || 0,
        active: form.active,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        targetRegion: form.targetRegion || null,
        targetSchoolType: form.targetSchoolType || null,
        targetAgeMin: form.targetAgeMin ? Number(form.targetAgeMin) : null,
        targetAgeMax: form.targetAgeMax ? Number(form.targetAgeMax) : null,
        dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : null,
        totalLimit: form.totalLimit ? Number(form.totalLimit) : null,
      };
      if (editId) {
        await updateDoc(doc(db, 'banners', editId), { ...data, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'banners'), { ...data, impressions: 0, clicks: 0, createdAt: new Date(), updatedAt: new Date() });
      }
      setShowModal(false);
      fetchBanners();
    } catch (err) { alert('저장 실패: ' + err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 광고를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      fetchBanners();
    } catch (err) { alert('삭제 실패: ' + err.message); }
  };

  const toggleActive = async (banner) => {
    try {
      await updateDoc(doc(db, 'banners', banner.id), { active: !banner.active, updatedAt: new Date() });
      fetchBanners();
    } catch { alert('상태 변경 실패'); }
  };

  const reorder = async (index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= banners.length) return;
    const a = banners[index];
    const b = banners[swapIndex];
    await Promise.all([
      updateDoc(doc(db, 'banners', a.id), { order: b.order ?? swapIndex }),
      updateDoc(doc(db, 'banners', b.id), { order: a.order ?? index }),
    ]);
    fetchBanners();
  };

  const totalImpressions = banners.reduce((sum, b) => sum + (b.impressions || 0), 0);
  const totalClicks = banners.reduce((sum, b) => sum + (b.clicks || 0), 0);
  const activeBanners = banners.filter((b) => b.active !== false && !isExpired(b)).length;

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>;

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <span style={s.count}>전체 {banners.length}개</span>
        <button style={s.addBtn} onClick={openCreate}>+ 새 광고</button>
      </div>

      <div style={s.statsRow}>
        {[
          { label: '활성 광고', value: activeBanners },
          { label: '총 노출수', value: totalImpressions.toLocaleString() },
          { label: '총 클릭수', value: totalClicks.toLocaleString() },
          { label: '평균 CTR', value: totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(1)}%` : '0%' },
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
            <th style={{ ...s.th, width: 40 }}>#</th>
            <th style={s.th}>미리보기</th>
            <th style={s.th}>제목 / 타겟</th>
            <th style={s.th}>위치</th>
            <th style={s.th}>기간</th>
            <th style={s.th}>노출/클릭</th>
            <th style={s.th}>상태</th>
            <th style={s.th}>정렬</th>
            <th style={s.th}>관리</th>
          </tr>
        </thead>
        <tbody>
          {banners.length === 0 ? (
            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 60, color: '#999' }}>광고가 없습니다.</td></tr>
          ) : (
            banners.map((b, idx) => {
              const status = getStatus(b);
              const tags = getTargetTags(b);
              const ctr = b.impressions > 0 ? `${((b.clicks / b.impressions) * 100).toFixed(1)}%` : '0%';
              return (
                <tr key={b.id}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafe')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td style={{ ...s.td, textAlign: 'center', color: '#888', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={s.td}>
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.title} style={s.thumbnail} />
                    ) : (
                      <div style={{ ...s.thumbnail, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>없음</div>
                    )}
                  </td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
                    {tags.length > 0 && (
                      <div>{tags.map((t, i) => <span key={i} style={s.targetTag}>{t}</span>)}</div>
                    )}
                    {b.linkUrl && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{b.linkUrl.substring(0, 40)}...</div>}
                  </td>
                  <td style={s.td}>{b.position || '-'}</td>
                  <td style={{ ...s.td, fontSize: 12, color: '#666' }}>
                    {b.startDate && <div>시작: {b.startDate}</div>}
                    {b.endDate && <div>종료: {b.endDate}</div>}
                    {!b.startDate && !b.endDate && '-'}
                  </td>
                  <td style={s.td}>
                    <div style={s.statsCell}>{(b.impressions || 0).toLocaleString()} 노출</div>
                    <div style={s.statsCell}>{(b.clicks || 0).toLocaleString()} 클릭</div>
                    <div style={{ ...s.statsCell, color: '#e94560', fontWeight: 600 }}>CTR {ctr}</div>
                  </td>
                  <td style={s.td}>
                    <span style={status.style} onClick={() => !isExpired(b) && toggleActive(b)}>
                      {status.label}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button style={s.actionBtn} onClick={() => reorder(idx, -1)} disabled={idx === 0}>▲</button>
                      <button style={s.actionBtn} onClick={() => reorder(idx, 1)} disabled={idx === banners.length - 1}>▼</button>
                    </div>
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <button style={s.actionBtn} onClick={() => openEdit(b)}>수정</button>
                    <button style={s.deleteBtn} onClick={() => handleDelete(b.id)}>삭제</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>{editId ? '광고 수정' : '새 광고 등록'}</div>

            <div style={s.section}>기본 정보</div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>제목 *</label>
              <input style={s.input} placeholder="광고 제목" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>광고 이미지</label>
              <div style={s.uploadBox} onClick={() => document.getElementById('bannerFile').click()}>
                {uploading ? '업로드 중...' : form.imageUrl ? '이미지 변경 클릭' : '클릭하여 이미지 업로드'}
              </div>
              <input id="bannerFile" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e.target.files[0])} />
              {form.imageUrl && <img src={form.imageUrl} style={{ marginTop: 8, height: 60, borderRadius: 6, objectFit: 'cover' }} alt="" />}
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>링크 URL (클릭 시 이동)</label>
              <input style={s.input} placeholder="https://..." value={form.linkUrl}
                onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>노출 위치</label>
                <select style={{ ...s.input, backgroundColor: '#fff' }} value={form.position}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}>
                  <option value="피드상단">피드 상단</option>
                  <option value="피드중간">피드 중간 (3번째)</option>
                  <option value="피드하단">피드 하단</option>
                  <option value="팝업">팝업</option>
                  <option value="스토리사이">스토리 사이</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>정렬 순서</label>
                <input style={s.input} type="number" value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} />
              </div>
            </div>

            <div style={s.section}>노출 기간</div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>시작일</label>
                <input type="date" style={s.input} value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>종료일</label>
                <input type="date" style={s.input} value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>

            <div style={s.section}>타겟팅</div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>지역 타겟 (시/도)</label>
                <select style={{ ...s.input, backgroundColor: '#fff' }} value={form.targetRegion}
                  onChange={(e) => setForm((p) => ({ ...p, targetRegion: e.target.value }))}>
                  <option value="">전체 지역</option>
                  {['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>학교 유형</label>
                <select style={{ ...s.input, backgroundColor: '#fff' }} value={form.targetSchoolType}
                  onChange={(e) => setForm((p) => ({ ...p, targetSchoolType: e.target.value }))}>
                  <option value="">전체</option>
                  <option value="초등학교">초등학교</option>
                  <option value="중학교">중학교</option>
                  <option value="고등학교">고등학교</option>
                  <option value="대학교">대학교</option>
                </select>
              </div>
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>최소 나이</label>
                <input style={s.input} type="number" placeholder="예: 20" value={form.targetAgeMin}
                  onChange={(e) => setForm((p) => ({ ...p, targetAgeMin: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>최대 나이</label>
                <input style={s.input} type="number" placeholder="예: 50" value={form.targetAgeMax}
                  onChange={(e) => setForm((p) => ({ ...p, targetAgeMax: e.target.value }))} />
              </div>
            </div>

            <div style={s.section}>노출 제한</div>
            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>일일 노출 제한</label>
                <input style={s.input} type="number" placeholder="무제한" value={form.dailyLimit}
                  onChange={(e) => setForm((p) => ({ ...p, dailyLimit: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.formLabel}>총 노출 제한</label>
                <input style={s.input} type="number" placeholder="무제한" value={form.totalLimit}
                  onChange={(e) => setForm((p) => ({ ...p, totalLimit: e.target.value }))} />
              </div>
            </div>

            <label style={s.checkLabel}>
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
              즉시 활성화
            </label>
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
