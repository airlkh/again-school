import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { KeyboardScrollView } from '../../src/components/KeyboardScrollView';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { createMeetup } from '../../src/services/meetupService';
import { uploadImage } from '../../src/services/mediaService';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { HorizontalSlider } from '../../src/components/VerticalSlider';
import { FONTS, getFontStyle, FontPickerModal, DraggableText } from '../../src/components/TextOverlay';
import ViewShot from 'react-native-view-shot';

export default function MeetupCreateScreen() {
  const { user, displayName: myName, avatarImg: myAvatarImg, photoURL: myPhotoURL } = useCurrentUser();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('20');
  const [fee, setFee] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState(200);
  const [imageText, setImageText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSizeValue, setTextSizeValue] = useState(0.3);
  const textFontSize = Math.round(16 + textSizeValue * 32); // 16px ~ 48px
  const [fontKey, setFontKey] = useState('default');
  const [textBgStyle, setTextBgStyle] = useState<'none' | 'translucent' | 'solid'>('none');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  // DateTime picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatTime(d: Date): string {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDisplayDate(d: Date): string {
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function formatDisplayTime(d: Date): string {
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h < 12 ? '오전' : '오후';
    const hour = h % 12 || 12;
    return `${period} ${hour}시${m > 0 ? ` ${m}분` : ''}`;
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageHeight(200); // reset, will be recalculated onLoad
    }
  }

  function validate(): boolean {
    if (!title.trim()) { Alert.alert('알림', '모임명을 입력해주세요.'); return false; }
    if (!schoolName.trim()) { Alert.alert('알림', '학교명을 입력해주세요.'); return false; }
    if (!graduationYear.trim() || isNaN(Number(graduationYear))) {
      Alert.alert('알림', '졸업연도를 올바르게 입력해주세요.'); return false;
    }
    if (!location.trim()) { Alert.alert('알림', '장소를 입력해주세요.'); return false; }
    return true;
  }

  async function handleCreate() {
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      let finalImageUrl = `https://picsum.photos/400/200?random=${Date.now()}`;

      if (imageUri) {
        try {
          // 텍스트가 있으면 ViewShot으로 합성 캡처
          let uriToUpload = imageUri;
          if (imageText.trim() && viewShotRef.current) {
            try {
              const captured = await (viewShotRef.current as any).capture();
              if (captured) uriToUpload = captured;
            } catch (err) {
              console.warn('텍스트 합성 캡처 실패:', err);
            }
          }
          const uploaded = await uploadImage(uriToUpload);
          finalImageUrl = uploaded.url;
        } catch {
          // 이미지 업로드 실패 시 기본 이미지 사용
        }
      }

      await createMeetup({
        title: title.trim(),
        description: description.trim(),
        schoolName: schoolName.trim(),
        graduationYear: Number(graduationYear),
        date: formatDate(selectedDate),
        time: formatDisplayTime(selectedTime),
        location: location.trim(),
        address: address.trim(),
        maxAttendees: Number(maxAttendees) || 20,
        fee: Number(fee) || 0,
        hostUid: user.uid,
        hostName: myName,
        hostAvatarImg: myAvatarImg,
        hostPhotoURL: myPhotoURL,
        imageUrl: finalImageUrl,
        imageText: imageText.trim() || null,
        imageTextColor: textColor,
        imageTextSize: textFontSize,
      } as any);
      Alert.alert('완료', '모임이 생성되었습니다!', [
        { text: '확인', onPress: () => goBack() },
      ]);
    } catch {
      Alert.alert('오류', '모임 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 만들기</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
          {/* 프리미엄 배너 */}
          <View style={[styles.premiumBanner, { backgroundColor: isDark ? colors.surface2 : '#fffbeb', borderColor: isDark ? colors.border : '#fde68a' }]}>
            <Ionicons name="star" size={20} color="#f59e0b" />
            <Text style={[styles.premiumText, { color: isDark ? colors.text : '#92400e' }]}>프리미엄 기능 — 모임을 직접 만들어 동창을 초대하세요!</Text>
          </View>

          {/* 대표 이미지 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>대표 이미지</Text>
          {!imageUri && (
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickImage}
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={36} color={colors.inactive} />
                <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>탭하여 이미지 선택</Text>
                <Text style={[styles.imagePlaceholderSub, { color: colors.inactive }]}>미선택 시 기본 이미지 사용</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* 이미지 미리보기 (원본 비율) */}
          {imageUri && (
            <View style={styles.imagePreviewWrap}>
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'jpg', quality: 0.9 }}
                style={{ width: '100%', height: imageHeight }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: imageHeight }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    const ratio = height / width;
                    const screenW = Dimensions.get('window').width - 40;
                    setImageHeight(Math.min(Math.max(screenW * ratio, 150), 400));
                  }}
                />

                {/* 드래그 가능한 텍스트 오버레이 */}
                {imageText.trim().length > 0 && (
                  <DraggableText
                    text={imageText}
                    color={textColor}
                    fontSize={textFontSize}
                    fontKey={fontKey}
                    bgStyle={textBgStyle}
                    containerWidth={Dimensions.get('window').width - 40}
                    containerHeight={imageHeight}
                  />
                )}
              </ViewShot>

              {/* 삭제 버튼 */}
              <TouchableOpacity
                onPress={() => { setImageUri(null); setImageText(''); setShowTextInput(false); }}
                style={styles.imageDeleteBtn}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* 이미지 위 텍스트 입력 패널 */}
          {imageUri && (
            <View style={{ marginTop: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setShowTextInput(!showTextInput)}
                style={[styles.textAddBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 16 }}>Aa</Text>
                <Text style={[styles.textAddLabel, { color: colors.text }]}>
                  {showTextInput ? '텍스트 닫기' : '이미지에 텍스트 추가'}
                </Text>
              </TouchableOpacity>

              {showTextInput && (
                <View style={[styles.textPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    value={imageText}
                    onChangeText={setImageText}
                    placeholder="이미지 위에 표시할 텍스트"
                    placeholderTextColor={colors.inactive}
                    style={[styles.textPanelInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    maxLength={50}
                    returnKeyType="done"
                  />
                  <Text style={styles.textPanelCount}>{imageText.length}/50</Text>

                  {/* 색상 선택 */}
                  <Text style={styles.textPanelLabel}>텍스트 색상</Text>
                  <View style={styles.colorRow}>
                    {['#ffffff', '#000000', '#e8313a', '#FFD700', '#00C851', '#2196F3', '#FF69B4', '#FF8C00'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setTextColor(c)}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c, borderColor: textColor === c ? '#e8313a' : 'rgba(0,0,0,0.2)', borderWidth: textColor === c ? 3 : 1 },
                        ]}
                      />
                    ))}
                  </View>

                  {/* 배경 스타일 */}
                  <Text style={styles.textPanelLabel}>텍스트 배경</Text>
                  <View style={styles.colorRow}>
                    {([
                      { key: 'none' as const, label: '없음' },
                      { key: 'translucent' as const, label: '반투명' },
                      { key: 'solid' as const, label: '채우기' },
                    ]).map((b) => (
                      <TouchableOpacity
                        key={b.key}
                        onPress={() => setTextBgStyle(b.key)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: textBgStyle === b.key ? '#e8313a' : colors.background,
                          borderWidth: 1,
                          borderColor: textBgStyle === b.key ? '#e8313a' : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: textBgStyle === b.key ? '#fff' : colors.text, fontWeight: '600' }}>
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 글꼴 선택 */}
                  <Text style={styles.textPanelLabel}>글꼴</Text>
                  <TouchableOpacity
                    onPress={() => setShowFontPicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🔤</Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: colors.text,
                        fontFamily: getFontStyle(fontKey).fontFamily,
                        fontWeight: getFontStyle(fontKey).fontWeight,
                      }}
                    >
                      {(FONTS.find((f) => f.key === fontKey) || FONTS[0]).label}
                    </Text>
                  </TouchableOpacity>

                  {/* 글자 크기 슬라이더 */}
                  <Text style={styles.textPanelLabel}>글자 크기 — {textFontSize}px</Text>
                  <View style={styles.sliderRow}>
                    <Text style={[styles.sliderLabel, { color: colors.inactive }]}>A</Text>
                    <View style={styles.sliderTrackWrap}>
                      <View style={[styles.sliderTrack, { backgroundColor: colors.border }]} />
                      <View style={[styles.sliderTrackFill, { width: `${textSizeValue * 100}%` }]} />
                      <HorizontalSlider value={textSizeValue} onChange={setTextSizeValue} />
                    </View>
                    <Text style={[styles.sliderLabel, { color: colors.inactive, fontSize: 22 }]}>A</Text>
                  </View>

                  <Text style={styles.textPanelHint}>위 이미지에서 텍스트를 드래그해서 위치를 변경할 수 있어요</Text>
                </View>
              )}
              <FontPickerModal
                visible={showFontPicker}
                selected={fontKey}
                onSelect={setFontKey}
                onClose={() => setShowFontPicker(false)}
              />
            </View>
          )}

          {/* 기본 정보 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>기본 정보</Text>

          <Text style={[styles.label, { color: colors.text }]}>모임명 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 한빛중 2012 동기 모임"
            placeholderTextColor={colors.inactive}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.text }]}>모임 소개</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="모임에 대한 설명을 입력해주세요"
            placeholderTextColor={colors.inactive}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* 학교 정보 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>학교 정보</Text>

          <Text style={[styles.label, { color: colors.text }]}>학교명 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 한빛중학교"
            placeholderTextColor={colors.inactive}
            value={schoolName}
            onChangeText={setSchoolName}
          />

          <Text style={[styles.label, { color: colors.text }]}>졸업연도 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 2012"
            placeholderTextColor={colors.inactive}
            value={graduationYear}
            onChangeText={setGraduationYear}
            keyboardType="number-pad"
            maxLength={4}
          />

          {/* 일시/장소 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>일시 / 장소</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: colors.text }]}>날짜 *</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                  {formatDisplayDate(selectedDate)}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: colors.text }]}>시간 *</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                  {formatDisplayTime(selectedTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Native Date Picker */}
          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent animationType="fade" visible={showDatePicker}>
                <View style={styles.pickerModalOverlay}>
                  <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={[styles.pickerDone, { color: colors.primary }]}>완료</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      locale="ko"
                      onChange={(_, d) => { if (d) setSelectedDate(d); }}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_, d) => {
                  setShowDatePicker(false);
                  if (d) setSelectedDate(d);
                }}
              />
            )
          )}

          {/* Native Time Picker */}
          {showTimePicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent animationType="fade" visible={showTimePicker}>
                <View style={styles.pickerModalOverlay}>
                  <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={[styles.pickerDone, { color: colors.primary }]}>완료</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      minuteInterval={10}
                      locale="ko"
                      onChange={(_, d) => { if (d) setSelectedTime(d); }}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                minuteInterval={10}
                onChange={(_, d) => {
                  setShowTimePicker(false);
                  if (d) setSelectedTime(d);
                }}
              />
            )
          )}

          <Text style={[styles.label, { color: colors.text }]}>장소명 *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 강남 레스토랑"
            placeholderTextColor={colors.inactive}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={[styles.label, { color: colors.text }]}>상세주소</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="예: 서울 강남구 테헤란로 123"
            placeholderTextColor={colors.inactive}
            value={address}
            onChangeText={setAddress}
          />

          {/* 참가 설정 */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>참가 설정</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: colors.text }]}>최대 정원</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="20"
                placeholderTextColor={colors.inactive}
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: colors.text }]}>참가비 (원)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="0 (무료)"
                placeholderTextColor={colors.inactive}
                value={fee}
                onChangeText={setFee}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {fee !== '0' && fee !== '' && (
            <View style={[styles.feeNote, { backgroundColor: colors.card }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.feeNoteText, { color: colors.textSecondary }]}>
                참가비는 모임 당일 현장에서 직접 수금합니다. 앱 내 결제 기능은 제공되지 않습니다.
              </Text>
            </View>
          )}

      </KeyboardScrollView>

      {/* 모임 만들기 버튼 — 하단 고정 */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.createBtn, submitting && { backgroundColor: colors.inactive }]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={{ fontSize: 18 }}>🏫</Text>
              <Text style={styles.createBtnText}>모임 만들기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
  },
  premiumText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },

  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: { flex: 1 },

  // Image picker
  imagePicker: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imagePlaceholderText: { fontSize: 14, fontWeight: '600' },
  imagePlaceholderSub: { fontSize: 12 },

  // Image preview
  imagePreviewWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imageTextOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  imageDeleteBtn: {
    position: 'absolute',
    top: 8, right: 8,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text on image
  textAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  textAddLabel: { fontSize: 14, fontWeight: '600' },
  textPanel: {
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  textPanelInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 48,
  },
  textPanelCount: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: -8 },
  textPanelLabel: { fontSize: 13, color: '#999', fontWeight: '600', marginBottom: 4 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontWeight: '700' },
  sliderTrackWrap: { flex: 1, height: 40, justifyContent: 'center', position: 'relative' as const },
  sliderTrack: { position: 'absolute' as const, left: 0, right: 0, height: 4, borderRadius: 2 },
  sliderTrackFill: { position: 'absolute' as const, left: 0, height: 4, borderRadius: 2, backgroundColor: '#e8313a' },
  textPanelHint: { fontSize: 12, color: '#999', textAlign: 'center' },

  // DateTime picker buttons
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  pickerBtnText: { fontSize: 14, fontWeight: '500' },

  // iOS picker modal
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerDone: { fontSize: 16, fontWeight: '700' },

  feeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  feeNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  createBtn: {
    backgroundColor: '#e8313a',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
