import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  Bell,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const containerStyle = {
  padding: '32px',
  maxWidth: 1200,
  margin: '0 auto',
};

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const filterBtnStyle = (active) => ({
  padding: '6px 14px',
  borderRadius: 8,
  border: 'none',
  background: active ? '#111827' : '#f3f4f6',
  color: active ? '#fff' : '#6b7280',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const alertTypeConfig = {
  warning: {
    icon: <AlertTriangle size={18} />,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    label: '경고',
  },
  info: {
    icon: <Info size={18} />,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    label: '안내',
  },
  error: {
    icon: <XCircle size={18} />,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    label: '오류',
  },
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState([]);
  const [computedAlerts, setComputedAlerts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, warning, info, error, unread
  const [firestoreAlertIds, setFirestoreAlertIds] = useState(new Set());

  // Firestore adminAlerts 컬렉션 실시간 구독
  useEffect(() => {
    let unsub;
    try {
      const q = query(collection(db, 'adminAlerts'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(
        q,
        (snap) => {
          const items = [];
          const ids = new Set();
          snap.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data(), source: 'firestore' });
            ids.add(docSnap.id);
          });
          setAlerts(items);
          setFirestoreAlertIds(ids);
        },
        () => {
          // adminAlerts 컬렉션이 없는 경우 빈 배열
          setAlerts([]);
          setFirestoreAlertIds(new Set());
        }
      );
    } catch {
      setAlerts([]);
    }

    return () => unsub && unsub();
  }, []);

  // 사용자/신고에서 자동 생성되는 알림 (fallback computed alerts)
  useEffect(() => {
    const unsubs = [];

    // 선생님 인증 대기 알림
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const pending = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.teacherVerification === 'pending') {
          pending.push({
            id: `verify-${docSnap.id}`,
            type: 'warning',
            title: '선생님 인증 대기',
            message: `${data.displayName || data.name || data.email || docSnap.id}님의 선생님 인증 요청이 대기중입니다.`,
            createdAt: data.teacherVerificationRequestedAt || data.createdAt || null,
            read: false,
            source: 'computed',
            category: 'verification',
          });
        }
      });

      // 신고 대기 알림
      const unsubReports = onSnapshot(
        collection(db, 'reports'),
        (reportSnap) => {
          const reportAlerts = [];
          reportSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'pending') {
              reportAlerts.push({
                id: `report-${docSnap.id}`,
                type: 'error',
                title: '미처리 신고',
                message: `"${data.reason || '(사유 미기재)'}" - ${data.targetName || data.targetId || '대상 미확인'}에 대한 신고가 처리되지 않았습니다.`,
                createdAt: data.createdAt || null,
                read: false,
                source: 'computed',
                category: 'report',
              });
            }
          });

          // 총 대기 건수 요약 알림
          const summaryAlerts = [];
          if (pending.length > 0) {
            summaryAlerts.push({
              id: 'summary-verification',
              type: 'info',
              title: '인증 대기 현황',
              message: `현재 ${pending.length}건의 선생님 인증 요청이 대기중입니다.`,
              createdAt: { toDate: () => new Date() },
              read: false,
              source: 'computed',
              category: 'summary',
            });
          }
          if (reportAlerts.length > 0) {
            summaryAlerts.push({
              id: 'summary-reports',
              type: 'info',
              title: '신고 대기 현황',
              message: `현재 ${reportAlerts.length}건의 미처리 신고가 있습니다.`,
              createdAt: { toDate: () => new Date() },
              read: false,
              source: 'computed',
              category: 'summary',
            });
          }

          setComputedAlerts([...pending, ...reportAlerts, ...summaryAlerts]);
        },
        () => {
          setComputedAlerts(pending);
        }
      );

      unsubs.push(unsubReports);
    });

    unsubs.push(unsubUsers);

    return () => unsubs.forEach((fn) => fn && fn());
  }, []);

  // Firestore 알림 + computed 알림 병합 (중복 제거)
  const allAlerts = useMemo(() => {
    const merged = [...alerts];

    // Firestore에 없는 computed 알림만 추가
    computedAlerts.forEach((ca) => {
      if (!firestoreAlertIds.has(ca.id)) {
        merged.push(ca);
      }
    });

    // 정렬: 최신순
    merged.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() || new Date(0);
      const tb = b.createdAt?.toDate?.() || new Date(0);
      return tb - ta;
    });

    return merged;
  }, [alerts, computedAlerts, firestoreAlertIds]);

  // 필터링
  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return allAlerts;
    if (filter === 'unread') return allAlerts.filter((a) => !a.read);
    return allAlerts.filter((a) => a.type === filter);
  }, [allAlerts, filter]);

  // 읽음 처리
  const markAsRead = async (alert) => {
    if (alert.source === 'firestore') {
      try {
        await updateDoc(doc(db, 'adminAlerts', alert.id), { read: true });
      } catch (err) {
        console.error('읽음 처리 실패:', err);
      }
    } else {
      // computed 알림은 로컬 상태만 업데이트
      setComputedAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a))
      );
    }
  };

  // 전체 읽음 처리
  const markAllAsRead = async () => {
    // Firestore 알림 일괄 처리
    for (const alert of alerts.filter((a) => !a.read)) {
      try {
        await updateDoc(doc(db, 'adminAlerts', alert.id), { read: true });
      } catch {
        // 개별 오류 무시
      }
    }
    // computed 알림 로컬 처리
    setComputedAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const unreadCount = allAlerts.filter((a) => !a.read).length;

  const formatAlertTime = (timestamp) => {
    if (!timestamp?.toDate) return '-';
    try {
      return format(timestamp.toDate(), 'yyyy.MM.dd HH:mm', { locale: ko });
    } catch {
      return '-';
    }
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>운영 알림 센터</h1>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                minWidth: 22,
                textAlign: 'center',
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={markAllAsRead}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
            color: '#374151',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <CheckCheck size={16} />
          전체 읽음 처리
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button style={filterBtnStyle(filter === 'all')} onClick={() => setFilter('all')}>
          전체 ({allAlerts.length})
        </button>
        <button style={filterBtnStyle(filter === 'unread')} onClick={() => setFilter('unread')}>
          읽지 않음 ({unreadCount})
        </button>
        <button style={filterBtnStyle(filter === 'warning')} onClick={() => setFilter('warning')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={14} /> 경고
          </span>
        </button>
        <button style={filterBtnStyle(filter === 'info')} onClick={() => setFilter('info')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Info size={14} /> 안내
          </span>
        </button>
        <button style={filterBtnStyle(filter === 'error')} onClick={() => setFilter('error')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={14} /> 오류
          </span>
        </button>
      </div>

      {/* 알림 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredAlerts.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 48 }}>
            <Bell size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
            <p style={{ color: '#9ca3af', fontSize: 15 }}>알림이 없습니다.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = alertTypeConfig[alert.type] || alertTypeConfig.info;
            return (
              <div
                key={alert.id}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${config.color}`,
                  opacity: alert.read ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '18px 20px',
                  transition: 'opacity 0.2s',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: config.bg,
                    color: config.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {config.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: config.color,
                        background: config.bg,
                        padding: '1px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {config.label}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                      {alert.title}
                    </span>
                    {!alert.read && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: '#6b7280',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {alert.message}
                  </p>
                  <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, display: 'block' }}>
                    {formatAlertTime(alert.createdAt)}
                  </span>
                </div>
                {!alert.read && (
                  <button
                    onClick={() => markAsRead(alert)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      background: '#fff',
                      color: '#6b7280',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                    title="읽음 처리"
                  >
                    <Check size={14} />
                    읽음
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
