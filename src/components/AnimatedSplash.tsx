import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, StyleSheet,
  Dimensions, View,
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface Props { onFinish: () => void; }

export function AnimatedSplash({ onFinish }: Props) {
  const LOGO     = Math.min(width * 0.52, 210);
  const CX       = width / 2;
  const CY       = height / 2 - 30;

  const TOP_X    = CX;
  const TOP_Y    = CY - LOGO * 0.30;
  const LEFT_X   = CX - LOGO * 0.44;
  const LEFT_Y   = CY + LOGO * 0.28;
  const RIGHT_X  = CX + LOGO * 0.44;
  const RIGHT_Y  = CY + LOGO * 0.28;

  const TOP_R    = LOGO * 0.115;
  const DOT_R    = LOGO * 0.085;
  const INNER_R  = LOGO * 0.038;
  const STROKE   = LOGO * 0.068;

  const CTRL_X   = CX;
  const CTRL_Y   = TOP_Y - LOGO * 0.08;

  const topDotY      = useRef(new Animated.Value(-250)).current;
  const topDotOp     = useRef(new Animated.Value(0)).current;
  const leftDotX     = useRef(new Animated.Value(-width * 0.6)).current;
  const leftDotOp    = useRef(new Animated.Value(0)).current;
  const rightDotX    = useRef(new Animated.Value(width * 0.6)).current;
  const rightDotOp   = useRef(new Animated.Value(0)).current;
  const arcOp        = useRef(new Animated.Value(0)).current;
  const lineOp       = useRef(new Animated.Value(0)).current;
  const textOp       = useRef(new Animated.Value(0)).current;
  const containerOp  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const SP = { tension: 75, friction: 9, useNativeDriver: true };

    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.parallel([
          Animated.spring(topDotY,  { toValue: 0, ...SP }),
          Animated.timing(topDotOp, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.spring(leftDotX,  { toValue: 0, ...SP }),
            Animated.timing(leftDotOp, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.spring(rightDotX,  { toValue: 0, ...SP }),
            Animated.timing(rightDotOp, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]),
        ]),
      ]),
      Animated.delay(80),
      Animated.timing(arcOp, {
        toValue: 1, duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lineOp, {
        toValue: 1, duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(textOp, {
        toValue: 1, duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(650),
      Animated.timing(containerOp, {
        toValue: 0, duration: 380,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOp }]} pointerEvents="none">
      {/* SVG: arc + line */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: arcOp }]}>
        <Svg width={width} height={height}>
          <Path
            d={`M ${LEFT_X} ${LEFT_Y} Q ${CTRL_X} ${CTRL_Y} ${RIGHT_X} ${RIGHT_Y}`}
            fill="none"
            stroke="white"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: lineOp }]}>
        <Svg width={width} height={height}>
          <Line
            x1={LEFT_X + DOT_R * 0.9}
            y1={LEFT_Y}
            x2={RIGHT_X - DOT_R * 0.9}
            y2={RIGHT_Y}
            stroke="white"
            strokeWidth={STROKE * 0.45}
            strokeLinecap="round"
            opacity={0.3}
          />
        </Svg>
      </Animated.View>

      {/* Top circle */}
      <Animated.View style={[
        styles.circle,
        {
          width: TOP_R * 2, height: TOP_R * 2,
          borderRadius: TOP_R, borderWidth: STROKE,
          left: TOP_X - TOP_R, top: TOP_Y - TOP_R,
          opacity: topDotOp,
          transform: [{ translateY: topDotY }],
        }
      ]}>
        <View style={[styles.innerDot, {
          width: INNER_R * 2, height: INNER_R * 2,
          borderRadius: INNER_R,
          backgroundColor: '#FF3124',
        }]} />
      </Animated.View>

      {/* Left circle */}
      <Animated.View style={[
        styles.circle,
        {
          width: DOT_R * 2, height: DOT_R * 2,
          borderRadius: DOT_R, borderWidth: STROKE * 0.82,
          left: LEFT_X - DOT_R, top: LEFT_Y - DOT_R,
          opacity: leftDotOp,
          transform: [{ translateX: leftDotX }],
        }
      ]}>
        <View style={[styles.innerDot, {
          width: INNER_R * 1.6, height: INNER_R * 1.6,
          borderRadius: INNER_R,
          backgroundColor: '#FF3124',
        }]} />
      </Animated.View>

      {/* Right circle */}
      <Animated.View style={[
        styles.circle,
        {
          width: DOT_R * 2, height: DOT_R * 2,
          borderRadius: DOT_R, borderWidth: STROKE * 0.82,
          left: RIGHT_X - DOT_R, top: RIGHT_Y - DOT_R,
          opacity: rightDotOp,
          transform: [{ translateX: rightDotX }],
        }
      ]}>
        <View style={[styles.innerDot, {
          width: INNER_R * 1.6, height: INNER_R * 1.6,
          borderRadius: INNER_R,
          backgroundColor: '#FF3124',
        }]} />
      </Animated.View>

      {/* Text */}
      <Animated.Text style={[
        styles.text,
        {
          top: LEFT_Y + DOT_R * 2.8,
          fontSize: LOGO * 0.115,
          opacity: textOp,
        }
      ]}>
        AGAIN SCHOOL
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
  innerDot: {
    position: 'absolute',
  },
  text: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: 'white',
    fontWeight: '700',
    letterSpacing: 3,
  },
});
