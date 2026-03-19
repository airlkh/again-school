import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';

// ─── Font config ──────────────────────────────────────────────────
export const FONTS = [
  { key: 'default', label: '기본', fontFamily: undefined, fontWeight: '700' as const },
  { key: 'bold', label: '굵게', fontFamily: undefined, fontWeight: '900' as const },
  {
    key: 'serif',
    label: '명조',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700' as const,
  },
  {
    key: 'mono',
    label: '고정폭',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '700' as const,
  },
  {
    key: 'rounded',
    label: '둥근',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
    fontWeight: '700' as const,
  },
];

/** Get font style object from fontKey */
export function getFontStyle(fontKey?: string) {
  const font = FONTS.find((f) => f.key === fontKey) || FONTS[0];
  return { fontFamily: font.fontFamily, fontWeight: font.fontWeight };
}

// ─── Font Picker Modal ───────────────────────────────────────────
export const FontPickerModal: React.FC<{
  visible: boolean;
  selected: string;
  onSelect: (fontKey: string) => void;
  onClose: () => void;
}> = ({ visible, selected, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={fp.overlay} activeOpacity={1} onPress={onClose}>
      <View onStartShouldSetResponder={() => true}>
        <View style={fp.sheet}>
          <Text style={fp.title}>글꼴 선택</Text>
          {FONTS.map((font) => (
            <TouchableOpacity
              key={font.key}
              onPress={() => { onSelect(font.key); onClose(); }}
              style={[fp.row, selected === font.key && fp.rowActive]}
            >
              <Text
                style={[
                  fp.preview,
                  { fontFamily: font.fontFamily, fontWeight: font.fontWeight },
                ]}
              >
                가나다라 ABC 123
              </Text>
              <Text style={[fp.label, selected === font.key && fp.labelActive]}>
                {font.label}
                {selected === font.key ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={fp.doneBtn}>
            <Text style={fp.doneText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

const fp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  rowActive: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#FF3124' },
  preview: { fontSize: 18, color: '#333' },
  label: { fontSize: 13, color: '#999', fontWeight: '600' },
  labelActive: { color: '#FF3124' },
  doneBtn: {
    backgroundColor: '#FF3124',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Draggable Text for meetup create ─────────────────────────────
export const DraggableText: React.FC<{
  text: string;
  color: string;
  fontSize: number;
  fontKey: string;
  bgStyle: 'none' | 'translucent' | 'solid';
  containerWidth: number;
  containerHeight: number;
  initialX?: number;
  initialY?: number;
  onPositionChange?: (x: number, y: number) => void;
}> = ({
  text,
  color,
  fontSize,
  fontKey,
  bgStyle,
  containerWidth,
  containerHeight,
  initialX,
  initialY,
  onPositionChange,
}) => {
  const font = getFontStyle(fontKey);
  const pan = useRef(
    new Animated.ValueXY({
      x: initialX ?? containerWidth / 2 - 60,
      y: initialY ?? containerHeight / 2 - fontSize,
    }),
  ).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.extractOffset();
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          if (onPositionChange) {
            // @ts-ignore — access internal value
            onPositionChange(pan.x._value, pan.y._value);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!text.trim()) return null;

  const bg =
    bgStyle === 'solid'
      ? 'rgba(0,0,0,0.7)'
      : bgStyle === 'translucent'
        ? 'rgba(0,0,0,0.35)'
        : 'transparent';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: pan.getTranslateTransform(),
        zIndex: 10,
        maxWidth: containerWidth * 0.85,
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          backgroundColor: bg,
          borderRadius: 6,
          paddingHorizontal: bg !== 'transparent' ? 10 : 0,
          paddingVertical: bg !== 'transparent' ? 5 : 0,
        }}
      >
        <Text
          style={{
            color,
            fontSize,
            fontFamily: font.fontFamily,
            fontWeight: font.fontWeight,
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.7)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
          }}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
};
