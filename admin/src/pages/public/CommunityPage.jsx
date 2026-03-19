import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const S = {
  page: { minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  header: { borderBottom: '1px solid #eee', padding: '20px 0', marginBottom: 32 },
  headerInner: { maxWidth: 800, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12 },
  logo: { width: 36, height: 36, background: '#FF3124', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 },
  logoText: { fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  container: { maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' },
  title: { fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  meta: { fontSize: 13, color: '#999', marginBottom: 32 },
  content: { fontSize: 15, lineHeight: 1.9, color: '#333', whiteSpace: 'pre-wrap' },
  empty: { textAlign: 'center', padding: '80px 20px', color: '#999', fontSize: 15 },
  loading: { textAlign: 'center', padding: '80px 20px', color: '#999', fontSize: 14 },
  footer: { borderTop: '1px solid #eee', padding: '24px 0', textAlign: 'center', fontSize: 12, color: '#bbb' },
};

export default function CommunityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'policies', 'community')).then(snap => {
      if (snap.exists()) setData(snap.data());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const published = data?.status === 'published';
  const formatDate = (val) => {
    if (!val) return '';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>AS</div>
          <span style={S.logoText}>Again School</span>
        </div>
      </div>
      <div style={S.container}>
        {loading ? (
          <div style={S.loading}>로딩 중...</div>
        ) : !published ? (
          <div style={S.empty}>커뮤니티 가이드라인을 준비 중입니다.</div>
        ) : (
          <>
            <h1 style={S.title}>{data?.title || '커뮤니티 가이드라인'}</h1>
            <p style={S.meta}>
              {data?.version ? `버전 ${data.version}` : ''}
              {data?.publishedAt ? ` · ${formatDate(data.publishedAt)}` : ''}
            </p>
            <div style={S.content}>{data?.content}</div>
          </>
        )}
      </div>
      <div style={S.footer}>© 2025 Again School. All rights reserved.</div>
    </div>
  );
}
