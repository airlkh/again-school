import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const LOGO = Math.min(width * 0.50, 200);
  const CX = width / 2;
  const CY = height / 2 - 30;

  const TOP_R = LOGO * 0.11;
  const DOT_R = LOGO * 0.08;
  const STROKE = LOGO * 0.06;

  const TOP_Y = CY - LOGO * 0.30;
  const LEFT_X = CX - LOGO * 0.44;
  const BOT_Y = CY + LOGO * 0.28;
  const RIGHT_X = CX + LOGO * 0.44;

  // Animations
  const topY = useRef(new Animated.Value(-180)).current;
  const topOp = useRef(new Animated.Value(0)).current;
  const leftX = useRef(new Animated.Value(-200)).current;
  const leftOp = useRef(new Animated.Value(0)).current;
  const rightX = useRef(new Animated.Value(200)).current;
  const rightOp = useRef(new Animated.Value(0)).current;
  const arcOp = useRef(new Animated.Value(0)).current;
  const lineOp = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(15)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const SP = { tension: 70, friction: 9, useNativeDriver: true };

    Animated.sequence([
      Animated.delay(300),
      // Dots fly in
      Animated.parallel([
        Animated.parallel([
          Animated.spring(topY, { toValue: 0, ...SP }),
          Animated.timing(topOp, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.spring(leftX, { toValue: 0, ...SP }),
            Animated.timing(leftOp, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.spring(rightX, { toValue: 0, ...SP }),
            Animated.timing(rightOp, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
        ]),
      ]),
      // Arc + line
      Animated.delay(60),
      Animated.timing(arcOp, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(lineOp, { toValue: 0.3, duration: 250, useNativeDriver: true }),
      // Text
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(600),
      // Fade out
      Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  // Arc: using a wide oval border (top half only)
  const arcW = RIGHT_X - LEFT_X;
  const arcH = (BOT_Y - TOP_Y) + LOGO * 0.12;

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]} pointerEvents="none">
      {/* Arc (top-half oval via border) */}
      <Animated.View style={{
        position: 'absolute',
        left: LEFT_X,
        top: TOP_Y - LOGO * 0.12,
        width: arcW,
        height: arcH,
        borderWidth: STROKE,
        borderColor: 'white',
        borderTopLeftRadius: arcW / 2,
        borderTopRightRadius: arcW / 2,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 0,
        opacity: arcOp,
      }} />

      {/* Horizontal line */}
      <Animated.View style={{
        position: 'absolute',
        left: LEFT_X + DOT_R,
        top: BOT_Y,
        width: arcW - DOT_R * 2,
        height: STROKE * 0.45,
        backgroundColor: 'white',
        borderRadius: 2,
        opacity: lineOp,
      }} />

      {/* Top circle */}
      <Animated.View style={[styles.circle, {
        width: TOP_R * 2, height: TOP_R * 2, borderRadius: TOP_R, borderWidth: STROKE,
        left: CX - TOP_R, top: TOP_Y - TOP_R,
        opacity: topOp, transform: [{ translateY: topY }],
      }]}>
        <View style={{ width: TOP_R * 0.7, height: TOP_R * 0.7, borderRadius: TOP_R, backgroundColor: 'rgba(255,255,255,0.25)' }} />
      </Animated.View>

      {/* Left circle */}
      <Animated.View style={[styles.circle, {
        width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R, borderWidth: STROKE * 0.82,
        left: LEFT_X - DOT_R, top: BOT_Y - DOT_R,
        opacity: leftOp, transform: [{ translateX: leftX }],
      }]}>
        <View style={{ width: DOT_R * 0.6, height: DOT_R * 0.6, borderRadius: DOT_R, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </Animated.View>

      {/* Right circle */}
      <Animated.View style={[styles.circle, {
        width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R, borderWidth: STROKE * 0.82,
        left: RIGHT_X - DOT_R, top: BOT_Y - DOT_R,
        opacity: rightOp, transform: [{ translateX: rightX }],
      }]}>
        <View style={{ width: DOT_R * 0.6, height: DOT_R * 0.6, borderRadius: DOT_R, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </Animated.View>

      {/* Text */}
      <Animated.Text style={[styles.title, {
        top: BOT_Y + DOT_R * 3,
        fontSize: LOGO * 0.11,
        opacity: textOp,
        transform: [{ translateY: textY }],
      }]}>
        AGAIN SCHOOL
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, {
        top: BOT_Y + DOT_R * 3 + LOGO * 0.15,
        fontSize: LOGO * 0.06,
        opacity: textOp,
        transform: [{ translateY: textY }],
      }]}>
        다시 만나는 학교 동창
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3124',
    zIndex: 9999,
    elevation: 9999,
  },
  circle: {
    position: 'absolute',
    borderColor: 'white',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: 'white',
    fontWeight: '800',
    letterSpacing: 3,
  },
  subtitle: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    letterSpacing: 1,
  },
});
