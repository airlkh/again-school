import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers } from '../services/userService';
import { useTheme } from '../contexts/ThemeContext';

type TaggedUser = { uid: string; displayName: string; photoURL?: string };

interface Props {
  taggedUsers: TaggedUser[];
  onChange: (users: TaggedUser[]) => void;
}

export function UserTagSelector({ taggedUsers, onChange }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TaggedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const users = await searchUsers(text);
      setResults(users.filter(u => !taggedUsers.find(t => t.uid === u.uid)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [taggedUsers]);

  const addUser = (user: TaggedUser) => {
    onChange([...taggedUsers, user]);
    setQuery('');
    setResults([]);
  };

  const removeUser = (uid: string) => {
    onChange(taggedUsers.filter(u => u.uid !== uid));
  };

  return (
    <View>
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="person-add-outline" size={18} color={colors.inactive} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="이름으로 검색..."
          placeholderTextColor={colors.inactive}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {results.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {results.slice(0, 5).map(user => (
            <TouchableOpacity
              key={user.uid}
              style={styles.resultItem}
              onPress={() => addUser(user)}
            >
              {user.photoURL
                ? <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                : <View style={[styles.avatar, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={14} color={colors.inactive} />
                  </View>
              }
              <Text style={[styles.resultName, { color: colors.text }]}>{user.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {taggedUsers.length > 0 && (
        <View style={styles.taggedRow}>
          {taggedUsers.map(user => (
            <TouchableOpacity
              key={user.uid}
              style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => removeUser(user.uid)}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>@{user.displayName}</Text>
              <Ionicons name="close" size={14} color={colors.inactive} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 8,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 10 },
  dropdown: {
    borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  resultName: { fontSize: 14, fontWeight: '500' },
  taggedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
  },
  tagText: { fontSize: 13, fontWeight: '600' },
});
