import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Props {
  children: React.ReactNode;
  extraHeight?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  bounces?: boolean;
}

export function KeyboardScrollView({
  children,
  extraHeight = 120,
  contentContainerStyle,
  style,
  showsVerticalScrollIndicator = false,
  bounces,
}: Props) {
  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      enableAutomaticScroll
      extraScrollHeight={extraHeight}
      extraHeight={extraHeight}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      bounces={bounces}
      style={style}
      contentContainerStyle={[{ paddingBottom: 120 }, contentContainerStyle]}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
