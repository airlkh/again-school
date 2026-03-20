import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Dimensions, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const CX = width / 2;
const CY = height / 2;
const EYE = 28;
const MOUTH = 100;

interface Props {
  onFinish: () => void;
  onReady?: () => void;
}

export function AnimatedSplash({ onFinish, onReady }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const eyeScale = useRef(new Animated.Value(0)).current;
  const eyeOpacity = useRef(new Animated.Value(0)).current;
  const eyeRScaleY = useRef(new Animated.Value(1)).current;
  const mouthScaleX = useRef(new Animated.Value(0)).current;
  const mouthOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.3)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onReady?.();
    Animated.sequence([
      // 눈 + 입 팝업 (천천히)
      Animated.parallel([
        Animated.spring(eyeScale, { toValue: 1.4, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(eyeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(mouthScaleX, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(mouthOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(eyeScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(mouthScaleX, { toValue: 1, duration: 150, useNativeDriver: true }),
      // 유지
      Animated.delay(600),
      // 윙크
      Animated.sequence([
        Animated.timing(eyeRScaleY, { toValue: 0.08, duration: 120, useNativeDriver: true }),
        Animated.timing(eyeRScaleY, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
      // 유지
      Animated.delay(600),
      // 이모지 사라짐 + 텍스트 등장
      Animated.parallel([
        Animated.timing(eyeScale, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(eyeOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(mouthScaleX, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(mouthOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.spring(titleScale, { toValue: 1.1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(titleScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      // 유지
      Animated.delay(500),
      // 전체 페이드아웃
      Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      pointerEvents="none"
    >
      {/* 눈 왼쪽 - 화면 정중앙 기준 */}
      <Animated.View style={{
        position: 'absolute',
        width: EYE,
        height: EYE,
        backgroundColor: '#fff',
        borderRadius: 6,
        left: CX - EYE * 2,
        top: CY - EYE * 2,
        opacity: eyeOpacity,
        transform: [{ scale: eyeScale }],
      }} />
      {/* 눈 오른쪽 */}
      <Animated.View style={{
        position: 'absolute',
        width: EYE,
        height: EYE,
        backgroundColor: '#fff',
        borderRadius: 6,
        left: CX + EYE,
        top: CY - EYE * 2,
        opacity: eyeOpacity,
        transform: [{ scale: eyeScale }, { scaleY: eyeRScaleY }],
      }} />
      {/* 입 클립 */}
      <View style={{
        position: 'absolute',
        width: MOUTH,
        height: MOUTH / 2,
        left: CX - MOUTH / 2,
        top: CY + EYE * 0.5,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          width: MOUTH,
          height: MOUTH,
          borderWidth: 12,
          borderColor: '#fff',
          borderRadius: MOUTH / 2,
          position: 'absolute',
          bottom: 0,
          opacity: mouthOpacity,
          transform: [{ scaleX: mouthScaleX }],
        }} />
      </View>
      {/* Again School 텍스트 */}
      <Animated.Text style={{
        position: 'absolute',
        color: '#fff',
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: 1,
        opacity: titleOpacity,
        transform: [{ scale: titleScale }],
      }}>
        Again School
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3124',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});
