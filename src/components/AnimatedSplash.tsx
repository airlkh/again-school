import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(600),
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
