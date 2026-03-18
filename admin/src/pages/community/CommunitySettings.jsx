import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SETTINGS_DOC = 'community';

const defaultSettings = {
  minPostLength: 10,
  allowComments: true,
  filterKeywords: '',
  newMemberPostRestrictionDays: 0,
  maxPostsPerDay: 0,
  allowImageUpload: true,
  allowAnonymousPost: false,
  autoHideReportThreshold: 5,
};

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
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: '1px solid #eee',
  },
  formGroup: {
    marginBottom: 20,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
  },
  labelCol: {
    width: 200,
    flexShrink: 0,
    paddingTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    display: 'block',
  },
  labelDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  inputCol: {
    flex: 1,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  numberInput: {
    width: 120,
    padding: '10px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d0d0d8',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    minHeight: 80,
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
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
  btn: {
    padding: '10px 24px',
    borderRadius: 6,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: { backgroundColor: '#1a1a2e', color: '#fff' },
  btnOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d8',
    color: '#555',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  successMsg: {
    padding: '10px 16px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  unit: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
    paddingTop: 10,
  },
};

export default function CommunitySettings() {
  const [settings, setSettings] = useState({ ...defaultSettings });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC));
        if (snap.exists()) {
          setSettings({ ...defaultSettings, ...snap.data() });
        }
      } catch (err) {
        console.error('설정 로드 실패:', err);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'settings', SETTINGS_DOC), {
        ...settings,
        updatedAt: new Date(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('설정 저장 실패:', err);
      alert('설정 저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (window.confirm('기본값으로 초기화하시겠습니까?')) {
      setSettings({ ...defaultSettings });
    }
  };

  const updateField = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const ToggleSwitch = ({ value, onChange }) => (
    <div style={styles.toggleRow}>
      <button
        style={{ ...styles.toggle, backgroundColor: value ? '#e94560' : '#ccc' }}
        onClick={() => onChange(!value)}
      >
        <div style={{ ...styles.toggleDot, left: value ? 23 : 3 }} />
      </button>
      <span style={{ fontSize: 13, color: '#555' }}>{value ? '활성' : '비활성'}</span>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>커뮤니티 운영 설정</h1>
        </div>
        <div style={styles.card}>
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>커뮤니티 운영 설정</h1>
      </div>

      {saved && (
        <div style={styles.successMsg}>설정이 성공적으로 저장되었습니다.</div>
      )}

      {/* 게시글 설정 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>게시글 설정</div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>게시글 최소 글자수</span>
            <span style={styles.labelDesc}>게시글 작성 시 최소 글자수를 설정합니다</span>
          </div>
          <div style={styles.inputCol}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                style={styles.numberInput}
                value={settings.minPostLength}
                onChange={(e) => updateField('minPostLength', Number(e.target.value))}
                min={0}
              />
              <span style={styles.unit}>글자</span>
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>1일 최대 게시글 수</span>
            <span style={styles.labelDesc}>0 = 무제한</span>
          </div>
          <div style={styles.inputCol}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                style={styles.numberInput}
                value={settings.maxPostsPerDay}
                onChange={(e) => updateField('maxPostsPerDay', Number(e.target.value))}
                min={0}
              />
              <span style={styles.unit}>건</span>
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>이미지 업로드 허용</span>
          </div>
          <div style={styles.inputCol}>
            <ToggleSwitch
              value={settings.allowImageUpload}
              onChange={(v) => updateField('allowImageUpload', v)}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>익명 게시 허용</span>
          </div>
          <div style={styles.inputCol}>
            <ToggleSwitch
              value={settings.allowAnonymousPost}
              onChange={(v) => updateField('allowAnonymousPost', v)}
            />
          </div>
        </div>
      </div>

      {/* 댓글 설정 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>댓글 설정</div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>댓글 허용 여부</span>
            <span style={styles.labelDesc}>비활성 시 모든 게시글에 댓글 불가</span>
          </div>
          <div style={styles.inputCol}>
            <ToggleSwitch
              value={settings.allowComments}
              onChange={(v) => updateField('allowComments', v)}
            />
          </div>
        </div>
      </div>

      {/* 자동 필터링 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>자동 필터링</div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>필터링 키워드</span>
            <span style={styles.labelDesc}>쉼표(,)로 구분하여 입력</span>
          </div>
          <div style={styles.inputCol}>
            <textarea
              style={styles.textarea}
              placeholder="예: 욕설1, 욕설2, 스팸키워드"
              value={settings.filterKeywords}
              onChange={(e) => updateField('filterKeywords', e.target.value)}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>자동 숨김 신고 기준</span>
            <span style={styles.labelDesc}>해당 횟수 이상 신고 시 자동 숨김</span>
          </div>
          <div style={styles.inputCol}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                style={styles.numberInput}
                value={settings.autoHideReportThreshold}
                onChange={(e) => updateField('autoHideReportThreshold', Number(e.target.value))}
                min={1}
              />
              <span style={styles.unit}>회</span>
            </div>
          </div>
        </div>
      </div>

      {/* 가입 제한 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>신규 회원 제한</div>

        <div style={styles.formGroup}>
          <div style={styles.labelCol}>
            <span style={styles.label}>신규회원 게시 제한일수</span>
            <span style={styles.labelDesc}>가입 후 해당 일수 경과 전까지 게시 제한 (0 = 제한 없음)</span>
          </div>
          <div style={styles.inputCol}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                style={styles.numberInput}
                value={settings.newMemberPostRestrictionDays}
                onChange={(e) => updateField('newMemberPostRestrictionDays', Number(e.target.value))}
                min={0}
              />
              <span style={styles.unit}>일</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          style={{ ...styles.btn, ...styles.btnOutline }}
          onClick={handleReset}
        >
          기본값 초기화
        </button>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
