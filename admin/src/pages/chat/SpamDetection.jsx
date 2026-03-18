import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

const styles = {
  container: {
    padding: '24px 32px',
    backgroundColor: '#f5f5f8',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
    borderBottom: '2px solid #eee',
  },
  tab: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#888',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: '#1a1a2e',
    borderBottomColor: '#e94560',
  },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '16px 20px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    width: 260,
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    backgroundColor: '#fff',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnDanger: { backgroundColor: '#e94560', color: '#fff' },
  btnSuccess: { backgroundColor: '#2e7d32', color: '#fff' },
  btnWarning: { backgroundColor: '#f5a623', color: '#fff' },
  btnSmall: { padding: '5px 10px', fontSize: 12 },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d8',
    color: '#555',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    borderBottom: '2px solid #eee',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
  actions: { display: 'flex', gap: 6 },
  emptyRow: {
    padding: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  spamBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
  },
  ruleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleInfo: { flex: 1 },
  ruleName: { fontSize: 14, fontWeight: 700, color: '#1a1a2e' },
  ruleDesc: { fontSize: 12, color: '#888', marginTop: 4 },
  ruleStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 3,
    transition: 'left 0.2s',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 },
  formRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 },
  label: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  textarea: {
    padding: '8px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    minHeight: 60,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
};

export default function SpamDetection() {
  const [activeTab, setActiveTab] = useState('flagged');
  const [flaggedItems, setFlaggedItems] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name: '', description: '', pattern: '', enabled: true });

  const fetchFlaggedItems = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'spamFlagged'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFlaggedItems(data);
    } catch (err) {
      console.error('스팸 플래그 로드 실패:', err);
    }
    setLoading(false);
  };

  const fetchRules = async () => {
    try {
      const q = query(collection(db, 'spamRules'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRules(data);
    } catch (err) {
      console.error('스팸 규칙 로드 실패:', err);
    }
  };

  useEffect(() => {
    fetchFlaggedItems();
    fetchRules();
  }, []);

  const handleMarkSpam = async (itemId) => {
    try {
      await updateDoc(doc(db, 'spamFlagged', itemId), { confirmed: true, updatedAt: Timestamp.now() });
      setFlaggedItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, confirmed: true } : i))
      );
    } catch (err) {
      console.error('스팸 확인 실패:', err);
    }
  };

  const handleMarkNotSpam = async (itemId) => {
    try {
      await updateDoc(doc(db, 'spamFlagged', itemId), { confirmed: false, dismissed: true, updatedAt: Timestamp.now() });
      setFlaggedItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, confirmed: false, dismissed: true } : i))
      );
    } catch (err) {
      console.error('스팸 해제 실패:', err);
    }
  };

  const handleDeleteFlagged = async (itemId) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'spamFlagged', itemId));
      setFlaggedItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  const handleToggleRule = async (ruleId, currentEnabled) => {
    try {
      await updateDoc(doc(db, 'spamRules', ruleId), { enabled: !currentEnabled });
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, enabled: !currentEnabled } : r))
      );
    } catch (err) {
      console.error('규칙 상태 변경 실패:', err);
    }
  };

  const handleAddRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.pattern.trim()) {
      alert('규칙 이름과 패턴을 입력해주세요.');
      return;
    }
    try {
      const ruleData = {
        ...ruleForm,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'spamRules'), ruleData);
      setRules((prev) => [{ id: docRef.id, ...ruleData }, ...prev]);
      setRuleForm({ name: '', description: '', pattern: '', enabled: true });
      setShowRuleForm(false);
    } catch (err) {
      console.error('규칙 추가 실패:', err);
      alert('규칙 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('이 규칙을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'spamRules', ruleId));
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error('규칙 삭제 실패:', err);
    }
  };

  const filteredItems = flaggedItems.filter((item) => {
    if (statusFilter === 'spam' && !item.confirmed) return false;
    if (statusFilter === 'notSpam' && !item.dismissed) return false;
    if (statusFilter === 'pending' && (item.confirmed || item.dismissed)) return false;
    if (search) {
      const s = search.toLowerCase();
      const user = (item.userName || item.userId || '').toLowerCase();
      const content = (item.content || item.message || '').toLowerCase();
      if (!user.includes(s) && !content.includes(s)) return false;
    }
    return true;
  });

  const totalFlagged = flaggedItems.length;
  const confirmedSpam = flaggedItems.filter((i) => i.confirmed).length;
  const pendingReview = flaggedItems.filter((i) => !i.confirmed && !i.dismissed).length;
  const activeRules = rules.filter((r) => r.enabled).length;

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
        <h1 style={styles.title}>스팸/이상행동 탐지</h1>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>탐지된 항목</div>
          <div style={styles.statValue}>{totalFlagged}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>스팸 확인</div>
          <div style={{ ...styles.statValue, color: '#c62828' }}>{confirmedSpam}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>검토 대기</div>
          <div style={{ ...styles.statValue, color: '#e65100' }}>{pendingReview}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>활성 규칙</div>
          <div style={{ ...styles.statValue, color: '#2e7d32' }}>{activeRules}</div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'flagged' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('flagged')}
        >
          탐지된 메시지/사용자
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'rules' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('rules')}
        >
          탐지 규칙 관리
        </button>
      </div>

      {activeTab === 'flagged' && (
        <>
          <div style={styles.filterBar}>
            <input
              style={styles.searchInput}
              placeholder="사용자 또는 내용 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="pending">검토 대기</option>
              <option value="spam">스팸 확인</option>
              <option value="notSpam">스팸 아님</option>
            </select>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>사용자</th>
                <th style={styles.th}>내용</th>
                <th style={styles.th}>탐지 사유</th>
                <th style={styles.th}>탐지일</th>
                <th style={styles.th}>상태</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.emptyRow} colSpan={6}>로딩 중...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td style={styles.emptyRow} colSpan={6}>탐지된 항목이 없습니다.</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{item.userName || '-'}</div>
                      <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
                        {item.userId || ''}
                      </div>
                    </td>
                    <td style={styles.td}>{truncate(item.content || item.message)}</td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 12, color: '#888' }}>
                        {item.reason || item.detectionRule || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(item.createdAt)}</td>
                    <td style={styles.td}>
                      {item.confirmed ? (
                        <span style={{ ...styles.spamBadge, backgroundColor: '#ffebee', color: '#c62828' }}>
                          스팸 확인
                        </span>
                      ) : item.dismissed ? (
                        <span style={{ ...styles.spamBadge, backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                          스팸 아님
                        </span>
                      ) : (
                        <span style={{ ...styles.spamBadge, backgroundColor: '#fff3e0', color: '#e65100' }}>
                          검토 대기
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {!item.confirmed && !item.dismissed && (
                          <>
                            <button
                              style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                              onClick={() => handleMarkSpam(item.id)}
                            >
                              스팸
                            </button>
                            <button
                              style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSmall }}
                              onClick={() => handleMarkNotSpam(item.id)}
                            >
                              정상
                            </button>
                          </>
                        )}
                        <button
                          style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSmall }}
                          onClick={() => handleDeleteFlagged(item.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}

      {activeTab === 'rules' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => setShowRuleForm(true)}
            >
              + 새 규칙 추가
            </button>
          </div>

          {showRuleForm && (
            <div style={styles.formCard}>
              <div style={styles.formTitle}>새 탐지 규칙 추가</div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <span style={styles.label}>규칙 이름</span>
                  <input
                    style={styles.input}
                    placeholder="예: 반복 메시지 탐지"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  />
                </div>
                <div style={styles.formGroup}>
                  <span style={styles.label}>탐지 패턴 (정규식 또는 키워드)</span>
                  <input
                    style={styles.input}
                    placeholder="예: (http|www\\.).*\\.(com|kr)"
                    value={ruleForm.pattern}
                    onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <span style={styles.label}>설명</span>
                <textarea
                  style={styles.textarea}
                  placeholder="이 규칙에 대한 설명"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleAddRule}>
                  규칙 추가
                </button>
                <button
                  style={{ ...styles.btn, ...styles.btnOutline }}
                  onClick={() => setShowRuleForm(false)}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {rules.length === 0 ? (
            <div style={{ ...styles.formCard, textAlign: 'center', color: '#999', padding: 40 }}>
              등록된 탐지 규칙이 없습니다.
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} style={styles.ruleCard}>
                <div style={styles.ruleInfo}>
                  <div style={styles.ruleName}>{rule.name || '-'}</div>
                  <div style={styles.ruleDesc}>{rule.description || '-'}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, fontFamily: 'monospace' }}>
                    패턴: {rule.pattern || '-'}
                  </div>
                </div>
                <div style={styles.ruleStatus}>
                  <button
                    style={{
                      ...styles.toggle,
                      backgroundColor: rule.enabled ? '#e94560' : '#ccc',
                    }}
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                  >
                    <div
                      style={{
                        ...styles.toggleDot,
                        left: rule.enabled ? 23 : 3,
                      }}
                    />
                  </button>
                  <span style={{ fontSize: 12, color: rule.enabled ? '#e94560' : '#999' }}>
                    {rule.enabled ? '활성' : '비활성'}
                  </span>
                  <button
                    style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSmall, marginLeft: 8 }}
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
