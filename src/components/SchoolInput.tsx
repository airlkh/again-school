import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SchoolEntry } from '../types/auth';
import { SCHOOL_TYPES, getGraduationYears } from '../data/schoolTypes';
import { searchSchools, searchSchoolsFromMaster, NeisSchool } from '../services/neisService';

import { getGraduationYear } from '../utils/graduationYear';

interface SchoolInputProps {
  schools: SchoolEntry[];
  onSchoolsChange: (schools: SchoolEntry[]) => void;
  birthYear?: number;
}

export function SchoolInput({ schools, onSchoolsChange, birthYear }: SchoolInputProps) {
  const { colors, isDark } = useTheme();
  const [isAdding, setIsAdding] = useState(schools.length === 0);
  const [schoolType, setSchoolType] =
    useState<SchoolEntry['schoolType']>('고등학교');
  const [schoolName, setSchoolName] = useState('');
  const [graduationYear, setGraduationYear] = useState(2010);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NeisSchool[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeHighlightBg = isDark ? 'rgba(232,49,58,0.15)' : '#fef2f2';

  function onSearchChange(text: string) {
    setSearchQuery(text);
    setSchoolName(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (schoolType === '대학교') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const [masterResults, neisResults] = await Promise.all([
        searchSchoolsFromMaster(text).catch(() => [] as NeisSchool[]),
        searchSchools(text),
      ]);
      // 마스터 우선, 중복 제거
      const seen = new Set(masterResults.map(s => s.schoolName));
      const merged = [...masterResults, ...neisResults.filter(s => !seen.has(s.schoolName))];
      setSearchResults(merged);
      setShowResults(merged.length > 0);
      setIsSearching(false);
    }, 500);
  }

  const [isAutoYear, setIsAutoYear] = useState(!!birthYear);

  function onSelectSchool(school: NeisSchool) {
    setSchoolName(school.schoolName);
    setSearchQuery(school.schoolName);
    const newType = school.schoolType as SchoolEntry['schoolType'];
    setSchoolType(newType);
    if (birthYear) {
      setGraduationYear(getGraduationYear(birthYear, newType));
      setIsAutoYear(true);
    }
    setShowResults(false);
    setSearchResults([]);
  }

  function handleAddSchool() {
    if (!schoolName.trim()) return;
    const newEntry: SchoolEntry = {
      schoolType,
      schoolName: schoolName.trim(),
      graduationYear,
    };
    onSchoolsChange([...schools, newEntry]);
    setSchoolName('');
    setSchoolType('고등학교');
    setGraduationYear(2010);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setIsAdding(false);
  }

  function handleRemoveSchool(index: number) {
    onSchoolsChange(schools.filter((_, i) => i !== index));
  }

  return (
    <View>
      {/* 추가된 학교 목록 */}
      {schools.map((school, index) => (
        <View
          key={index}
          style={[
            styles.schoolCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.schoolCardContent}>
            <Text style={[styles.schoolCardType, { color: colors.primary }]}>
              {school.schoolType}
            </Text>
            <Text style={[styles.schoolCardName, { color: colors.text }]}>
              {school.schoolName}
            </Text>
            <Text style={[styles.schoolCardYear, { color: colors.textSecondary }]}>
              {school.graduationYear}년 졸업
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleRemoveSchool(index)}>
            <Ionicons name="close-circle" size={24} color={colors.inactive} />
          </TouchableOpacity>
        </View>
      ))}

      {/* 학교 추가 폼 */}
      {isAdding ? (
        <View style={styles.addForm}>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={[styles.pickerButtonText, { color: colors.text }]}>
              {schoolType}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.inactive} />
          </TouchableOpacity>

          <View>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
              ]}
              placeholder="학교 이름 검색 (2글자 이상)"
              placeholderTextColor={colors.inactive}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
            )}
            {showResults && (
              <View style={[styles.resultList, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: 200 }]}>
                {searchResults.map((school, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => onSelectSchool(school)}
                  >
                    <Text style={[styles.resultName, { color: colors.text }]}>{school.schoolName}</Text>
                    <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                      {school.schoolType} · {school.region}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {birthYear ? (
            <View style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TouchableOpacity
                onPress={() => { const autoMin = getGraduationYear(birthYear, schoolType) - 3; if (graduationYear > autoMin) { setGraduationYear(graduationYear - 1); setIsAutoYear(false); } }}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.pickerButtonText, { color: isAutoYear ? colors.inactive : colors.primary, fontWeight: isAutoYear ? '400' : '700' }]}>
                  {graduationYear}년
                </Text>
                <Text style={{ fontSize: 10, color: colors.inactive }}>{isAutoYear ? '자동계산' : '수동조정'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { const autoMax = getGraduationYear(birthYear, schoolType) + 3; if (graduationYear < autoMax) { setGraduationYear(graduationYear + 1); setIsAutoYear(false); } }}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                {graduationYear}년
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.inactive} />
            </TouchableOpacity>
          )}

          <View style={styles.addFormActions}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: colors.primary },
                !schoolName.trim() && styles.confirmButtonDisabled,
              ]}
              onPress={handleAddSchool}
              disabled={!schoolName.trim()}
            >
              <Text style={styles.confirmButtonText}>추가</Text>
            </TouchableOpacity>
            {schools.length > 0 && (
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setIsAdding(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  취소
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addSchoolButton, { borderColor: colors.border }]}
          onPress={() => setIsAdding(true)}
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={colors.primary}
          />
          <Text style={[styles.addSchoolButtonText, { color: colors.primary }]}>
            학교 추가
          </Text>
        </TouchableOpacity>
      )}

      {/* 학교 유형 피커 */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              학교 유형 선택
            </Text>
            {SCHOOL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.card },
                  schoolType === type.value && {
                    backgroundColor: activeHighlightBg,
                  },
                ]}
                onPress={() => {
                  setSchoolType(type.value);
                  if (birthYear) {
                    setGraduationYear(getGraduationYear(birthYear, type.value));
                    setIsAutoYear(true);
                  }
                  setShowTypePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: colors.text },
                    schoolType === type.value && {
                      color: colors.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* 졸업연도 피커 */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              졸업 연도 선택
            </Text>
            <FlatList
              data={getGraduationYears()}
              keyExtractor={(item) => item.toString()}
              style={styles.yearList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.card },
                    graduationYear === item && {
                      backgroundColor: activeHighlightBg,
                    },
                  ]}
                  onPress={() => {
                    setGraduationYear(item);
                    setShowYearPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: colors.text },
                      graduationYear === item && {
                        color: colors.primary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {item}년
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  schoolCardContent: { flex: 1 },
  schoolCardType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  schoolCardName: { fontSize: 16, fontWeight: '600' },
  schoolCardYear: { fontSize: 13, marginTop: 2 },
  addForm: { gap: 12, marginTop: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  pickerButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: { fontSize: 16 },
  addFormActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15 },
  addSchoolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSchoolButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 16 },
  yearList: { maxHeight: 300 },
  resultList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultSub: {
    fontSize: 13,
    marginTop: 2,
  },
});
