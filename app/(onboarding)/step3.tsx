import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { StepIndicator } from '../../src/components/StepIndicator';
import { SIDO_LIST, getSigunguList } from '../../src/data/regions';
import { useOnboarding } from './_layout';

export default function Step3Screen() {
  const { colors, isDark } = useTheme();
  const { data, updateData } = useOnboarding();
  const [sido, setSido] = useState(data.region.sido);
  const [sigungu, setSigungu] = useState(data.region.sigungu);
  const [showSidoPicker, setShowSidoPicker] = useState(false);
  const [showSigunguPicker, setShowSigunguPicker] = useState(false);

  const activeHighlightBg = isDark ? 'rgba(232,49,58,0.15)' : '#fef2f2';

  function handleNext() {
    if (!sido || !sigungu) {
      Alert.alert('입력 오류', '거주 지역을 선택해주세요.');
      return;
    }
    updateData({ region: { sido, sigungu } });
    router.push('/(onboarding)/step4');
  }

  const sigunguList = getSigunguList(sido);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>거주 지역</Text>
          <Text style={styles.headerSubtitle}>
            현재 거주하는 지역을 선택해주세요
          </Text>
        </View>

        <StepIndicator totalSteps={4} currentStep={3} />

        <View style={styles.content}>
          {/* 시/도 선택 */}
          <Text style={[styles.label, { color: colors.text }]}>시/도</Text>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            onPress={() => setShowSidoPicker(true)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                { color: colors.text },
                !sido && { color: colors.inactive },
              ]}
            >
              {sido || '시/도를 선택하세요'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.inactive} />
          </TouchableOpacity>

          {/* 시/군/구 선택 */}
          <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>
            시/군/구
          </Text>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
              !sido && styles.pickerDisabled,
            ]}
            onPress={() => sido && setShowSigunguPicker(true)}
            disabled={!sido}
          >
            <Text
              style={[
                styles.pickerButtonText,
                { color: colors.text },
                !sigungu && { color: colors.inactive },
              ]}
            >
              {sigungu || '시/군/구를 선택하세요'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.inactive} />
          </TouchableOpacity>

          {/* 선택 결과 */}
          {sido && sigungu && (
            <View style={[styles.selectedRegion, { backgroundColor: activeHighlightBg }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={[styles.selectedRegionText, { color: colors.primary }]}>
                {sido} {sigungu}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: colors.primary },
            (!sido || !sigungu) && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!sido || !sigungu}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </View>

      {/* 시/도 모달 */}
      <Modal visible={showSidoPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              시/도 선택
            </Text>
            <FlatList
              data={SIDO_LIST}
              keyExtractor={(item) => item}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.card },
                    sido === item && { backgroundColor: activeHighlightBg },
                  ]}
                  onPress={() => {
                    setSido(item);
                    setSigungu('');
                    setShowSidoPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: colors.text },
                      sido === item && {
                        color: colors.primary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* 시/군/구 모달 */}
      <Modal visible={showSigunguPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {sido} - 시/군/구 선택
            </Text>
            <FlatList
              data={sigunguList}
              keyExtractor={(item) => item}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.card },
                    sigungu === item && { backgroundColor: activeHighlightBg },
                  ]}
                  onPress={() => {
                    setSigungu(item);
                    setShowSigunguPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: colors.text },
                      sigungu === item && {
                        color: colors.primary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  content: { padding: 24 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  pickerDisabled: { opacity: 0.5 },
  pickerButtonText: { fontSize: 16 },
  selectedRegion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  selectedRegionText: {
    fontSize: 16,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalList: { maxHeight: 400 },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 16 },
});
