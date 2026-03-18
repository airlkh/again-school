import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Search, ArrowUpDown, Building2 } from 'lucide-react';

const styles = {
  container: {
    padding: '32px',
    maxWidth: 1200,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 14px',
    backgroundColor: '#fff',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#333',
    width: 240,
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 10,
    border: '1px solid #eee',
    padding: '18px 20px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  tableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  },
  thInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  td: {
    padding: '14px 18px',
    fontSize: 14,
    color: '#333',
    borderBottom: '1px solid #f5f5f5',
  },
  schoolIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f0f5',
    marginRight: 10,
    verticalAlign: 'middle',
  },
  countBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '60px 0',
    fontSize: 15,
  },
};

export default function SchoolData() {
  const [schoolMap, setSchoolMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('count');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const map = {};

        snapshot.docs.forEach((d) => {
          const data = d.data();
          const schools = Array.isArray(data.schools)
            ? data.schools
            : data.school
            ? [data.school]
            : [];

          schools.forEach((s) => {
            if (typeof s === 'string' && s.trim()) {
              const name = s.trim();
              if (!map[name]) {
                map[name] = {
                  name,
                  type: data.schoolType || '-',
                  region: data.region || '-',
                  count: 0,
                };
              }
              map[name].count += 1;
            } else if (typeof s === 'object' && s !== null) {
              const name = (s.name || s.schoolName || '').trim();
              if (name) {
                if (!map[name]) {
                  map[name] = {
                    name,
                    type: s.type || s.schoolType || data.schoolType || '-',
                    region: s.region || data.region || '-',
                    count: 0,
                  };
                }
                map[name].count += 1;
              }
            }
          });
        });

        setSchoolMap(map);
      } catch (err) {
        console.error('학교 데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const schoolList = useMemo(() => {
    let list = Object.values(schoolMap);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(term));
    }

    list.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [schoolMap, searchTerm, sortKey, sortAsc]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const totalSchools = Object.keys(schoolMap).length;
  const totalRegistered = Object.values(schoolMap).reduce((sum, s) => sum + s.count, 0);

  if (loading) {
    return <div style={styles.empty}>데이터를 불러오는 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>학교 데이터 관리</h1>
        <div style={styles.searchBox}>
          <Search style={{ width: 16, height: 16, color: '#999' }} />
          <input
            type="text"
            placeholder="학교 이름 검색..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalSchools}</div>
          <div style={styles.statLabel}>등록 학교 수</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalRegistered}</div>
          <div style={styles.statLabel}>전체 등록 인원</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {totalSchools > 0 ? (totalRegistered / totalSchools).toFixed(1) : 0}
          </div>
          <div style={styles.statLabel}>학교당 평균 인원</div>
        </div>
      </div>

      {schoolList.length === 0 ? (
        <div style={styles.empty}>등록된 학교 데이터가 없습니다.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} onClick={() => handleSort('name')}>
                  <div style={styles.thInner}>
                    학교명
                    <ArrowUpDown style={{ width: 14, height: 14, opacity: 0.4 }} />
                  </div>
                </th>
                <th style={styles.th} onClick={() => handleSort('type')}>
                  <div style={styles.thInner}>
                    유형
                    <ArrowUpDown style={{ width: 14, height: 14, opacity: 0.4 }} />
                  </div>
                </th>
                <th style={styles.th} onClick={() => handleSort('region')}>
                  <div style={styles.thInner}>
                    지역
                    <ArrowUpDown style={{ width: 14, height: 14, opacity: 0.4 }} />
                  </div>
                </th>
                <th style={styles.th} onClick={() => handleSort('count')}>
                  <div style={styles.thInner}>
                    등록 인원
                    <ArrowUpDown style={{ width: 14, height: 14, opacity: 0.4 }} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {schoolList.map((school) => (
                <tr key={school.name}>
                  <td style={styles.td}>
                    <span style={styles.schoolIcon}>
                      <Building2 style={{ width: 16, height: 16, color: '#888' }} />
                    </span>
                    <strong>{school.name}</strong>
                  </td>
                  <td style={styles.td}>{school.type}</td>
                  <td style={styles.td}>{school.region}</td>
                  <td style={styles.td}>
                    <span style={styles.countBadge}>{school.count}명</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
