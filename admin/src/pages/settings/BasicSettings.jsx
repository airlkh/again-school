import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_SETTINGS = {
  appName: '',
  description: '',
  maintenanceMode: false,
  appVersion: '',
  contactEmail: '',
};

export default function BasicSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', 'basic'));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
        }
      } catch (err) {
        console.error('기본 설정 로드 실패:', err);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'basic'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      setChanged(false);
      alert('저장되었습니다.');
    } catch (err) {
      console.error('기본 설정 저장 실패:', err);
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
          <h1 style={styles.title}>기본 설정</h1>
          <p style={styles.subtitle}>앱의 기본 정보를 설정합니다.</p>
        </div>
        <button
          style={{ ...styles.saveBtn, opacity: changed ? 1 : 0.5 }}
          onClick={handleSave}
          disabled={!changed || saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.formGroup}>
          <label style={styles.label}>앱 이름</label>
          <input
            style={styles.input}
            value={settings.appName}
            onChange={(e) => handleChange('appName', e.target.value)}
            placeholder="앱 이름을 입력하세요"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>앱 설명</label>
          <textarea
            style={styles.textarea}
            value={settings.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="앱에 대한 간단한 설명"
            rows={3}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>앱 버전</label>
          <input
            style={styles.input}
            value={settings.appVersion}
            onChange={(e) => handleChange('appVersion', e.target.value)}
            placeholder="예: 1.0.0"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>연락처 이메일</label>
          <input
            style={styles.input}
            type="email"
            value={settings.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            placeholder="contact@example.com"
          />
        </div>

        <div style={styles.divider} />

        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>점검 모드</div>
            <div style={styles.toggleDesc}>
              활성화하면 사용자에게 점검 안내 화면이 표시됩니다.
            </div>
          </div>
          <button
            style={{
              ...styles.toggle,
              backgroundColor: settings.maintenanceMode ? '#e53e3e' : '#cbd5e0',
            }}
            onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: settings.maintenanceMode ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
        {settings.maintenanceMode && (
          <div style={styles.warningBanner}>
            점검 모드가 활성화되어 있습니다. 사용자가 앱에 접근할 수 없습니다.
          </div>
        )}
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
    padding: '24px 28px',
  },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  divider: { height: 1, backgroundColor: '#e2e8f0', margin: '24px 0' },
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
  warningBanner: {
    marginTop: 16,
    padding: '12px 16px',
    backgroundColor: '#fde8e8',
    color: '#c53030',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
  },
};
