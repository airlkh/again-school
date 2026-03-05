import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { Meetup, MeetupAttendee } from '../../src/types/auth';

import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { findMeetupById } from '../../src/data/dummyClassmates';
import { deleteMeetup } from '../../src/services/meetupService';
import { getAvatarSource } from '../../src/utils/avatar';
import { NameWithBadge } from '../../src/utils/badge';

export default function MeetupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, displayName, avatarImg, photoURL } = useCurrentUser();
  const { colors, isDark } = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFirestore, setIsFirestore] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1) Try Firestore real-time subscription
    const docRef = doc(db, 'meetups', id);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setMeetup({ id: snap.id, ...snap.data() } as Meetup);
        setIsFirestore(true);
      } else {
        // 2) Fallback to dummy data
        const found = findMeetupById(id);
        if (found) {
          setMeetup(found);
          setIsFirestore(false);
        }
      }
    }, () => {
      // Firestore error fallback
      const found = findMeetupById(id);
      if (found) {
        setMeetup(found);
        setIsFirestore(false);
      }
    });

    return unsub;
  }, [id]);

  if (!meetup) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>모임 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>모임을 찾을 수 없습니다</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={goBack}
          >
            <Text style={styles.retryBtnText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = user?.uid === meetup.hostUid;
  const participants = meetup.participants ?? [];
  const isAttending = user ? participants.includes(user.uid) : false;
  const isFull = participants.length >= meetup.maxAttendees;
  const isRecruiting = meetup.status === 'recruiting';
  const dateParts = meetup.date.split('-');
  const month = dateParts[1] || '01';
  const day = dateParts[2] || '01';

  async function handleJoin() {
    if (!user || !id) return;
    setJoining(true);
    try {
      const docRef = doc(db, 'meetups', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        Alert.alert('오류', '모임을 찾을 수 없습니다.');
        return;
      }
      const attendee: MeetupAttendee = {
        uid: user.uid,
        displayName,
        avatarImg,
        photoURL: photoURL ?? null,
        joinedAt: Date.now(),
      };
      await updateDoc(docRef, {
        participants: arrayUnion(user.uid),
        attendees: arrayUnion(attendee),
      });
      // Firestore onSnapshot will auto-update, but update locally for dummy data
      if (!isFirestore) {
        setMeetup((prev) =>
          prev ? { ...prev, participants: [...(prev.participants ?? []), user.uid], attendees: [...prev.attendees, attendee] } : prev,
        );
      }
      Alert.alert('참석 완료', '모임에 참석 신청되었습니다!');
    } catch {
      Alert.alert('오류', '참석 신청에 실패했습니다.');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!user || !id) return;
    Alert.alert('참석 취소', '정말 참석을 취소하시겠습니까?', [
      { text: '아니요', style: 'cancel' },
      {
        text: '네',
        style: 'destructive',
        onPress: async () => {
          try {
            const docRef = doc(db, 'meetups', id);
            const snap = await getDoc(docRef);
            if (!snap.exists()) return;
            const data = snap.data();
            const updatedAttendees = (data.attendees ?? []).filter(
              (a: MeetupAttendee) => a.uid !== user.uid,
            );
            await updateDoc(docRef, {
              participants: arrayRemove(user.uid),
              attendees: updatedAttendees,
            });
            if (!isFirestore) {
              setMeetup((prev) =>
                prev ? { ...prev, participants: (prev.participants ?? []).filter((uid) => uid !== user.uid), attendees: prev.attendees.filter((a) => a.uid !== user.uid) } : prev,
              );
            }
          } catch {
            Alert.alert('오류', '취소에 실패했습니다.');
          }
        },
      },
    ]);
  }

  function handleLocationPress() {
    const query = encodeURIComponent(meetup!.address || meetup!.location);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://maps.google.com/?q=${query}`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  }

  function handleCancelMeetup() {
    if (!id) return;
    Alert.alert(
      '모임 취소',
      '정말로 이 모임을 취소(삭제)하시겠습니까?\n참석자 전원에게 취소 알림이 전달됩니다.',
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '모임 삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMeetup(id);
              Alert.alert('완료', '모임이 삭제되었습니다.', [
                { text: '확인', onPress: () => goBack() },
              ]);
            } catch {
              Alert.alert('오류', '모임 삭제에 실패했습니다.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  function statusLabel(status: string) {
    if (status === 'recruiting') return { text: '모집중', color: colors.primary };
    if (status === 'confirmed') return { text: '확정', color: '#22c55e' };
    return { text: '종료', color: colors.inactive };
  }

  const badge = statusLabel(meetup.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>모임 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Image source={{ uri: meetup.imageUrl }} style={[styles.coverImage, { backgroundColor: colors.card }]} />

        <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
          <Text style={styles.statusText}>{badge.text}</Text>
        </View>

        <View style={styles.body}>
          <Text style={[styles.school, { color: colors.primary }]}>{meetup.schoolName} · {meetup.graduationYear}년 졸업</Text>
          <Text style={[styles.title, { color: colors.text }]}>{meetup.title}</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>날짜</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{Number(month)}월 {Number(day)}일 {meetup.time}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.infoRow} onPress={handleLocationPress}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>장소</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{meetup.location}</Text>
                <Text style={[styles.infoSub, { color: colors.primary }]}>{meetup.address} →</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>정원</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{participants.length} / {meetup.maxAttendees}명</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>참가비</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {meetup.fee > 0 ? `${meetup.fee.toLocaleString()}원` : '무료'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>모임 소개</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{meetup.description}</Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>주최자</Text>
          <TouchableOpacity
            style={[styles.hostCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/profile/${meetup.hostUid}`)}
          >
            <Image
              source={getAvatarSource(meetup.hostPhotoURL)}
              style={[styles.hostAvatar, { backgroundColor: colors.card }]}
            />
            <View style={{ flex: 1 }}>
              <NameWithBadge name={meetup.hostName} uid={meetup.hostUid} nameStyle={[styles.hostName, { color: colors.text }]} />
              <Text style={[styles.hostLabel, { color: colors.primary }]}>주최자</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inactive} />
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            참석자 ({meetup.attendees.length}명)
          </Text>
          <View style={styles.attendeeList}>
            {meetup.attendees.map((a) => (
              <TouchableOpacity
                key={a.uid}
                style={[styles.attendeeItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/profile/${a.uid}`)}
              >
                <Image
                  source={getAvatarSource(a.photoURL)}
                  style={[styles.attendeeAvatar, { backgroundColor: colors.card }]}
                />
                <NameWithBadge name={a.displayName} uid={a.uid} nameStyle={[styles.attendeeName, { color: colors.text }]} />
                {a.uid === meetup.hostUid && (
                  <View style={[styles.hostTag, { backgroundColor: isDark ? colors.surface2 : '#fef2f2' }]}>
                    <Text style={[styles.hostTagText, { color: colors.primary }]}>주최</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 - SafeAreaView 내부에 고정 */}
      {isRecruiting && !isHost && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {isAttending ? (
            <TouchableOpacity
              style={[styles.leaveBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={handleLeave}
            >
              <Text style={[styles.leaveBtnText, { color: colors.primary }]}>참석 취소</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: colors.primary }, isFull && { backgroundColor: colors.inactive }]}
              onPress={handleJoin}
              disabled={isFull || joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.joinBtnText}>
                  {isFull ? '정원 마감' : '참석하기'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {meetup.status === 'confirmed' && isAttending && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={[styles.joinBtn, { backgroundColor: '#22c55e' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={[styles.joinBtnText, { marginLeft: 6 }]}>참석 확정됨</Text>
          </View>
        </View>
      )}

      {/* 모임 취소 버튼 — 주최자에게만 표시 */}
      {isHost && (
        <View style={[styles.cancelBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelMeetup}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text style={styles.cancelBtnText}>모임 취소</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  scroll: { flex: 1 },
  coverImage: { width: '100%', height: 200 },

  statusBadge: {
    position: 'absolute', top: 62, right: 16,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  body: { padding: 20 },
  school: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 20 },

  infoCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  infoSub: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginVertical: 4 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24, marginBottom: 24 },

  hostCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 24,
  },
  hostAvatar: { width: 48, height: 48, borderRadius: 24 },
  hostName: { fontSize: 16, fontWeight: '700', marginLeft: 12 },
  hostLabel: { fontSize: 13, marginLeft: 12, marginTop: 2 },

  attendeeList: { gap: 10, marginBottom: 20 },
  attendeeItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, borderWidth: 1,
  },
  attendeeAvatar: { width: 40, height: 40, borderRadius: 20 },
  attendeeName: { fontSize: 15, fontWeight: '600', marginLeft: 12, flex: 1 },
  hostTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  hostTagText: { fontSize: 11, fontWeight: '700' },

  bottomBar: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 16 : 20,
    borderTopWidth: 1,
  },
  joinBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  joinBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  leaveBtn: {
    borderRadius: 14, paddingVertical: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
  },
  leaveBtnText: { fontSize: 17, fontWeight: '700' },

  cancelBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    height: 48,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
});
