import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Image,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_CROP = 60;
const HANDLE_SIZE = 36;

type CropRatio = 'free' | '1:1' | '4:5' | '9:16' | '16:9';
type DragType =
  | 'move'
  | 'tl' | 'tr' | 'bl' | 'br'
  | 'top' | 'bottom' | 'left' | 'right'
  | null;

interface CropEditorProps {
  imageUri: string;
  onCropDone: (croppedUri: string) => void;
  onCancel: () => void;
}

export const CropEditor: React.FC<CropEditorProps> = ({
  imageUri,
  onCropDone,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();

  // Image natural size
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  // Image display size & offset (fit to screen)
  const [displaySize, setDisplaySize] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  // Crop box (screen coords)
  const [cropBox, setCropBox] = useState({
    x: SCREEN_WIDTH * 0.1,
    y: 100,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
  });

  const [ratio, setRatio] = useState<CropRatio>('free');
  const [processing, setProcessing] = useState(false);

  // Drag refs
  const dragType = useRef<DragType>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startBox = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Computed image area bounds
  const imgBounds = useMemo(() => ({
    left: imageOffset.x,
    top: imageOffset.y,
    right: imageOffset.x + displaySize.width,
    bottom: imageOffset.y + displaySize.height,
  }), [imageOffset, displaySize]);

  const handleImageLoad = (e: { nativeEvent: { source: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.source;
    setImageSize({ width, height });

    const headerH = insets.top + 50;
    const footerH = 70 + insets.bottom;
    const availableH = SCREEN_HEIGHT - headerH - footerH;

    const displayW = SCREEN_WIDTH;
    const displayH = (height / width) * SCREEN_WIDTH;
    const finalH = Math.min(displayH, availableH);
    const finalW = displayH > availableH ? (width / height) * finalH : displayW;

    const offsetX = (SCREEN_WIDTH - finalW) / 2;
    const offsetY = headerH + (availableH - finalH) / 2;

    setDisplaySize({ width: finalW, height: finalH });
    setImageOffset({ x: offsetX, y: offsetY });

    // Initial crop box = full image area
    setCropBox({
      x: offsetX,
      y: offsetY,
      width: finalW,
      height: finalH,
    });
  };

  // Clamp crop box within image bounds
  function clampBox(box: { x: number; y: number; width: number; height: number }) {
    let { x, y, width: w, height: h } = box;
    w = Math.max(MIN_CROP, Math.min(w, imgBounds.right - imgBounds.left));
    h = Math.max(MIN_CROP, Math.min(h, imgBounds.bottom - imgBounds.top));
    x = Math.max(imgBounds.left, Math.min(x, imgBounds.right - w));
    y = Math.max(imgBounds.top, Math.min(y, imgBounds.bottom - h));
    return { x, y, width: w, height: h };
  }

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      startPos.current = { x: pageX, y: pageY };
      startBox.current = { ...cropBox };

      const { x, y, width: w, height: h } = cropBox;
      const H = HANDLE_SIZE;

      // Detect which part is being dragged
      const inLeft = pageX >= x - H / 2 && pageX <= x + H;
      const inRight = pageX >= x + w - H && pageX <= x + w + H / 2;
      const inTop = pageY >= y - H / 2 && pageY <= y + H;
      const inBottom = pageY >= y + h - H && pageY <= y + h + H / 2;

      if (inLeft && inTop) dragType.current = 'tl';
      else if (inRight && inTop) dragType.current = 'tr';
      else if (inLeft && inBottom) dragType.current = 'bl';
      else if (inRight && inBottom) dragType.current = 'br';
      else if (inTop) dragType.current = 'top';
      else if (inBottom) dragType.current = 'bottom';
      else if (inLeft) dragType.current = 'left';
      else if (inRight) dragType.current = 'right';
      else if (
        pageX >= x && pageX <= x + w &&
        pageY >= y && pageY <= y + h
      ) dragType.current = 'move';
      else dragType.current = null;
    },

    onPanResponderMove: (_e, gesture) => {
      if (!dragType.current) return;
      const dx = gesture.moveX - startPos.current.x;
      const dy = gesture.moveY - startPos.current.y;
      const sb = startBox.current;

      let newBox = { ...sb };

      switch (dragType.current) {
        case 'move':
          newBox = { ...sb, x: sb.x + dx, y: sb.y + dy };
          break;
        case 'tl':
          newBox = {
            x: sb.x + dx,
            y: sb.y + dy,
            width: sb.width - dx,
            height: sb.height - dy,
          };
          break;
        case 'tr':
          newBox = {
            x: sb.x,
            y: sb.y + dy,
            width: sb.width + dx,
            height: sb.height - dy,
          };
          break;
        case 'bl':
          newBox = {
            x: sb.x + dx,
            y: sb.y,
            width: sb.width - dx,
            height: sb.height + dy,
          };
          break;
        case 'br':
          newBox = {
            x: sb.x,
            y: sb.y,
            width: sb.width + dx,
            height: sb.height + dy,
          };
          break;
        case 'top':
          newBox = {
            ...sb,
            y: sb.y + dy,
            height: sb.height - dy,
          };
          break;
        case 'bottom':
          newBox = { ...sb, height: sb.height + dy };
          break;
        case 'left':
          newBox = {
            ...sb,
            x: sb.x + dx,
            width: sb.width - dx,
          };
          break;
        case 'right':
          newBox = { ...sb, width: sb.width + dx };
          break;
      }

      // Enforce ratio
      if (ratio !== 'free' && dragType.current !== 'move') {
        const [rw, rh] = ratio.split(':').map(Number);
        const aspect = rh / rw;
        // Adjust height to match width ratio
        newBox.height = newBox.width * aspect;
      }

      setCropBox(clampBox(newBox));
    },

    onPanResponderRelease: () => {
      dragType.current = null;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cropBox, ratio, imgBounds]);

  const handleRatioChange = (newRatio: CropRatio) => {
    setRatio(newRatio);
    if (newRatio === 'free') return;

    const [rw, rh] = newRatio.split(':').map(Number);
    const aspect = rh / rw;
    const imgW = imgBounds.right - imgBounds.left;
    const imgH = imgBounds.bottom - imgBounds.top;

    let w = imgW;
    let h = w * aspect;
    if (h > imgH) {
      h = imgH;
      w = h / aspect;
    }
    const x = imgBounds.left + (imgW - w) / 2;
    const y = imgBounds.top + (imgH - h) / 2;
    setCropBox({ x, y, width: w, height: h });
  };

  const handleCrop = async () => {
    if (imageSize.width === 0 || processing) return;
    setProcessing(true);

    try {
      const scaleX = imageSize.width / displaySize.width;
      const scaleY = imageSize.height / displaySize.height;

      const originX = Math.max(0, (cropBox.x - imageOffset.x) * scaleX);
      const originY = Math.max(0, (cropBox.y - imageOffset.y) * scaleY);
      const cropW = Math.min(cropBox.width * scaleX, imageSize.width - originX);
      const cropH = Math.min(cropBox.height * scaleY, imageSize.height - originY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{
          crop: {
            originX: Math.round(originX),
            originY: Math.round(originY),
            width: Math.round(Math.max(1, cropW)),
            height: Math.round(Math.max(1, cropH)),
          },
        }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      onCropDone(result.uri);
    } catch (err) {
      console.error('자르기 오류:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={onCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.headerCancelBtn}
        >
          <Text style={s.headerCancel}>취소</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>자르기</Text>
        <TouchableOpacity
          onPress={handleCrop}
          disabled={processing}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.headerDoneBtn}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.headerDone}>확인</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Image + Crop overlay */}
      <View style={s.canvas} {...panResponder.panHandlers}>
        {/* Image */}
        <Image
          source={{ uri: imageUri }}
          style={{
            position: 'absolute',
            left: imageOffset.x,
            top: imageOffset.y,
            width: displaySize.width,
            height: displaySize.height,
          }}
          resizeMode="contain"
          onLoad={handleImageLoad}
        />

        {/* Dark overlay outside crop */}
        {/* Top */}
        <View style={[s.overlay, { left: 0, top: 0, width: SCREEN_WIDTH, height: cropBox.y }]} />
        {/* Bottom */}
        <View style={[s.overlay, { left: 0, top: cropBox.y + cropBox.height, width: SCREEN_WIDTH, bottom: 0 }]} />
        {/* Left */}
        <View style={[s.overlay, { left: 0, top: cropBox.y, width: cropBox.x, height: cropBox.height }]} />
        {/* Right */}
        <View style={[s.overlay, { left: cropBox.x + cropBox.width, top: cropBox.y, right: 0, height: cropBox.height }]} />

        {/* Crop box border */}
        <View style={[s.cropBorder, {
          left: cropBox.x,
          top: cropBox.y,
          width: cropBox.width,
          height: cropBox.height,
        }]}>
          {/* Grid lines */}
          <View style={[s.gridV, { left: '33.33%' }]} />
          <View style={[s.gridV, { left: '66.66%' }]} />
          <View style={[s.gridH, { top: '33.33%' }]} />
          <View style={[s.gridH, { top: '66.66%' }]} />

          {/* Corner handles - TL */}
          <View style={[s.cornerWrap, { top: -2, left: -2 }]}>
            <View style={[s.cornerH, { width: 22 }]} />
            <View style={[s.cornerV, { height: 22, marginTop: -3 }]} />
          </View>
          {/* TR */}
          <View style={[s.cornerWrap, { top: -2, right: -2, alignItems: 'flex-end' }]}>
            <View style={[s.cornerH, { width: 22 }]} />
            <View style={[s.cornerV, { height: 22, marginTop: -3 }]} />
          </View>
          {/* BL */}
          <View style={[s.cornerWrap, { bottom: -2, left: -2 }]}>
            <View style={[s.cornerV, { height: 22 }]} />
            <View style={[s.cornerH, { width: 22, marginTop: -3 }]} />
          </View>
          {/* BR */}
          <View style={[s.cornerWrap, { bottom: -2, right: -2, alignItems: 'flex-end' }]}>
            <View style={[s.cornerV, { height: 22 }]} />
            <View style={[s.cornerH, { width: 22, marginTop: -3 }]} />
          </View>
        </View>
      </View>

      {/* Ratio bar */}
      <View style={[s.ratioBar, { paddingBottom: insets.bottom + 12 }]}>
        {(['free', '1:1', '4:5', '9:16', '16:9'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => handleRatioChange(r)}
            style={[s.ratioBtn, ratio === r && s.ratioBtnActive]}
          >
            <Text style={[s.ratioBtnText, ratio === r && s.ratioBtnTextActive]}>
              {r === 'free' ? '자유' : r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#000',
    zIndex: 100,
  },
  headerCancelBtn: {
    minWidth: 60,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerCancel: { color: '#fff', fontSize: 16, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerDoneBtn: {
    minWidth: 60,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: '#e8313a',
    borderRadius: 8,
  },
  headerDone: { color: '#fff', fontSize: 15, fontWeight: '700' },
  canvas: { flex: 1 },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  cropBorder: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    width: 0.5,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gridH: {
    position: 'absolute',
    left: 0,
    height: 0.5,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cornerWrap: { position: 'absolute' },
  cornerH: { height: 3, backgroundColor: '#fff' },
  cornerV: { width: 3, backgroundColor: '#fff' },
  ratioBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
    paddingHorizontal: 12,
    backgroundColor: '#111',
  },
  ratioBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ratioBtnActive: { backgroundColor: '#e8313a' },
  ratioBtnText: { color: '#fff', fontSize: 12, fontWeight: '400' },
  ratioBtnTextActive: { fontWeight: '700' },
});
