import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGoBack } from '../../src/hooks/useGoBack';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PhotoViewerScreen() {
  const goBack = useGoBack();
  const { uri, year, desc } = useLocalSearchParams<{
    uri: string;
    year: string;
    desc: string;
  }>();

  return (
    <View style={styles.container}>
      {/* 닫기 버튼 */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={goBack}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      {/* 사진 */}
      <Image
        source={{ uri: uri ?? '' }}
        style={styles.image}
        resizeMode="contain"
      />

      {/* 하단 정보 */}
      <View style={styles.infoBar}>
        <Text style={styles.year}>{year ?? ''}년</Text>
        <Text style={styles.desc}>{desc ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  infoBar: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  year: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  desc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
  },
});
