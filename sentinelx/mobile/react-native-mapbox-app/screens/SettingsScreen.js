import React, { useContext, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../theme/ThemeContext';
import { DEFAULT_USER_ID } from '../services/config';
import { registerUserDevice } from '../services/incidentsApi';

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [phone, setPhone] = useState('');

  const cardAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      friction: 8,
      tension: 45,
      useNativeDriver: true
    }).start();
  }, [cardAnim]);

  const syncPreferences = async (nextOptIn, nextPhone = phone) => {
    try {
      await registerUserDevice({
        user_id: DEFAULT_USER_ID,
        phone_number: nextPhone,
        sms_opt_in: nextOptIn
      });
    } catch (error) {
      Alert.alert('Sync failed', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>System Preferences</Text>

      <Animated.View
        style={[
          styles.card,
          isDarkMode && styles.darkCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
              }
            ]
          }
        ]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Dark Theme Map</Text>
            <Text style={styles.meta}>High-contrast map style for operations.</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} />
        </View>

        <View style={styles.separator} />

        <View style={styles.rowNoInline}>
          <View style={styles.smsInfoWrap}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>SMS Opt-In</Text>
            <Text style={styles.meta}>Enable Twilio fallback alerts with daily limit.</Text>
          </View>
          <Switch
            value={smsOptIn}
            onValueChange={(value) => {
              setSmsOptIn(value);
              syncPreferences(value);
            }}
          />
        </View>

        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number (+91...)"
          placeholderTextColor="#6b7280"
          keyboardType="phone-pad"
          onEndEditing={() => syncPreferences(smsOptIn, phone)}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          isDarkMode && styles.darkCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] })
              }
            ]
          }
        ]}>
        <Text style={[styles.label, isDarkMode && styles.darkText]}>Diagnostics</Text>
        <Text style={styles.meta}>Connection and map status are now shown directly on the map screen.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf3fa',
    padding: 16
  },
  darkContainer: {
    backgroundColor: '#020617'
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16
  },
  darkText: {
    color: '#f8fafc'
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d3e4f6',
    shadowColor: '#0f172a',
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5
  },
  darkCard: {
    backgroundColor: 'rgba(17,24,39,0.9)',
    borderColor: '#1f2937'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowNoInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  smsInfoWrap: {
    flex: 1,
    marginRight: 10
  },
  label: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700'
  },
  meta: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 12,
    maxWidth: 250
  },
  separator: {
    marginVertical: 12,
    height: 1,
    backgroundColor: '#dbeafe'
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#111827'
  },
  inputDark: {
    borderColor: '#374151',
    color: '#f8fafc'
  }
});




