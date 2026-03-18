export const getGraduationYear = (
  birthYear: number,
  schoolType: string
): number => {
  switch (schoolType) {
    case '초등학교': return birthYear + 13;
    case '중학교':   return birthYear + 16;
    case '고등학교': return birthYear + 19;
    case '대학교':   return birthYear + 23;
    default:         return birthYear + 19;
  }
};

export const BIRTH_YEAR_RANGE = {
  min: 1960,
  max: new Date().getFullYear() - 5,
};

export const getSchoolYears = (birthYear: number) => ({
  '초등학교': birthYear + 13,
  '중학교': birthYear + 16,
  '고등학교': birthYear + 19,
  '대학교': birthYear + 23,
});

export const validateGraduationYear = (
  birthYear: number,
  schoolType: string,
  graduationYear: number
): boolean => {
  const auto = getGraduationYear(birthYear, schoolType);
  return Math.abs(graduationYear - auto) <= 3;
};
