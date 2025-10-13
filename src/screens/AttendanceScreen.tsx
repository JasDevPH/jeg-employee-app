// FILE: jeg-employee-app/src/screens/AttendanceScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as ScreenCapture from "expo-screen-capture";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { qrGenerator } from "../utils/qrGenerator";
import { Colors } from "../constants/colors";

interface AttendanceScreenProps {
  navigation: any;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ navigation }) => {
  const [currentQR, setCurrentQR] = useState<string | null>(null);
  const [qrType, setQRType] = useState<string | null>(null);
  const [qrExpiry, setQRExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [keysAvailable, setKeysAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { user, token, deviceKey, logout } = useAuth();

  const checkKeysAvailability = useCallback(() => {
    const status = qrGenerator.getStatus();
    setKeysAvailable(status.isReady);
    setDebugInfo(status);
  }, []);

  const syncKeys = useCallback(async () => {
    if (!token) return;
    setSyncing(true);

    try {
      const success = await qrGenerator.syncKeys(token);
      if (success) {
        checkKeysAvailability();
        Alert.alert("Success", "Keys synced successfully!");
      } else {
        Alert.alert(
          "Sync Failed",
          "Unable to sync keys. Please check your connection."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Key sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }, [token, checkKeysAvailability]);

  useEffect(() => {
    const actualEmployeeId = user?.employee?.id || user?.employeeId;

    if (actualEmployeeId && deviceKey) {
      qrGenerator.setEmployeeId(actualEmployeeId);
      qrGenerator.setDeviceKey(deviceKey);
      syncKeys();
    }

    checkKeysAvailability();
  }, [user, deviceKey, token, syncKeys, checkKeysAvailability]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentQR && qrExpiry) {
      timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((qrExpiry - now) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearQR();
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentQR, qrExpiry]);

  useEffect(() => {
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(console.error);
    };
  }, []);

  const generateQR = async (
    type: "TIME_IN" | "BREAK_IN" | "BREAK_OUT" | "TIME_OUT"
  ) => {
    try {
      if (!qrGenerator.hasValidKeys()) {
        Alert.alert(
          "QR Generation Failed",
          "Keys not available. Please sync keys first.",
          [
            { text: "Sync Keys", onPress: syncKeys },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      const qrData = await qrGenerator.generateOfflineQR(type);

      if (qrData) {
        await ScreenCapture.preventScreenCaptureAsync();
        setCurrentQR(qrData);
        setQRType(type);
        setQRExpiry(Date.now() + 30 * 1000);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to generate QR code: ${error}`);
    }
  };

  const clearQR = async () => {
    await ScreenCapture.allowScreenCaptureAsync();
    setCurrentQR(null);
    setQRType(null);
    setQRExpiry(null);
    setTimeLeft(0);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", onPress: logout, style: "destructive" },
    ]);
  };

  const getQRTypeDisplay = (type: string) => {
    const types = {
      TIME_IN: "Time In",
      BREAK_IN: "Break In",
      BREAK_OUT: "Break Out",
      TIME_OUT: "Time Out",
    };
    return types[type as keyof typeof types] || type;
  };

  const getQRTypeIcon = (type: string) => {
    const icons = {
      TIME_IN: "log-in",
      BREAK_IN: "cafe",
      BREAK_OUT: "play",
      TIME_OUT: "log-out",
    };
    return icons[type as keyof typeof icons] || "checkmark-circle";
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good Morning"
      : now.getHours() < 18
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color={Colors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.userName}>
                {user.employee?.firstName || user.role?.replace("_", " ")}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutIconButton}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentQR ? (
          <View style={styles.qrSection}>
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <View
                  style={[
                    styles.qrIconCircle,
                    { backgroundColor: `${Colors.primary}20` },
                  ]}
                >
                  <Ionicons
                    name={getQRTypeIcon(qrType!) as any}
                    size={28}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.qrTitle}>{getQRTypeDisplay(qrType!)}</Text>
              </View>

              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={currentQR}
                  size={240}
                  backgroundColor={Colors.white}
                  color={Colors.secondary}
                />
              </View>

              <View style={styles.timerSection}>
                <View style={styles.timerBadge}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={Colors.error}
                  />
                  <Text style={styles.timerText}>{timeLeft}s remaining</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.cancelButton} onPress={clearQR}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <View style={styles.securityNote}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={Colors.success}
                />
                <Text style={styles.securityText}>
                  Screenshots disabled for security
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            {!keysAvailable && (
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Ionicons
                    name="alert-circle"
                    size={24}
                    color={Colors.warning}
                  />
                  <Text style={styles.warningTitle}>Setup Required</Text>
                </View>
                <Text style={styles.warningText}>
                  QR keys not available. Please sync to enable attendance QR
                  generation.
                </Text>
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={syncKeys}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="sync" size={18} color={Colors.white} />
                      <Text style={styles.syncButtonText}>Sync Keys Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !keysAvailable && styles.disabledCard,
                ]}
                onPress={() => generateQR("TIME_IN")}
                disabled={!keysAvailable}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: `${Colors.success}20` },
                  ]}
                >
                  <Ionicons name="log-in" size={32} color={Colors.success} />
                </View>
                <Text style={styles.actionTitle}>Time In</Text>
                <Text style={styles.actionSubtitle}>Start your day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !keysAvailable && styles.disabledCard,
                ]}
                onPress={() => generateQR("BREAK_IN")}
                disabled={!keysAvailable}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: `${Colors.warning}20` },
                  ]}
                >
                  <Ionicons name="cafe" size={32} color={Colors.warning} />
                </View>
                <Text style={styles.actionTitle}>Break In</Text>
                <Text style={styles.actionSubtitle}>Take a break</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !keysAvailable && styles.disabledCard,
                ]}
                onPress={() => generateQR("BREAK_OUT")}
                disabled={!keysAvailable}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: `${Colors.info}20` },
                  ]}
                >
                  <Ionicons name="play" size={32} color={Colors.info} />
                </View>
                <Text style={styles.actionTitle}>Break Out</Text>
                <Text style={styles.actionSubtitle}>Resume work</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !keysAvailable && styles.disabledCard,
                ]}
                onPress={() => generateQR("TIME_OUT")}
                disabled={!keysAvailable}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: `${Colors.error}20` },
                  ]}
                >
                  <Ionicons name="log-out" size={32} color={Colors.error} />
                </View>
                <Text style={styles.actionTitle}>Time Out</Text>
                <Text style={styles.actionSubtitle}>End your day</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Status Footer */}
      <View style={styles.statusFooter}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: keysAvailable
                  ? Colors.success
                  : Colors.warning,
              },
            ]}
          />
          <Text style={styles.statusText}>
            {keysAvailable ? "Ready • Offline capable" : "Sync required"}
          </Text>
        </View>
        {syncing && (
          <View style={styles.syncingBadge}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.syncingText}>Syncing...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  modernHeader: {
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  dateText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  qrSection: {
    flex: 1,
    justifyContent: "center",
  },
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  qrHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  qrIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  qrCodeWrapper: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerSection: {
    marginBottom: 24,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.error}15`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.error,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
  },
  securityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontStyle: "italic",
  },
  actionsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  warningCard: {
    backgroundColor: `${Colors.warning}15`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Colors.warning}40`,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
    marginLeft: 8,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.5,
  },
  actionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  statusFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  syncingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncingText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: "500",
  },
});

export default AttendanceScreen;
