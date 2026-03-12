import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentLocation, LocationData } from '../services/locationService';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  location: LocationData | null;
  onChange: (location: LocationData | null) => void;
}

export function LocationSelector({ location, onChange }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        Alert.alert('위치 오류', '위치를 가져올 수 없습니다. 설정에서 위치 권한을 허용해주세요.');
        return;
      }
      onChange(loc);
    } finally {
      setLoading(false);
    }
  };

  const locationLabel = location
    ? [location.district, location.city].filter(Boolean).join(', ') || location.address || '위치 추가됨'
    : null;

  return (
    <View>
      {location ? (
        <View style={[styles.locationChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>{locationLabel}</Text>
          <TouchableOpacity onPress={() => onChange(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={16} color={colors.inactive} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="location-outline" size={18} color={colors.primary} />
          }
          <Text style={[styles.addBtnText, { color: colors.primary }]}>
            {loading ? '위치 가져오는 중...' : '현재 위치 추가'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8,
  },
  locationText: { flex: 1, fontSize: 14 },
});
