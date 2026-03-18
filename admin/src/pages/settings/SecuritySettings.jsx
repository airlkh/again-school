import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_SETTINGS = {
  loginAttemptLimit: 5,
  lockoutDuration: 30,
  sessionTimeout: 60,
  ipWhitelist: [],
  twoFactorAuth: false,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
  apiRateLimit: 100,
  apiRateWindow: 60,
};

export default function SecuritySettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', 'security'));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
        }
      } catch (err) {
        console.error('보안 설정 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setChanged(true);
  };

  const addIp = () => {
    if (!newIp.trim()) return;
    const list = [...(settings.ipWhitelist || []), newIp.trim()];
    handleChange('ipWhitelist', list);
    setNewIp('');
  };

  const removeIp = (idx) => {
    const list = [...(settings.ipWhitelist || [])];
    list.splice(idx, 1);
    handleChange('ipWhitelist', list);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'security'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setChanged(false);
      alert('저장되었습니다.');
    } catch (err) {
      console.error('보안 설정 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>보안 설정</h1>
          <p style={styles.subtitle}>로그인, 세션, 비밀번호 정책 및 API 제한을 설정합니다.</p>
        </div>
        <button
          style={{ ...styles.saveBtn, opacity: changed ? 1 : 0.5 }}
          onClick={handleSave}
          disabled={!changed || saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 로그인 제한 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>로그인 제한</h3>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>최대 로그인 시도 횟수</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 80 }}
                type="number"
                min={1}
                value={settings.loginAttemptLimit}
                onChange={(e) => handleChange('loginAttemptLimit', parseInt(e.target.value) || 1)}
              />
              <span style={styles.unit}>회</span>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>계정 잠금 시간</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 80 }}
                type="number"
                min={1}
                value={settings.lockoutDuration}
                onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value) || 1)}
              />
              <span style={styles.unit}>분</span>
            </div>
          </div>
        </div>
      </div>

      {/* 세션 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>세션 관리</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>세션 타임아웃</label>
          <div style={styles.inlineInput}>
            <input
              style={{ ...styles.input, width: 80 }}
              type="number"
              min={1}
              value={settings.sessionTimeout}
              onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value) || 1)}
            />
            <span style={styles.unit}>분 (비활동 시 자동 로그아웃)</span>
          </div>
        </div>
      </div>

      {/* 2FA */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>2단계 인증 (2FA)</h3>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>2단계 인증 필수화</div>
            <div style={styles.toggleDesc}>
              모든 관리자 계정에 2단계 인증을 필수로 요구합니다.
            </div>
          </div>
          <button
            style={{
              ...styles.toggle,
              backgroundColor: settings.twoFactorAuth ? '#48bb78' : '#cbd5e0',
            }}
            onClick={() => handleChange('twoFactorAuth', !settings.twoFactorAuth)}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: settings.twoFactorAuth ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
      </div>

      {/* 비밀번호 정책 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>비밀번호 정책</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>최소 비밀번호 길이</label>
          <div style={styles.inlineInput}>
            <input
              style={{ ...styles.input, width: 80 }}
              type="number"
              min={4}
              value={settings.passwordMinLength}
              onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value) || 8)}
            />
            <span style={styles.unit}>자 이상</span>
          </div>
        </div>
        <div style={styles.checkboxGrid}>
          <label style={styles.checkboxItem}>
            <input
              type="checkbox"
              checked={settings.passwordRequireUppercase}
              onChange={() => handleChange('passwordRequireUppercase', !settings.passwordRequireUppercase)}
            />
            <span>대문자 포함 필수</span>
          </label>
          <label style={styles.checkboxItem}>
            <input
              type="checkbox"
              checked={settings.passwordRequireLowercase}
              onChange={() => handleChange('passwordRequireLowercase', !settings.passwordRequireLowercase)}
            />
            <span>소문자 포함 필수</span>
          </label>
          <label style={styles.checkboxItem}>
            <input
              type="checkbox"
              checked={settings.passwordRequireNumber}
              onChange={() => handleChange('passwordRequireNumber', !settings.passwordRequireNumber)}
            />
            <span>숫자 포함 필수</span>
          </label>
          <label style={styles.checkboxItem}>
            <input
              type="checkbox"
              checked={settings.passwordRequireSpecial}
              onChange={() => handleChange('passwordRequireSpecial', !settings.passwordRequireSpecial)}
            />
            <span>특수문자 포함 필수</span>
          </label>
        </div>
      </div>

      {/* IP 화이트리스트 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>IP 화이트리스트</h3>
        <p style={styles.sectionDesc}>허용된 IP에서만 관리자 페이지에 접근할 수 있습니다. 비워두면 모든 IP를 허용합니다.</p>
        <div style={styles.tagInputRow}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="예: 192.168.1.0/24"
            onKeyDown={(e) => e.key === 'Enter' && addIp()}
          />
          <button style={styles.addTagBtn} onClick={addIp}>추가</button>
        </div>
        <div style={styles.tags}>
          {(settings.ipWhitelist || []).map((ip, i) => (
            <span key={i} style={styles.tag}>
              {ip}
              <button style={styles.tagRemove} onClick={() => removeIp(i)}>x</button>
            </span>
          ))}
          {(settings.ipWhitelist || []).length === 0 && (
            <span style={styles.noTags}>모든 IP 허용 중</span>
          )}
        </div>
      </div>

      {/* API Rate Limit */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>API 요청 제한</h3>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>최대 요청 수</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 80 }}
                type="number"
                min={1}
                value={settings.apiRateLimit}
                onChange={(e) => handleChange('apiRateLimit', parseInt(e.target.value) || 1)}
              />
              <span style={styles.unit}>회</span>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>시간 윈도우</label>
            <div style={styles.inlineInput}>
              <input
                style={{ ...styles.input, width: 80 }}
                type="number"
                min={1}
                value={settings.apiRateWindow}
                onChange={(e) => handleChange('apiRateWindow', parseInt(e.target.value) || 1)}
              />
              <span style={styles.unit}>초</span>
            </div>
          </div>
        </div>
        <p style={styles.rateDesc}>
          {settings.apiRateWindow}초 내에 최대 {settings.apiRateLimit}회 요청 허용
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    maxWidth: 800,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1a202c', margin: '0 0 12px 0' },
  sectionDesc: { fontSize: 13, color: '#718096', margin: '-8px 0 12px 0' },
  formRow: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 },
  input: {
    padding: '9px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  inlineInput: { display: 'flex', alignItems: 'center', gap: 8 },
  unit: { fontSize: 14, color: '#4a5568' },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: '#2d3748' },
  toggleDesc: { fontSize: 13, color: '#718096', marginTop: 2 },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#2d3748',
    cursor: 'pointer',
  },
  tagInputRow: { display: 'flex', gap: 8, marginBottom: 10 },
  addTagBtn: {
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 13,
    backgroundColor: '#edf2f7',
    color: '#2d3748',
    fontFamily: 'monospace',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    lineHeight: 1,
  },
  noTags: { fontSize: 13, color: '#a0aec0' },
  rateDesc: {
    fontSize: 13,
    color: '#718096',
    margin: '4px 0 0 0',
    fontStyle: 'italic',
  },
};
