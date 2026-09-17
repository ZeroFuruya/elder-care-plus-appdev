import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Screen = 'login' | 'register';
type Notice = { type: 'error' | 'success'; text: string } | null;

const careTasks = [
  { time: '10:00 AM', title: 'Cardiology checkup', detail: 'Elena Reyes · transport confirmed', tone: 'purple' },
  { time: '12:00 PM', title: 'Calcium reminder', detail: 'David Martinez · needs confirmation', tone: 'amber' },
  { time: '2:00 PM', title: 'Amlodipine dose', detail: 'Lorna Santos · 10 mg with food', tone: 'teal' },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#91A0B2"
          style={styles.input}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          secureTextEntry={secure && !visible}
          textContentType={secure ? 'password' : keyboardType === 'email-address' ? 'emailAddress' : 'username'}
        />
        {secure && (
          <Pressable onPress={() => setVisible((current) => !current)} hitSlop={10}>
            <Text style={styles.visibilityButton}>{visible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;

  return (
    <View style={[styles.notice, notice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
      <Text style={styles.noticeIcon}>{notice.type === 'success' ? '✓' : '!'}</Text>
      <Text style={[styles.noticeText, notice.type === 'success' ? styles.noticeTextSuccess : styles.noticeTextError]}>
        {notice.text}
      </Text>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('login');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayName = useMemo(() => {
    const name = session?.user.user_metadata.full_name as string | undefined;
    if (name?.trim()) return name.trim().split(' ')[0];
    return session?.user.email?.split('@')[0] || 'Caregiver';
  }, [session]);

  const handleLogin = async () => {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier && !password) {
      setNotice({ type: 'error', text: 'Enter your username or email and password.' });
      return;
    }
    if (!cleanIdentifier) {
      setNotice({ type: 'error', text: 'Username or email is required.' });
      return;
    }
    if (!password) {
      setNotice({ type: 'error', text: 'Password is required.' });
      return;
    }
    if (!supabase) {
      setNotice({ type: 'error', text: 'Supabase is not connected yet. Add the values in your .env file.' });
      return;
    }

    setBusy(true);
    setNotice(null);
    const { data: loginEmail, error: lookupError } = await supabase.rpc('resolve_login_email', {
      p_login: cleanIdentifier,
    });

    if (lookupError) {
      setBusy(false);
      setNotice({ type: 'error', text: 'The account lookup is unavailable. Run the supplied Supabase SQL setup first.' });
      return;
    }
    if (!loginEmail) {
      setBusy(false);
      setNotice({ type: 'error', text: 'Account does not exist. Check your username or create an account.' });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setBusy(false);

    if (error) {
      setNotice({ type: 'error', text: 'Incorrect username or password. Please try again.' });
      return;
    }

    setPassword('');
    setNotice({ type: 'success', text: 'Login successful. Welcome to Elder Care+.' });
  };

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanUsername || !cleanEmail || !registerPassword || !confirmPassword) {
      setNotice({ type: 'error', text: 'Complete all fields to create your account.' });
      return;
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
      setNotice({ type: 'error', text: 'Username must be 3–30 characters and use letters, numbers, dots, dashes, or underscores.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setNotice({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (registerPassword.length < 8) {
      setNotice({ type: 'error', text: 'Password must contain at least 8 characters.' });
      return;
    }
    if (registerPassword !== confirmPassword) {
      setNotice({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (!supabase) {
      setNotice({ type: 'error', text: 'Supabase is not connected yet. Add the values in your .env file.' });
      return;
    }

    setBusy(true);
    setNotice(null);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: registerPassword,
      options: { data: { full_name: cleanName, username: cleanUsername } },
    });
    setBusy(false);

    if (error) {
      const duplicate = error.message.toLowerCase().includes('already');
      setNotice({
        type: 'error',
        text: duplicate ? 'That email or username is already in use.' : error.message,
      });
      return;
    }

    setRegisterPassword('');
    setConfirmPassword('');
    if (!data.session) {
      setScreen('login');
      setIdentifier(cleanUsername);
      setNotice({ type: 'success', text: 'Account created. Check your email to confirm it, then sign in.' });
    } else {
      setNotice({ type: 'success', text: 'Account created successfully. Welcome to Elder Care+.' });
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out of Elder Care+?', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, sign out',
        style: 'destructive',
        onPress: async () => {
          if (!supabase) return;
          setBusy(true);
          const { error } = await supabase.auth.signOut();
          setBusy(false);
          if (error) {
            setNotice({ type: 'error', text: 'We could not sign you out. Please try again.' });
          } else {
            setIdentifier('');
            setPassword('');
            setScreen('login');
            setNotice({ type: 'success', text: 'You have been signed out safely.' });
          }
        },
      },
    ]);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>EC+</Text></View>
        <ActivityIndicator size="large" color="#0F8F79" style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Preparing your care workspace…</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (session) {
    return <Dashboard displayName={displayName} notice={notice} busy={busy} onLogout={handleLogout} />;
  }

  const isLogin = screen === 'login';
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.authHeader}>
            <View style={styles.logoMark}><Text style={styles.logoMarkText}>EC+</Text></View>
            <Text style={styles.brand}>Elder Care<Text style={styles.brandPlus}>+</Text></Text>
            <Text style={styles.tagline}>Care, connected.</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{isLogin ? 'Welcome back' : 'Create your account'}</Text>
            <Text style={styles.authSubtitle}>
              {isLogin ? 'Sign in to your secure care workspace.' : 'Start coordinating care with confidence.'}
            </Text>

            {!isSupabaseConfigured && (
              <View style={styles.configCard}>
                <Text style={styles.configTitle}>Setup required</Text>
                <Text style={styles.configText}>Copy .env.example to .env and add your Supabase Project URL and publishable key.</Text>
              </View>
            )}

            <NoticeBanner notice={notice} />

            {isLogin ? (
              <>
                <Field
                  label="Username or email"
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="e.g. caregiver.demo"
                  autoCapitalize="none"
                />
                <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secure />
                <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} disabled={busy} onPress={handleLogin}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Sign in securely</Text>}
                </Pressable>
                <Text style={styles.helperText}>Use your account username or email address.</Text>
              </>
            ) : (
              <>
                <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="e.g. Jamie Santos" autoCapitalize="words" />
                <Field label="Username" value={username} onChangeText={setUsername} placeholder="e.g. caregiver.demo" />
                <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
                <Field label="Password" value={registerPassword} onChangeText={setRegisterPassword} placeholder="At least 8 characters" secure />
                <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter it again" secure />
                <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} disabled={busy} onPress={handleRegister}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
                </Pressable>
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{isLogin ? 'New to Elder Care+?' : 'Already have an account?'}</Text>
              <Pressable
                onPress={() => {
                  setScreen(isLogin ? 'register' : 'login');
                  setNotice(null);
                }}
              >
                <Text style={styles.switchLink}>{isLogin ? 'Create account' : 'Sign in'}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footerText}>Protected care coordination for families and caregivers</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Dashboard({
  displayName,
  notice,
  busy,
  onLogout,
}: {
  displayName: string;
  notice: Notice;
  busy: boolean;
  onLogout: () => void;
}) {
  return (
    <SafeAreaView style={styles.dashboardSafeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.dashboardTopbar}>
          <View style={styles.dashboardBrandRow}>
            <View style={styles.smallLogoMark}><Text style={styles.smallLogoText}>EC+</Text></View>
            <Text style={styles.dashboardBrand}>Elder Care<Text style={styles.brandPlus}>+</Text></Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text></View>
        </View>

        <NoticeBanner notice={notice} />

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>CARE OPERATIONS · TODAY</Text>
          <Text style={styles.heroTitle}>Good day, {displayName}.</Text>
          <Text style={styles.heroSubtitle}>Here is the latest overview across your linked elders.</Text>
          <View style={styles.heroStatRow}>
            <View><Text style={styles.heroStatValue}>92%</Text><Text style={styles.heroStatLabel}>7-day adherence</Text></View>
            <View style={styles.heroStatDivider} />
            <View><Text style={styles.heroStatValue}>4</Text><Text style={styles.heroStatLabel}>linked elders</Text></View>
            <View style={styles.heroStatDivider} />
            <View><Text style={styles.heroStatValue}>2</Text><Text style={styles.heroStatLabel}>need attention</Text></View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Priority queue</Text><Text style={styles.sectionSubtitle}>Actions requiring caregiver review</Text></View>
          <Text style={styles.liveBadge}>● LIVE</Text>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
          <View style={styles.flex}><Text style={styles.alertTitle}>Calcium dose needs review</Text><Text style={styles.alertCopy}>David Martinez · scheduled at 12:00 PM</Text></View>
          <Text style={styles.alertArrow}>›</Text>
        </View>

        <View style={styles.sectionHeadingCompact}>
          <View><Text style={styles.sectionTitle}>Today’s care schedule</Text><Text style={styles.sectionSubtitle}>3 upcoming care actions</Text></View>
        </View>

        <View style={styles.scheduleCard}>
          {careTasks.map((task, index) => (
            <View key={task.title} style={[styles.scheduleRow, index < careTasks.length - 1 && styles.scheduleRowBorder]}>
              <Text style={styles.scheduleTime}>{task.time}</Text>
              <View style={[styles.scheduleDot, task.tone === 'purple' ? styles.dotPurple : task.tone === 'amber' ? styles.dotAmber : styles.dotTeal]} />
              <View style={styles.flex}><Text style={styles.scheduleTitle}>{task.title}</Text><Text style={styles.scheduleDetail}>{task.detail}</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeadingCompact}>
          <View><Text style={styles.sectionTitle}>Medication snapshot</Text><Text style={styles.sectionSubtitle}>Today across all care plans</Text></View>
        </View>
        <View style={styles.metricGrid}>
          <Metric value="10" label="Confirmed" color="#0F8F79" />
          <Metric value="3" label="Due later" color="#9C64D9" />
          <Metric value="1" label="Missed" color="#D85B63" />
        </View>

        <Pressable style={[styles.logoutButton, busy && styles.buttonDisabled]} disabled={busy} onPress={onLogout}>
          {busy ? <ActivityIndicator color="#B73942" /> : <Text style={styles.logoutButtonText}>Sign out</Text>}
        </Pressable>
        <Text style={styles.dashboardFooter}>Your session is managed by Supabase.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, label, color }: { value: string; label: string; color: string }) {
  return <View style={styles.metricCard}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F4F8F7' },
  loadingScreen: { flex: 1, backgroundColor: '#F4F8F7', justifyContent: 'center', alignItems: 'center' },
  loadingSpinner: { marginTop: 28 },
  loadingText: { color: '#5B6878', marginTop: 14, fontSize: 14 },
  authScroll: { flexGrow: 1, paddingHorizontal: 22, paddingVertical: 28 },
  authHeader: { alignItems: 'center', marginBottom: 26 },
  logoMark: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#0F8F79', alignItems: 'center', justifyContent: 'center', shadowColor: '#0A6658', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  logoMarkText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17, letterSpacing: -0.5 },
  brand: { color: '#183B3A', fontWeight: '800', fontSize: 27, marginTop: 12, letterSpacing: -0.7 },
  brandPlus: { color: '#0F8F79' },
  tagline: { color: '#778698', fontSize: 14, marginTop: 2 },
  authCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, shadowColor: '#163A36', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 3 },
  authTitle: { color: '#172B3A', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  authSubtitle: { color: '#687889', fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 22 },
  fieldGroup: { marginBottom: 16 },
  label: { color: '#314456', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  inputShell: { minHeight: 52, borderWidth: 1, borderColor: '#D6E1E0', borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBFDFC', paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: '#172B3A', paddingVertical: 13 },
  visibilityButton: { color: '#0F8F79', fontWeight: '800', fontSize: 13, paddingLeft: 10 },
  primaryButton: { minHeight: 53, marginTop: 4, borderRadius: 14, backgroundColor: '#0F8F79', alignItems: 'center', justifyContent: 'center', shadowColor: '#0A6658', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  helperText: { color: '#7C8A98', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 5, marginTop: 23 },
  switchText: { color: '#6D7D8D', fontSize: 14 },
  switchLink: { color: '#0F8F79', fontSize: 14, fontWeight: '800' },
  footerText: { color: '#8A97A4', fontSize: 12, textAlign: 'center', marginTop: 24 },
  notice: { borderRadius: 13, flexDirection: 'row', alignItems: 'flex-start', padding: 12, marginBottom: 17, gap: 9 },
  noticeError: { backgroundColor: '#FFF0F1', borderWidth: 1, borderColor: '#F4C9CD' },
  noticeSuccess: { backgroundColor: '#EAF8F4', borderWidth: 1, borderColor: '#BDE7DA' },
  noticeIcon: { width: 19, height: 19, borderRadius: 10, textAlign: 'center', overflow: 'hidden', fontSize: 13, fontWeight: '900', lineHeight: 19, backgroundColor: '#FFFFFF' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  noticeTextError: { color: '#A23943' },
  noticeTextSuccess: { color: '#16735F' },
  configCard: { backgroundColor: '#FFF8E8', borderColor: '#F2D69C', borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 17 },
  configTitle: { color: '#926A16', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  configText: { color: '#856D3A', fontSize: 12, lineHeight: 18 },
  dashboardSafeArea: { flex: 1, backgroundColor: '#F5F8F8' },
  dashboardScroll: { padding: 20, paddingBottom: 32 },
  dashboardTopbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  dashboardBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  smallLogoMark: { height: 35, width: 35, borderRadius: 11, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F8F79' },
  smallLogoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  dashboardBrand: { color: '#183B3A', fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
  avatar: { height: 38, width: 38, borderRadius: 19, backgroundColor: '#DDEEEA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#147761', fontWeight: '900', fontSize: 15 },
  heroCard: { backgroundColor: '#183F3B', borderRadius: 23, padding: 22, overflow: 'hidden' },
  heroEyebrow: { color: '#9DD8C9', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 25, letterSpacing: -0.5, marginTop: 10 },
  heroSubtitle: { color: '#C8E1DB', fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 260 },
  heroStatRow: { marginTop: 22, borderTopWidth: 1, borderColor: '#41635D', paddingTop: 17, flexDirection: 'row', justifyContent: 'space-between' },
  heroStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroStatLabel: { color: '#A8C7C0', fontSize: 10, marginTop: 3 },
  heroStatDivider: { width: 1, backgroundColor: '#41635D', marginVertical: 2 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 27, marginBottom: 12 },
  sectionHeadingCompact: { marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: '#203946', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  sectionSubtitle: { color: '#778895', fontSize: 12, marginTop: 3 },
  liveBadge: { color: '#19816A', fontSize: 10, fontWeight: '900', marginTop: 4 },
  alertCard: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#183E39', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  alertIcon: { height: 33, width: 33, borderRadius: 11, backgroundColor: '#FFF0F1', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  alertIconText: { color: '#CE4E57', fontSize: 18, fontWeight: '900' },
  alertTitle: { color: '#2B3C47', fontSize: 14, fontWeight: '800' },
  alertCopy: { color: '#788794', fontSize: 12, marginTop: 3 },
  alertArrow: { color: '#8898A4', fontSize: 27, marginLeft: 7 },
  scheduleCard: { backgroundColor: '#FFFFFF', borderRadius: 17, paddingHorizontal: 15, shadowColor: '#183E39', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  scheduleRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center' },
  scheduleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF1F1' },
  scheduleTime: { width: 66, color: '#657783', fontSize: 11, fontWeight: '700' },
  scheduleDot: { width: 9, height: 9, borderRadius: 5, marginRight: 11 },
  dotPurple: { backgroundColor: '#9C64D9' },
  dotAmber: { backgroundColor: '#E3A337' },
  dotTeal: { backgroundColor: '#21AA8E' },
  scheduleTitle: { color: '#2B3C47', fontSize: 14, fontWeight: '800' },
  scheduleDetail: { color: '#7A8994', fontSize: 11, marginTop: 3 },
  metricGrid: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#183E39', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  metricValue: { fontSize: 23, fontWeight: '900' },
  metricLabel: { color: '#758592', fontSize: 11, fontWeight: '600', marginTop: 4 },
  logoutButton: { marginTop: 31, borderColor: '#F0C9CC', borderWidth: 1, minHeight: 51, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F8' },
  logoutButtonText: { color: '#B73942', fontSize: 15, fontWeight: '800' },
  dashboardFooter: { color: '#8A98A5', textAlign: 'center', fontSize: 11, marginTop: 13 },
});
