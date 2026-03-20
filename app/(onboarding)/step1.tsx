import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { StepIndicator } from '../../src/components/StepIndicator';
import { useOnboarding } from './_layout';
import { BIRTH_YEAR_RANGE, getSchoolYears } from '../../src/utils/graduationYear';

export default function Step1Screen() {
  const { colors, isDark } = useTheme();
  const { data, updateData } = useOnboarding();
  const [name, setName] = useState(data.displayName);
  const [photoURI, setPhotoURI] = useState<string | null>(data.photoURI);
  const [birthYear, setBirthYear] = useState(data.birthYear || 0);
  const [showBirthYearPicker, setShowBirthYearPicker] = useState(false);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '사진 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoURI(result.assets[0].uri);
    }
  }
  const birthYears = Array.from({ length: BIRTH_YEAR_RANGE.max - BIRTH_YEAR_RANGE.min + 1 }, (_, i) => BIRTH_YEAR_RANGE.max - i);

  function handleNext() {
    if (!name.trim()) {
      Alert.alert('입력 오류', '이름을 입력해주세요.');
      return;
    }
    if (!birthYear) {
      Alert.alert('입력 오류', '출생년도를 선택해주세요.');
      return;
    }
    updateData({ displayName: name.trim(), birthYear, photoURI });
    router.push('/(onboarding)/step2');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* 헤더 */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerTitle}>프로필 설정</Text>
            <Text style={styles.headerSubtitle}>
              친구들에게 보여줄 정보를 입력해주세요
            </Text>
          </View>

          <StepIndicator totalSteps={4} currentStep={1} />

          <View style={styles.content}>
            {/* 프로필 사진 */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {photoURI ? (
                  <Image source={{ uri: photoURI }} style={styles.avatarImage} />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: 'rgba(0,0,0,0.15)',
                        borderColor: 'rgba(0,0,0,0.2)',
                        borderWidth: 2,
                        borderStyle: 'dashed',
                      },
                    ]}
                  >
                    <Ionicons name="person" size={48} color="rgba(0,0,0,0.3)" />
                  </View>
                )}
                <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: colors.inactive }]}>
                {photoURI ? '탭하여 변경' : '탭하여 사진 추가'}
              </Text>
            </View>

            {/* 이름 입력 */}
            <Text style={[styles.label, { color: colors.text }]}>이름</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="이름을 입력하세요"
              placeholderTextColor={colors.inactive}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            {/* 출생년도 선택 */}
            <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>출생년도</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center' }]}
              onPress={() => setShowBirthYearPicker(true)}
            >
              <Text style={{ fontSize: 16, color: birthYear ? colors.text : colors.inactive }}>
                {birthYear ? `${birthYear}년` : '출생년도를 선택하세요'}
              </Text>
            </TouchableOpacity>
            {birthYear > 0 && (
              <View style={{ marginTop: 8, backgroundColor: isDark ? 'rgba(232,49,58,0.1)' : '#fef2f2', padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 4 }}>예상 졸업년도</Text>
                {Object.entries(getSchoolYears(birthYear)).map(([type, year]) => (
                  <Text key={type} style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                    {type}: {year}년
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* 출생년도 피커 모달 */}
          <Modal visible={showBirthYearPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>출생년도 선택</Text>
                <FlatList
                  data={birthYears}
                  keyExtractor={(item) => item.toString()}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalOption, { borderBottomColor: colors.card }, birthYear === item && { backgroundColor: isDark ? 'rgba(232,49,58,0.15)' : '#fef2f2' }]}
                      onPress={() => { setBirthYear(item); setShowBirthYearPicker(false); }}
                    >
                      <Text style={[styles.modalOptionText, { color: colors.text }, birthYear === item && { color: colors.primary, fontWeight: '600' }]}>{item}년</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </ScrollView>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              (!name.trim() || !birthYear) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!name.trim() || !birthYear}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  content: { padding: 24 },
  avatarContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 13,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  footer: { padding: 24, paddingTop: 0 },
  nextButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '50%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1 },
  modalOptionText: { fontSize: 16 },
});
