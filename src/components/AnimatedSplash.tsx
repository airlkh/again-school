import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Dimensions, View } from 'react-native';

const { width } = Dimensions.get('window');
const SIZE = Math.min(width * 0.55, 220);
const EYE = SIZE * 0.14;
const MOUTH = SIZE * 0.5;

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // 눈
  const eyeScale = useRef(new Animated.Value(0)).current;
  const eyeOpacity = useRef(new Animated.Value(0)).current;
  // 오른쪽 눈 윙크
  const eyeRScaleY = useRef(new Animated.Value(1)).current;
  // 입
  const mouthScaleX = useRef(new Animated.Value(0)).current;
  const mouthOpacity = useRef(new Animated.Value(0)).current;
  // 텍스트
  const titleScale = useRef(new Animated.Value(0.3)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 눈 + 입 동시에 팝업
      Animated.parallel([
        Animated.spring(eyeScale, { toValue: 1.4, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(eyeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(mouthScaleX, { toValue: 1.05, duration: 300, useNativeDriver: true }),
        Animated.timing(mouthOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // 눈 크기 정상화
      Animated.spring(eyeScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(mouthScaleX, { toValue: 1, duration: 100, useNativeDriver: true }),
      // 유지
      Animated.delay(300),
      // 오른쪽 눈 윙크
      Animated.sequence([
        Animated.timing(eyeRScaleY, { toValue: 0.08, duration: 80, useNativeDriver: true }),
        Animated.timing(eyeRScaleY, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]),
      // 유지
      Animated.delay(400),
      // 이모지 사라짐 + 텍스트 등장 동시에
      Animated.parallel([
        Animated.timing(eyeScale, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(eyeOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(mouthScaleX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(mouthOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.spring(titleScale, { toValue: 1.1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // 텍스트 크기 정상화
      Animated.spring(titleScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      // 유지
      Animated.delay(600),
      // 전체 페이드아웃
      Animated.timing(containerOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      {/* 눈 왼쪽 */}
      <Animated.View style={[styles.eye, {
        width: EYE, height: EYE,
        left: SIZE * 0.5 - EYE * 2.2,
        top: SIZE * 0.5 - EYE * 0.8,
        opacity: eyeOpacity,
        transform: [{ scale: eyeScale }],
      }]} />
      {/* 눈 오른쪽 */}
      <Animated.View style={[styles.eye, {
        width: EYE, height: EYE,
        left: SIZE * 0.5 + EYE * 1.2,
        top: SIZE * 0.5 - EYE * 0.8,
        opacity: eyeOpacity,
        transform: [{ scale: eyeScale }, { scaleY: eyeRScaleY }],
      }]} />
      {/* 입 */}
      <View style={{
        width: MOUTH, height: MOUTH / 2,
        position: 'absolute',
        left: SIZE * 0.5 - MOUTH / 2,
        top: SIZE * 0.5 + EYE * 0.8,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          width: MOUTH, height: MOUTH,
          borderWidth: SIZE * 0.07,
          borderColor: '#fff',
          borderRadius: MOUTH / 2,
          position: 'absolute',
          bottom: 0,
          opacity: mouthOpacity,
          transform: [{ scaleX: mouthScaleX }],
        }} />
      </View>
      {/* Again School 텍스트 */}
      <Animated.Text style={[styles.title, {
        opacity: titleOpacity,
        transform: [{ scale: titleScale }],
      }]}>
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
  eye: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  title: {
    position: 'absolute',
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
