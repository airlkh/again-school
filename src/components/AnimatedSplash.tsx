import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 살짝 커지는 애니메이션 (expo 스플래시와 거의 동일 크기에서 시작)
      Animated.timing(scale, {
        toValue: 1.0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 유지
      Animated.delay(500),
      // 페이드아웃
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  const LOGO_SIZE = Math.min(width * 0.55, 220);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <Animated.Image
        source={require('../../assets/logo.png')}
        style={{
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          opacity,
          transform: [{ scale }],
        }}
        resizeMode="contain"
      />
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
