import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const LOGO = Math.min(width * 0.5, 200);
  const CX = width / 2;
  const CY = height / 2 - 30;
  const DOT_R = LOGO * 0.1;
  const STROKE = LOGO * 0.065;

  // Animation values
  const topY = useRef(new Animated.Value(-150)).current;
  const topOp = useRef(new Animated.Value(0)).current;
  const leftX = useRef(new Animated.Value(-200)).current;
  const leftOp = useRef(new Animated.Value(0)).current;
  const rightX = useRef(new Animated.Value(200)).current;
  const rightOp = useRef(new Animated.Value(0)).current;
  const lineOp = useRef(new Animated.Value(0)).current;
  const arcOp = useRef(new Animated.Value(0)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  // Arc segments (simulate curve with rotated views)
  const arcScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spring = { tension: 80, friction: 9, useNativeDriver: true };

    Animated.sequence([
      Animated.delay(300),
      // 1. Top dot drops in
      Animated.parallel([
        Animated.spring(topY, { toValue: 0, ...spring }),
        Animated.timing(topOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      // 2. Left & right dots slide in
      Animated.parallel([
        Animated.spring(leftX, { toValue: 0, ...spring }),
        Animated.timing(leftOp, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(rightX, { toValue: 0, ...spring }),
        Animated.timing(rightOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      // 3. Arc appears
      Animated.parallel([
        Animated.timing(arcOp, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(arcScale, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      ]),
      // 4. Horizontal line
      Animated.timing(lineOp, { toValue: 0.3, duration: 250, useNativeDriver: true }),
      // 5. Text fades up
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      // 6. Hold
      Animated.delay(600),
      // 7. Fade out
      Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  const TOP_Y = CY - LOGO * 0.45;
  const LEFT_X = CX - LOGO * 0.48;
  const BOT_Y = CY + LOGO * 0.32;
  const RIGHT_X = CX + LOGO * 0.48;

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]} pointerEvents="none">
      {/* Top dot */}
      <Animated.View style={[styles.dot, {
        width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R, borderWidth: STROKE,
        left: CX - DOT_R, top: TOP_Y - DOT_R,
        opacity: topOp, transform: [{ translateY: topY }],
      }]}>
        <View style={[styles.dotInner, { width: DOT_R * 0.7, height: DOT_R * 0.7, borderRadius: DOT_R * 0.35, opacity: 0.25 }]} />
      </Animated.View>

      {/* Left dot */}
      <Animated.View style={[styles.dot, {
        width: DOT_R * 1.6, height: DOT_R * 1.6, borderRadius: DOT_R, borderWidth: STROKE * 0.85,
        left: LEFT_X - DOT_R * 0.8, top: BOT_Y - DOT_R * 0.8,
        opacity: leftOp, transform: [{ translateX: leftX }],
      }]}>
        <View style={[styles.dotInner, { width: DOT_R * 0.55, height: DOT_R * 0.55, borderRadius: DOT_R * 0.3, opacity: 0.2 }]} />
      </Animated.View>

      {/* Right dot */}
      <Animated.View style={[styles.dot, {
        width: DOT_R * 1.6, height: DOT_R * 1.6, borderRadius: DOT_R, borderWidth: STROKE * 0.85,
        left: RIGHT_X - DOT_R * 0.8, top: BOT_Y - DOT_R * 0.8,
        opacity: rightOp, transform: [{ translateX: rightX }],
      }]}>
        <View style={[styles.dotInner, { width: DOT_R * 0.55, height: DOT_R * 0.55, borderRadius: DOT_R * 0.3, opacity: 0.2 }]} />
      </Animated.View>

      {/* Arc (curved line simulated with border) */}
      <Animated.View style={{
        position: 'absolute',
        left: LEFT_X,
        top: TOP_Y - LOGO * 0.15,
        width: RIGHT_X - LEFT_X,
        height: (BOT_Y - TOP_Y) + LOGO * 0.15,
        borderWidth: STROKE,
        borderColor: 'white',
        borderTopLeftRadius: (RIGHT_X - LEFT_X) * 0.5,
        borderTopRightRadius: (RIGHT_X - LEFT_X) * 0.5,
        borderBottomWidth: 0,
        opacity: arcOp,
        transform: [{ scaleY: arcScale }],
      }} />

      {/* Horizontal line */}
      <Animated.View style={[styles.line, {
        left: LEFT_X + DOT_R,
        top: BOT_Y,
        width: RIGHT_X - LEFT_X - DOT_R * 2,
        height: STROKE * 0.5,
        opacity: lineOp,
      }]} />

      {/* Text */}
      <Animated.Text style={[styles.text, {
        top: BOT_Y + DOT_R * 3.5,
        fontSize: LOGO * 0.115,
        opacity: textOp,
        transform: [{ translateY: textY }],
      }]}>
        AGAIN SCHOOL
      </Animated.Text>
      <Animated.Text style={[styles.subtext, {
        top: BOT_Y + DOT_R * 3.5 + LOGO * 0.16,
        fontSize: LOGO * 0.065,
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
  dot: {
    position: 'absolute',
    borderColor: 'white',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    backgroundColor: 'white',
  },
  line: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  text: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: 'white',
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtext: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    letterSpacing: 1,
  },
});
