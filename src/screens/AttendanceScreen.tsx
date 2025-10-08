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
import { LinearGradient } from "expo-linear-gradient";
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
    console.log("Keys availability check:", status);
  }, []);

  const syncKeys = useCallback(async () => {
    if (!token) {
      console.log("No token available for key sync");
      return;
    }

    console.log("Starting key sync...");
    setSyncing(true);

    try {
      const success = await qrGenerator.syncKeys(token);
      console.log("Key sync result:", success);

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
      console.error("Key sync failed:", error);
      Alert.alert("Error", "Key sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }, [token, checkKeysAvailability]);

  // Initialize QR generator with user data
  useEffect(() => {
    console.log("AttendanceScreen useEffect - user data:", {
      employeeId: user?.employee?.id || user?.employeeId, // Use employee.id if available
      hasDeviceKey: !!deviceKey,
      hasToken: !!token,
    });

    // Use employee.id if user has employee record, otherwise use employeeId
    const actualEmployeeId = user?.employee?.id || user?.employeeId;

    if (actualEmployeeId && deviceKey) {
      console.log("Setting up QR generator with:", {
        employeeId: actualEmployeeId,
        deviceKey: deviceKey.substring(0, 10) + "...",
      });

      qrGenerator.setEmployeeId(actualEmployeeId);
      qrGenerator.setDeviceKey(deviceKey);

      syncKeys();
    } else {
      console.log("Missing required data for QR setup");
    }

    checkKeysAvailability();
  }, [user, deviceKey, token, syncKeys, checkKeysAvailability]);

  // QR expiry timer
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

  // Screen capture protection cleanup
  useEffect(() => {
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(console.error);
    };
  }, []);

  const generateQR = async (
    type: "TIME_IN" | "BREAK_IN" | "BREAK_OUT" | "TIME_OUT"
  ) => {
    console.log(`Generating QR for ${type}...`);

    try {
      // Check if we have valid keys first
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
        console.log("QR generated successfully, length:", qrData.length);

        // Enable screen capture protection
        await ScreenCapture.preventScreenCaptureAsync();

        setCurrentQR(qrData);
        setQRType(type);
        setQRExpiry(Date.now() + 30 * 1000); // 30 seconds
      } else {
        console.error("QR generation returned null");
        Alert.alert(
          "QR Generation Failed",
          "Unable to generate QR code. Please sync keys or check your connection.",
          [
            { text: "Sync Keys", onPress: syncKeys },
            {
              text: "Check Status",
              onPress: () => {
                const status = qrGenerator.getStatus();
                Alert.alert("Debug Info", JSON.stringify(status, null, 2));
              },
            },
            { text: "OK" },
          ]
        );
      }
    } catch (error) {
      console.error("QR generation failed:", error);
      Alert.alert("Error", `Failed to generate QR code: ${error}`);
    }
  };

  const clearQR = async () => {
    console.log("Clearing QR code...");
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

  const handleDebugMode = () => {
    const status = qrGenerator.getStatus();
    Alert.alert(
      "Debug Information",
      JSON.stringify(
        {
          ...status,
          userEmployeeId: user?.employeeId,
          hasToken: !!token,
          hasDeviceKey: !!deviceKey,
        },
        null,
        2
      ),
      [
        {
          text: "Clear Storage",
          onPress: () => qrGenerator.clearStorage(),
          style: "destructive",
        },
        { text: "Force Sync", onPress: syncKeys },
        { text: "OK" },
      ]
    );
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
      TIME_IN: "play-circle",
      BREAK_IN: "pause-circle",
      BREAK_OUT: "play",
      TIME_OUT: "stop-circle",
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.secondary, Colors.secondaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              Welcome,{" "}
              {user.employee?.firstName || user.role?.replace("_", " ")}
            </Text>
            <Text style={styles.employeeIdText}>
              ID: {user.employee?.employeeCode || user.employeeId}
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={handleDebugMode}
              onLongPress={handleDebugMode}
            >
              <Ionicons name="bug-outline" size={16} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentQR ? (
          <View style={styles.qrContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.qrTypeHeader}
            >
              <Ionicons
                name={getQRTypeIcon(qrType!) as any}
                size={24}
                color={Colors.white}
              />
              <Text style={styles.qrTitle}>{getQRTypeDisplay(qrType!)}</Text>
            </LinearGradient>

            <View style={styles.qrWrapper}>
              <QRCode
                value={currentQR}
                size={240}
                backgroundColor={Colors.white}
                color={Colors.secondary}
                logoMargin={2}
                logoSize={20}
              />
            </View>

            <View style={styles.timerContainer}>
              <View style={styles.timerCircle}>
                <Text style={styles.timerNumber}>{timeLeft}</Text>
              </View>
              <Text style={styles.timerLabel}>seconds remaining</Text>
            </View>

            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={clearQR}>
                <Ionicons name="close" size={18} color={Colors.white} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionText}>
                Show this QR code to the kiosk scanner
              </Text>
              <Text style={styles.securityText}>
                🔒 Screenshots are disabled for security
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <Text style={styles.instructionTitle}>
              Select Attendance Action
            </Text>

            {/* Status/Warning Container */}
            {!keysAvailable && (
              <View style={styles.warningContainer}>
                <LinearGradient
                  colors={[Colors.warning, "#F59E0B"]}
                  style={styles.warningGradient}
                >
                  <Ionicons name="warning" size={24} color={Colors.white} />
                  <Text style={styles.warningTitle}>Setup Required</Text>
                </LinearGradient>
                <View style={styles.warningContent}>
                  <Text style={styles.warningText}>
                    QR keys not available. Please sync to enable attendance QR
                    generation.
                  </Text>
                  {debugInfo && (
                    <Text style={styles.debugText}>
                      Keys: {debugInfo.validKeys}/{debugInfo.totalKeys} •
                      Employee: {debugInfo.hasEmployeeId ? "✓" : "✗"} • Device:{" "}
                      {debugInfo.hasDeviceKey ? "✓" : "✗"}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={syncKeys}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="sync" size={16} color={Colors.white} />
                        <Text style={styles.syncButtonText}>Sync Keys</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Action Buttons Grid */}
            <View style={styles.buttonGrid}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.timeInButton,
                  !keysAvailable && styles.disabledButton,
                ]}
                onPress={() => generateQR("TIME_IN")}
                disabled={!keysAvailable}
              >
                <LinearGradient
                  colors={
                    keysAvailable
                      ? [Colors.success, "#059669"]
                      : [Colors.darkGray, Colors.mediumGray]
                  }
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="play-circle" size={32} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Time In</Text>
                  <Text style={styles.actionButtonSubtext}>Start your day</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.breakInButton,
                  !keysAvailable && styles.disabledButton,
                ]}
                onPress={() => generateQR("BREAK_IN")}
                disabled={!keysAvailable}
              >
                <LinearGradient
                  colors={
                    keysAvailable
                      ? [Colors.primary, Colors.primaryDark]
                      : [Colors.darkGray, Colors.mediumGray]
                  }
                  style={styles.actionButtonGradient}
                >
                  <Ionicons
                    name="pause-circle"
                    size={32}
                    color={Colors.white}
                  />
                  <Text style={styles.actionButtonText}>Break In</Text>
                  <Text style={styles.actionButtonSubtext}>Start break</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.breakOutButton,
                  !keysAvailable && styles.disabledButton,
                ]}
                onPress={() => generateQR("BREAK_OUT")}
                disabled={!keysAvailable}
              >
                <LinearGradient
                  colors={
                    keysAvailable
                      ? ["#8B5CF6", "#7C3AED"]
                      : [Colors.darkGray, Colors.mediumGray]
                  }
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="play" size={32} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Break Out</Text>
                  <Text style={styles.actionButtonSubtext}>Resume work</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.timeOutButton,
                  !keysAvailable && styles.disabledButton,
                ]}
                onPress={() => generateQR("TIME_OUT")}
                disabled={!keysAvailable}
              >
                <LinearGradient
                  colors={
                    keysAvailable
                      ? [Colors.error, "#DC2626"]
                      : [Colors.darkGray, Colors.mediumGray]
                  }
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="stop-circle" size={32} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Time Out</Text>
                  <Text style={styles.actionButtonSubtext}>End your day</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Status Footer */}
      <LinearGradient
        colors={[Colors.white, Colors.lightGray]}
        style={styles.statusContainer}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusIndicator}>
            <Ionicons
              name={keysAvailable ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={keysAvailable ? Colors.success : Colors.warning}
            />
            <Text style={styles.statusText}>
              {keysAvailable ? "Ready (Offline capable)" : "Sync required"}
            </Text>
          </View>

          {syncing && (
            <View style={styles.syncingIndicator}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.syncingText}>Syncing...</Text>
            </View>
          )}
        </View>

        {debugInfo && __DEV__ && (
          <Text style={styles.debugFooter}>
            Keys: {debugInfo.validKeys}/{debugInfo.totalKeys} | Last sync:{" "}
            {debugInfo.lastSync
              ? new Date(debugInfo.lastSync).toLocaleTimeString()
              : "Never"}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.darkGray,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 4,
  },
  employeeIdText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: Colors.mediumGray,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  debugButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  logoutButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  qrTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
    marginLeft: 8,
  },
  qrWrapper: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  timerNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
  },
  timerLabel: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  qrActions: {
    marginBottom: 20,
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: Colors.darkGray,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  instructionsContainer: {
    alignItems: "center",
  },
  instructionText: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  securityText: {
    fontSize: 12,
    color: Colors.darkGray,
    textAlign: "center",
    fontStyle: "italic",
  },
  actionsContainer: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  warningContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  warningGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.white,
    marginLeft: 12,
  },
  warningContent: {
    backgroundColor: Colors.white,
    padding: 16,
  },
  warningText: {
    color: Colors.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: Colors.darkGray,
    fontFamily: "monospace",
    marginBottom: 12,
  },
  syncButton: {
    flexDirection: "row",
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  syncButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "48%",
    height: 120,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  timeInButton: {},
  breakInButton: {},
  breakOutButton: {},
  timeOutButton: {},
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 2,
  },
  actionButtonSubtext: {
    color: Colors.white,
    fontSize: 11,
    opacity: 0.9,
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 8,
    fontWeight: "500",
  },
  syncingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncingText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: "500",
  },
  debugFooter: {
    fontSize: 10,
    color: Colors.darkGray,
    textAlign: "center",
    marginTop: 4,
    fontFamily: "monospace",
  },
});

export default AttendanceScreen;
