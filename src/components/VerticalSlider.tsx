import React, { useRef, useMemo, useState } from 'react';
import { View, PanResponder } from 'react-native';

const THUMB_SIZE = 28;
const TRACK_WIDTH = 6;

interface VerticalSliderProps {
  value: number;
  onChange: (value: number) => void;
  height?: number;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({
  value,
  onChange,
  height = 200,
}) => {
  const startY = useRef(0);
  const startValue = useRef(value);

  const thumbY = (1 - value) * (height - THUMB_SIZE);
  const filledH = value * (height - THUMB_SIZE) + THUMB_SIZE / 2;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      startY.current = e.nativeEvent.pageY;
      startValue.current = value;
    },
    onPanResponderMove: (e) => {
      const dy = e.nativeEvent.pageY - startY.current;
      const delta = -dy / (height - THUMB_SIZE);
      onChange(Math.min(1, Math.max(0, startValue.current + delta)));
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [value, height, onChange]);

  return (
    <View
      style={{ width: THUMB_SIZE + 16, height, alignItems: 'center', justifyContent: 'center' }}
      {...panResponder.panHandlers}
    >
      {/* Track background */}
      <View style={{
        width: TRACK_WIDTH,
        height: height - THUMB_SIZE,
        borderRadius: TRACK_WIDTH / 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        position: 'absolute',
        top: THUMB_SIZE / 2,
      }} />
      {/* Filled track */}
      <View style={{
        width: TRACK_WIDTH,
        height: filledH,
        borderRadius: TRACK_WIDTH / 2,
        backgroundColor: 'rgba(255,255,255,0.8)',
        position: 'absolute',
        bottom: THUMB_SIZE / 2,
      }} />
      {/* Thumb */}
      <View style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#fff',
        position: 'absolute',
        top: thumbY,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }} />
    </View>
  );
};

// ─── Horizontal Slider (for meetup create) ────────────────────────

interface HorizontalSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
  value,
  onChange,
}) => {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const startX = useRef(0);
  const startValue = useRef(value);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      startX.current = e.nativeEvent.pageX;
      startValue.current = value;
    },
    onPanResponderMove: (e) => {
      if (layoutWidth === 0) return;
      const dx = e.nativeEvent.pageX - startX.current;
      const delta = dx / layoutWidth;
      onChange(Math.min(1, Math.max(0, startValue.current + delta)));
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [value, layoutWidth, onChange]);

  const THUMB = 24;
  const thumbLeft = layoutWidth > 0 ? value * (layoutWidth - THUMB) : 0;

  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, height: 40, justifyContent: 'center' }}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View style={{
        position: 'absolute',
        left: thumbLeft,
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB / 2,
        backgroundColor: '#e8313a',
        top: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
      }} />
    </View>
  );
};
