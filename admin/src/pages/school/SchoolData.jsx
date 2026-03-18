import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

/* ───────────────────── styles ───────────────────── */
const ACCENT = '#e8313a';

const s = {
  container: {
    padding: 32,
    maxWidth: 1260,
    margin: '0 auto',
    fontFamily:
      "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  /* header */
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 26, fontWeight: 700, color: '#1a1a2e', margin: 0 },

  /* stat cards */
  statsRow: { display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 180,
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: '22px 24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  statValue: { fontSize: 30, fontWeight: 700, color: '#1a1a2e' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 6 },

  /* toolbar */
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    background: '#fff',
    flex: 1,
    maxWidth: 320,
  },
  input: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#333',
    width: '100%',
    background: 'transparent',
  },
  select: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    color: '#333',
    background: '#fff',
    outline: 'none',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '9px 18px',
    borderRadius: 8,
    border: 'none',
    background: ACCENT,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnOutline: {
    padding: '9px 18px',
    borderRadius: 8,
    border: `1px solid ${ACCENT}`,
    background: '#fff',
    color: ACCENT,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnGray: {
    padding: '9px 18px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    color: '#555',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  /* neis search */
  neisWrapper: { position: 'relative', flex: 1, maxWidth: 420 },
  neisInput: {
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  neisDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 320,
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  neisItem: {
    padding: '10px 14px',
    fontSize: 14,
    cursor: 'pointer',
    borderBottom: '1px solid #f5f5f5',
    transition: 'background .15s',
  },
  neisItemSub: { fontSize: 12, color: '#888', marginTop: 2 },

  /* table */
  tableWrapper: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '13px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    background: '#fafafa',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '13px 16px',
    fontSize: 14,
    color: '#333',
    borderBottom: '1px solid #f5f5f5',
    whiteSpace: 'nowrap',
  },

  /* pills */
  pillBlue: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    background: '#e8f0fe',
    color: '#1a73e8',
    fontSize: 12,
    fontWeight: 600,
  },
  pillGray: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    background: '#f0f0f0',
    color: '#666',
    fontSize: 12,
    fontWeight: 600,
  },

  /* toggle */
  toggle: (active) => ({
    width: 42,
    height: 24,
    borderRadius: 12,
    background: active ? ACCENT : '#ccc',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background .2s',
    border: 'none',
    padding: 0,
  }),
  toggleKnob: (active) => ({
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: 3,
    left: active ? 21 : 3,
    transition: 'left .2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  }),

  /* modal */
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 14,
    padding: 28,
    width: 440,
    maxWidth: '90vw',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 20, margin: 0 },
  formGroup: { marginBottom: 16 },
  formLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
  formInput: {
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },

  /* pagination */
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  pageBtn: (active) => ({
    padding: '6px 12px',
    borderRadius: 6,
    border: active ? `1px solid ${ACCENT}` : '1px solid #ddd',
    background: active ? ACCENT : '#fff',
    color: active ? '#fff' : '#555',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }),

  /* toast */
  toast: {
    position: 'fixed',
    bottom: 32,
    right: 32,
    background: '#1a1a2e',
    color: '#fff',
    padding: '14px 24px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    zIndex: 2000,
    transition: 'opacity .3s',
  },

  /* misc */
  empty: { textAlign: 'center', color: '#999', padding: '60px 0', fontSize: 15 },
  deleteBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    color: '#e8313a',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { textAlign: 'center', color: ACCENT, padding: '60px 0', fontSize: 15 },
};

const PAGE_SIZE = 20;
const NEIS_KEY = '0bb9dbfbdad641a2b029e7eb3380a758';

/* ───────────────────── helpers ───────────────────── */
function mapNeisToSchool(row) {
  return {
    schoolName: row.SCHUL_NM || '',
    schoolType: row.SCHUL_KND_SC_NM || '',
    region: row.LCTN_SC_NM || '',
    address: row.ORG_RDNMA || '',
    officeCode: row.ATPT_OFCDC_SC_CODE || '',
    schoolCode: row.SD_SCHUL_CODE || '',
    isActive: true,
    memberCount: 0,
    source: 'neis',
  };
}

async function searchNeis(query) {
  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const json = await res.json();
  const info = json?.schoolInfo;
  if (!info || !info[1]?.row) return [];
  return info[1].row;
}

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/* ───────────────────── component ───────────────────── */
export default function SchoolData() {
  /* schools realtime */
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* users-based app school count */
  const [appSchoolNames, setAppSchoolNames] = useState(new Set());

  /* search / filter */
  const [tableSearch, setTableSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);

  /* neis search */
  const [neisQuery, setNeisQuery] = useState('');
  const [neisResults, setNeisResults] = useState([]);
  const [neisLoading, setNeisLoading] = useState(false);
  const [neisOpen, setNeisOpen] = useState(false);
  const neisTimer = useRef(null);

  /* manual add modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ schoolName: '', schoolType: '초등학교', region: '', address: '' });

  /* toast */
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  /* syncing flag */
  const [syncing, setSyncing] = useState(false);

  /* ─── show toast ─── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  /* ─── realtime schools ─── */
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'schools'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSchools(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('schools onSnapshot error:', err);
        setError('학교 데이터를 불러오는 데 실패했습니다.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  /* ─── load app school names from users ─── */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const names = new Set();
        snap.docs.forEach((d) => {
          const data = d.data();
          const arr = Array.isArray(data.schools) ? data.schools : data.school ? [data.school] : [];
          arr.forEach((item) => {
            if (typeof item === 'string' && item.trim()) names.add(item.trim());
            else if (item && (item.name || item.schoolName)) names.add((item.name || item.schoolName).trim());
          });
        });
        setAppSchoolNames(names);
      } catch (e) {
        console.error('users load error:', e);
      }
    })();
  }, []);

  /* ─── NEIS debounced search ─── */
  useEffect(() => {
    if (neisTimer.current) clearTimeout(neisTimer.current);
    if (neisQuery.trim().length < 2) {
      setNeisResults([]);
      setNeisOpen(false);
      return;
    }
    neisTimer.current = setTimeout(async () => {
      setNeisLoading(true);
      try {
        const rows = await searchNeis(neisQuery.trim());
        setNeisResults(rows);
        setNeisOpen(rows.length > 0);
      } catch {
        setNeisResults([]);
      } finally {
        setNeisLoading(false);
      }
    }, 400);
    return () => clearTimeout(neisTimer.current);
  }, [neisQuery]);

  /* ─── add from NEIS ─── */
  const handleNeisAdd = useCallback(
    async (row) => {
      const exists = schools.find(
        (sc) => sc.schoolCode === row.SD_SCHUL_CODE || sc.schoolName === row.SCHUL_NM,
      );
      if (exists) {
        showToast('이미 등록된 학교입니다.');
        setNeisOpen(false);
        setNeisQuery('');
        return;
      }
      try {
        await addDoc(collection(db, 'schools'), {
          ...mapNeisToSchool(row),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`"${row.SCHUL_NM}" 학교가 등록되었습니다.`);
      } catch (e) {
        console.error(e);
        showToast('학교 등록에 실패했습니다.');
      }
      setNeisOpen(false);
      setNeisQuery('');
    },
    [schools, showToast],
  );

  /* ─── manual add ─── */
  const handleManualAdd = useCallback(async () => {
    if (!form.schoolName.trim()) {
      showToast('학교명을 입력해주세요.');
      return;
    }
    try {
      await addDoc(collection(db, 'schools'), {
        schoolName: form.schoolName.trim(),
        schoolType: form.schoolType,
        region: form.region.trim(),
        address: form.address.trim(),
        officeCode: '',
        schoolCode: '',
        isActive: true,
        memberCount: 0,
        source: 'manual',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`"${form.schoolName.trim()}" 학교가 수동 등록되었습니다.`);
      setForm({ schoolName: '', schoolType: '초등학교', region: '', address: '' });
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      showToast('학교 등록에 실패했습니다.');
    }
  }, [form, showToast]);

  /* ─── toggle active ─── */
  const handleToggleActive = useCallback(
    async (school) => {
      try {
        await updateDoc(doc(db, 'schools', school.id), {
          isActive: !school.isActive,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error(e);
        showToast('상태 변경에 실패했습니다.');
      }
    },
    [showToast],
  );

  /* ─── delete ─── */
  const handleDelete = useCallback(
    async (school) => {
      if (!window.confirm(`"${school.schoolName}" 학교를 삭제하시겠습니까?`)) return;
      try {
        await deleteDoc(doc(db, 'schools', school.id));
        showToast(`"${school.schoolName}" 학교가 삭제되었습니다.`);
      } catch (e) {
        console.error(e);
        showToast('삭제에 실패했습니다.');
      }
    },
    [showToast],
  );

  /* ─── sync app schools ─── */
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      const namesFromUsers = new Set();
      userSnap.docs.forEach((d) => {
        const data = d.data();
        const arr = Array.isArray(data.schools) ? data.schools : data.school ? [data.school] : [];
        arr.forEach((item) => {
          if (typeof item === 'string' && item.trim()) namesFromUsers.add(item.trim());
          else if (item && (item.name || item.schoolName)) namesFromUsers.add((item.name || item.schoolName).trim());
        });
      });

      setAppSchoolNames(namesFromUsers);

      const existingNames = new Set(schools.map((sc) => sc.schoolName));
      const missing = [...namesFromUsers].filter((n) => !existingNames.has(n));

      let addedCount = 0;
      for (const name of missing) {
        let schoolData = {
          schoolName: name,
          schoolType: '',
          region: '',
          address: '',
          officeCode: '',
          schoolCode: '',
          isActive: true,
          memberCount: 0,
          source: 'neis',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        try {
          const rows = await searchNeis(name);
          if (rows.length > 0) {
            const match = rows.find((r) => r.SCHUL_NM === name) || rows[0];
            schoolData = {
              ...mapNeisToSchool(match),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
          }
        } catch {
          /* keep manual data */
        }

        await addDoc(collection(db, 'schools'), schoolData);
        addedCount++;
      }

      showToast(`동기화 완료: ${addedCount}개 학교가 추가되었습니다.`);
    } catch (e) {
      console.error(e);
      showToast('동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  }, [schools, showToast]);

  /* ─── computed ─── */
  const totalSchools = schools.length;
  const activeSchools = schools.filter((sc) => sc.isActive).length;
  const appUsedSchools = useMemo(() => {
    const registered = new Set(schools.map((sc) => sc.schoolName));
    return [...appSchoolNames].filter((n) => registered.has(n)).length;
  }, [schools, appSchoolNames]);

  const filtered = useMemo(() => {
    let list = [...schools];
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((sc) => (sc.schoolName || '').toLowerCase().includes(q));
    }
    if (filterType) list = list.filter((sc) => sc.schoolType === filterType);
    if (filterActive === 'true') list = list.filter((sc) => sc.isActive === true);
    if (filterActive === 'false') list = list.filter((sc) => sc.isActive === false);
    list.sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });
    return list;
  }, [schools, tableSearch, filterType, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [tableSearch, filterType, filterActive]);

  /* ─── render ─── */
  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.empty}>데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.container}>
        <div style={s.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* header */}
      <div style={s.header}>
        <h1 style={s.title}>학교 데이터 관리</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...s.btnOutline, opacity: syncing ? 0.6 : 1 }}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? '동기화 중...' : '앱 사용 학교 동기화'}
          </button>
          <button style={s.btnPrimary} onClick={() => setModalOpen(true)}>
            + 수동 등록
          </button>
        </div>
      </div>

      {/* stat cards */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={s.statValue}>{totalSchools}</div>
          <div style={s.statLabel}>전체 등록 학교 수</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statValue, color: ACCENT }}>{activeSchools}</div>
          <div style={s.statLabel}>활성 학교 수</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statValue, color: '#1a73e8' }}>{appUsedSchools}</div>
          <div style={s.statLabel}>앱 사용 학교 수</div>
        </div>
      </div>

      {/* NEIS search */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={s.neisWrapper}>
          <input
            style={s.neisInput}
            placeholder="NEIS 학교 검색 (2자 이상 입력)..."
            value={neisQuery}
            onChange={(e) => setNeisQuery(e.target.value)}
            onFocus={() => neisResults.length > 0 && setNeisOpen(true)}
            onBlur={() => setTimeout(() => setNeisOpen(false), 200)}
          />
          {neisLoading && (
            <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 13, color: '#888' }}>
              검색 중...
            </span>
          )}
          {neisOpen && neisResults.length > 0 && (
            <div style={s.neisDropdown}>
              {neisResults.map((row, i) => (
                <div
                  key={`${row.SD_SCHUL_CODE}-${i}`}
                  style={s.neisItem}
                  onMouseDown={() => handleNeisAdd(row)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f8fb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ fontWeight: 600 }}>{row.SCHUL_NM}</div>
                  <div style={s.neisItemSub}>
                    {row.SCHUL_KND_SC_NM} | {row.LCTN_SC_NM} | {row.ORG_RDNMA || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* table toolbar */}
      <div style={s.toolbar}>
        <div style={{ ...s.searchBox }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            style={s.input}
            placeholder="학교명 검색..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
        <select style={s.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">전체 유형</option>
          <option value="초등학교">초등학교</option>
          <option value="중학교">중학교</option>
          <option value="고등학교">고등학교</option>
          <option value="대학교">대학교</option>
        </select>
        <select style={s.select} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
        <span style={{ fontSize: 13, color: '#888', marginLeft: 'auto' }}>
          총 {filtered.length}개
        </span>
      </div>

      {/* table */}
      {filtered.length === 0 ? (
        <div style={s.empty}>조건에 맞는 학교가 없습니다.</div>
      ) : (
        <>
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>학교명</th>
                  <th style={s.th}>유형</th>
                  <th style={s.th}>지역</th>
                  <th style={s.th}>가입자수</th>
                  <th style={s.th}>출처</th>
                  <th style={s.th}>활성상태</th>
                  <th style={s.th}>등록일</th>
                  <th style={s.th}>액션</th>
                </tr>
              </thead>
              <tbody>
                {pagedData.map((school) => (
                  <tr key={school.id}>
                    <td style={s.td}>
                      <strong>{school.schoolName}</strong>
                    </td>
                    <td style={s.td}>{school.schoolType || '-'}</td>
                    <td style={s.td}>{school.region || '-'}</td>
                    <td style={s.td}>{school.memberCount ?? 0}명</td>
                    <td style={s.td}>
                      {school.source === 'neis' ? (
                        <span style={s.pillBlue}>NEIS</span>
                      ) : (
                        <span style={s.pillGray}>수동</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <button
                        style={s.toggle(school.isActive)}
                        onClick={() => handleToggleActive(school)}
                        title={school.isActive ? '활성' : '비활성'}
                      >
                        <span style={s.toggleKnob(school.isActive)} />
                      </button>
                    </td>
                    <td style={s.td}>{fmtDate(school.createdAt)}</td>
                    <td style={s.td}>
                      <button style={s.deleteBtn} onClick={() => handleDelete(school)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button
                style={s.pageBtn(false)}
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  return Math.abs(p - currentPage) <= 2;
                })
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`dots-${idx}`} style={{ color: '#999', fontSize: 13 }}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      style={s.pageBtn(item === currentPage)}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                style={s.pageBtn(false)}
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* manual add modal */}
      {modalOpen && (
        <div style={s.overlay} onClick={() => setModalOpen(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>학교 수동 등록</h2>

            <div style={s.formGroup}>
              <label style={s.formLabel}>학교명 *</label>
              <input
                style={s.formInput}
                placeholder="학교명을 입력하세요"
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>학교 유형</label>
              <select
                style={s.formSelect}
                value={form.schoolType}
                onChange={(e) => setForm((f) => ({ ...f, schoolType: e.target.value }))}
              >
                <option value="초등학교">초등학교</option>
                <option value="중학교">중학교</option>
                <option value="고등학교">고등학교</option>
                <option value="대학교">대학교</option>
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>지역</label>
              <input
                style={s.formInput}
                placeholder="예: 서울특별시"
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>주소</label>
              <input
                style={s.formInput}
                placeholder="상세 주소"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div style={s.modalActions}>
              <button style={s.btnGray} onClick={() => setModalOpen(false)}>
                취소
              </button>
              <button style={s.btnPrimary} onClick={handleManualAdd}>
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}
