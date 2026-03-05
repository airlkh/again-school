import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SchoolEntry } from '../types/auth';
import { SCHOOL_TYPES, getGraduationYears } from '../data/schoolTypes';

interface SchoolInputProps {
  schools: SchoolEntry[];
  onSchoolsChange: (schools: SchoolEntry[]) => void;
}

export function SchoolInput({ schools, onSchoolsChange }: SchoolInputProps) {
  const { colors, isDark } = useTheme();
  const [isAdding, setIsAdding] = useState(schools.length === 0);
  const [schoolType, setSchoolType] =
    useState<SchoolEntry['schoolType']>('고등학교');
  const [schoolName, setSchoolName] = useState('');
  const [graduationYear, setGraduationYear] = useState(2010);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const activeHighlightBg = isDark ? 'rgba(232,49,58,0.15)' : '#fef2f2';

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

          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="학교 이름을 입력하세요"
            placeholderTextColor={colors.inactive}
            value={schoolName}
            onChangeText={setSchoolName}
          />

          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            onPress={() => setShowYearPicker(true)}
          >
            <Text style={[styles.pickerButtonText, { color: colors.text }]}>
              {graduationYear}년
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.inactive} />
          </TouchableOpacity>

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
});
