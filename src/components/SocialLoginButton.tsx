import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ProviderConfig {
  label: string;
  bgColor: string;
  textColor: string;
  icon: IoniconsName;
  borderColor: string;
}

const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
  kakao: {
    label: '카카오',
    bgColor: '#FEE500',
    textColor: '#3C1E1E',
    icon: 'chatbubble',
    borderColor: '#FEE500',
  },
  naver: {
    label: '네이버',
    bgColor: '#03C75A',
    textColor: '#ffffff',
    icon: 'navigate',
    borderColor: '#03C75A',
  },
  google: {
    label: 'Google',
    bgColor: '#ffffff',
    textColor: '#333333',
    icon: 'logo-google',
    borderColor: '#dadce0',
  },
  apple: {
    label: 'Apple',
    bgColor: '#000000',
    textColor: '#ffffff',
    icon: 'logo-apple',
    borderColor: '#000000',
  },
};

interface SocialLoginButtonProps {
  provider: 'kakao' | 'naver' | 'google' | 'apple';
  onPress: () => void;
  isLoading?: boolean;
}

export function SocialLoginButton({
  provider,
  onPress,
  isLoading,
}: SocialLoginButtonProps) {
  const config = PROVIDER_CONFIG[provider];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color={config.textColor} size="small" />
      ) : (
        <>
          <Ionicons name={config.icon} size={18} color={config.textColor} />
          <Text style={[styles.label, { color: config.textColor }]}>
            {config.label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
