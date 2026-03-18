const NEIS_API_KEY = '0bb9dbfbdad641a2b029e7eb3380a758';
const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';

export interface NeisSchool {
  schoolName: string;
  schoolType: string;
  region: string;
  address: string;
  officeCode: string;
  schoolCode: string;
}

export async function searchSchools(query: string): Promise<NeisSchool[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${NEIS_BASE_URL}/schoolInfo?KEY=${NEIS_API_KEY}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodedQuery}`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = json?.schoolInfo?.[1]?.row;
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map((r: Record<string, string>) => ({
      schoolName: r.SCHUL_NM ?? '',
      schoolType: mapSchoolType(r.SCHUL_KND_SC_NM ?? ''),
      region: r.LCTN_SC_NM ?? '',
      address: r.ORG_RDNMA ?? '',
      officeCode: r.ATPT_OFCDC_SC_CODE ?? '',
      schoolCode: r.SD_SCHUL_CODE ?? '',
    }));
  } catch (e) {
    console.warn('[neisService] 검색 실패:', e);
    return [];
  }
}

function mapSchoolType(rawType: string): string {
  if (rawType.includes('초등')) return '초등학교';
  if (rawType.includes('중학')) return '중학교';
  if (rawType.includes('고등')) return '고등학교';
  if (rawType.includes('대학')) return '대학교';
  return rawType;
}

// schools 마스터 컬렉션에서 학교 검색 (관리자가 등록한 학교 우선)
export async function searchSchoolsFromMaster(query: string): Promise<NeisSchool[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const { collection, getDocs, query: fsQuery, where, limit: fsLimit } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    const q = fsQuery(
      collection(db, 'schools'),
      where('isActive', '==', true),
      fsLimit(100)
    );
    const snapshot = await getDocs(q);
    const lower = query.toLowerCase();
    return snapshot.docs
      .map(d => d.data() as NeisSchool)
      .filter(s => s.schoolName?.toLowerCase().includes(lower))
      .slice(0, 20);
  } catch (e) {
    console.warn('[neisService] 마스터 검색 실패:', e);
    return [];
  }
}
