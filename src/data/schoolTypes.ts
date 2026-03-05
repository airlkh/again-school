export interface SchoolTypeOption {
  value: '초등학교' | '중학교' | '고등학교' | '대학교';
  label: string;
}

export const SCHOOL_TYPES: SchoolTypeOption[] = [
  { value: '초등학교', label: '초등학교' },
  { value: '중학교', label: '중학교' },
  { value: '고등학교', label: '고등학교' },
  { value: '대학교', label: '대학교' },
];

export const GRADUATION_YEAR_MIN = 1980;
export const GRADUATION_YEAR_MAX = 2025;

export function getGraduationYears(): number[] {
  const years: number[] = [];
  for (let y = GRADUATION_YEAR_MAX; y >= GRADUATION_YEAR_MIN; y--) {
    years.push(y);
  }
  return years;
}
