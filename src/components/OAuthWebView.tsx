import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface OAuthWebViewProps {
  visible: boolean;
  authUrl: string;
  redirectUri: string;
  onCodeReceived: (code: string) => void;
  onClose: () => void;
  title: string;
}

export function OAuthWebView({
  visible,
  authUrl,
  redirectUri,
  onCodeReceived,
  onClose,
  title,
}: OAuthWebViewProps) {
  function extractCode(url: string): string | null {
    const match = url.match(/[?&]code=([^&]+)/);
    return match ? match[1] : null;
  }

  function handleNavigationStateChange(navState: WebViewNavigation) {
    const { url } = navState;
    if (url && url.startsWith(redirectUri)) {
      const code = extractCode(url);
      if (code) {
        onCodeReceived(code);
      } else {
        onClose();
      }
    }
  }

  function handleShouldStartLoad(request: { url: string }): boolean {
    const { url } = request;
    console.log('[OAuthWebView] URL:', url?.substring(0, 100));
    if (url && url.startsWith(redirectUri)) {
      console.log('[OAuthWebView] redirectUri 감지!');
      const code = extractCode(url);
      if (code) {
        console.log('[OAuthWebView] code 추출 성공:', code?.substring(0, 20));
        onCodeReceived(code);
      } else {
        onClose();
      }
      return false;
    }
    return true;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>
        <WebView
          source={{ uri: authUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
});
