import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, AppState, Platform } from 'react-native';
import * as SMS from 'expo-sms';

const API_URL = 'https://plndmqvlkchbtcfeoson.supabase.co/functions/v1/sms-reply';
const API_KEY = 'xkFCkWe7drKKxkeCbGF2e2gkZcGOIVRaSDW0vzEk';

export default function App() {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [apiKey, setApiKey] = useState(API_KEY);
  const [apiUrl, setApiUrl] = useState(API_URL);
  const [lastSMS, setLastSMS] = useState(null);
  const appState = useRef(AppState.currentState);

  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, message }, ...prev].slice(0, 100));
  };

  const sendSMS = async (number, message) => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        addLog('❌ SMS haipatikani kwenye kifaa hiki');
        return false;
      }
      const result = await SMS.sendSMSAsync([number], message);
      if (result.result === 'sent') {
        addLog(`✅ SMS imetumwa kwa ${number}`);
        return true;
      } else {
        addLog(`❌ SMS haikutumwa`);
        return false;
      }
    } catch (error) {
      addLog(`❌ Kosa la SMS: ${error.message}`);
      return false;
    }
  };

  const getAIReply = async (from, message) => {
    try {
      addLog(`📤 Tuma API: "${message.substring(0, 50)}..."`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ from, message }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return data.reply || text;
      } catch {
        return text;
      }
    } catch (error) {
      addLog(`❌ API imeshindwa: ${error.message}`);
      return null;
    }
  };

  const handleIncomingSMS = async (from, message) => {
    if (!isRunning) return;
    
    addLog(`📩 SMS imepokelewa kutoka ${from}: "${message.substring(0, 30)}..."`);
    
    const reply = await getAIReply(from, message);
    if (reply) {
      addLog(`🤖 Jibu la AI: "${reply.substring(0, 50)}..."`);
      await sendSMS(from, reply);
    }
  };

  const startListening = async () => {
    try {
      const permission = await SMS.requestPermissionsAsync();
      if (permission.granted) {
        setIsRunning(true);
        addLog('🟢 Bot imeanza kufanya kazi');
        addLog('📡 Inasubiri SMS...');
        
        SMS.addSMSListener(async (event) => {
          if (event.result === 'received' && isRunning) {
            const { from, body } = event;
            await handleIncomingSMS(from, body);
          }
        });
      } else {
        Alert.alert('Ruhusa', 'Ruhusa ya SMS inahitajika.');
      }
    } catch (error) {
      addLog(`❌ Kosa: ${error.message}`);
    }
  };

  const stopListening = () => {
    setIsRunning(false);
    addLog('🔴 Bot imesimamishwa');
  };

  const testAPI = async () => {
    const reply = await getAIReply('+255712345678', 'Habari, naweza kupata huduma gani?');
    if (reply) addLog(`✅ Jibu: ${reply}`);
  };

  const testSMS = async () => {
    await sendSMS('+255712345678', 'Hii ni SMS ya majaribio kutoka Brim Edge.');
  };

  const testFull = async () => {
    addLog('🚀 Jaribio kamili...');
    await handleIncomingSMS('+255712345678', 'Habari, naweza kupata huduma gani?');
  };

  useEffect(() => {
    addLog('👋 Brim Edge SMS Bot imefunguliwa');
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📱 Brim Edge SMS Bot</Text>
      <Text style={styles.subtitle}>Automated Customer Service</Text>

      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>⚙️ Mipangilio</Text>
        <Text style={styles.label}>API URL:</Text>
        <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} placeholder="URL ya API" />
        <Text style={styles.label}>API Key:</Text>
        <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey} placeholder="API Key" secureTextEntry />
      </View>

      <View style={styles.buttonRow}>
        {!isRunning ? (
          <TouchableOpacity style={styles.startBtn} onPress={startListening}>
            <Text style={styles.btnText}>🟢 Anza Bot</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopListening}>
            <Text style={styles.btnText}>🔴 Simamisha Bot</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.fullTestBtn} onPress={testFull}>
        <Text style={styles.btnText}>🚀 Jaribu Kamili</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.testBtn} onPress={testAPI}>
          <Text style={styles.btnText}>🧪 Jaribu API</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testBtn} onPress={testSMS}>
          <Text style={styles.btnText}>📤 Jaribu SMS</Text>
        </TouchableOpacity>
      </View>

      {isRunning && (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>🟢 Bot inafanya kazi - Inasubiri SMS...</Text>
        </View>
      )}

      <View style={styles.logCard}>
        <Text style={styles.sectionTitle}>📋 Logs ({logs.length})</Text>
        {logs.length === 0 ? (
          <Text style={styles.logText}>Hakuna log bado...</Text>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <Text style={styles.logTime}>{log.time}</Text>
              <Text style={styles.logMsg}>{log.message}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16, paddingTop: 50 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#fff' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#aaa', marginBottom: 20 },
  settingsCard: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#fff' },
  label: { fontSize: 14, color: '#aaa', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14, color: '#fff', backgroundColor: '#0f3460' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  startBtn: { flex: 1, backgroundColor: '#00b894', padding: 14, borderRadius: 10, alignItems: 'center', marginRight: 5 },
  stopBtn: { flex: 1, backgroundColor: '#e17055', padding: 14, borderRadius: 10, alignItems: 'center', marginLeft: 5 },
  testBtn: { flex: 1, backgroundColor: '#0984e3', padding: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  fullTestBtn: { backgroundColor: '#fdcb6e', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statusCard: { backgroundColor: '#00b894', borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  logCard: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 16 },
  logItem: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', paddingVertical: 8 },
  logTime: { fontSize: 11, color: '#aaa', width: 75 },
  logMsg: { fontSize: 11, color: '#dfe6e9', flex: 1 },
  logText: { color: '#aaa', textAlign: 'center' },
});

export default App;
