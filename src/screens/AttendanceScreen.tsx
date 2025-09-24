/* eslint-disable @typescript-eslint/no-unused-vars */
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
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as ScreenCapture from "expo-screen-capture";
import { useAuth } from "../context/AuthContext";
import { qrGenerator } from "../utils/qrGenerator";

interface AttendanceScreenProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ navigation }) => {
  const [currentQR, setCurrentQR] = useState<string | null>(null);
  const [qrType, setQRType] = useState<string | null>(null);
  const [qrExpiry, setQRExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [keysAvailable, setKeysAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user, token, deviceKey, logout } = useAuth();

  const checkKeysAvailability = useCallback(() => {
    setKeysAvailable(qrGenerator.hasValidKeys());
  }, []);

  const syncKeys = useCallback(async () => {
    if (!token) return;

    setSyncing(true);
    try {
      const success = await qrGenerator.syncKeys(token);
      if (success) {
        checkKeysAvailability();
      }
    } catch (error) {
      console.error("Key sync failed:", error);
    } finally {
      setSyncing(false);
    }
  }, [token, checkKeysAvailability]);

  useEffect(() => {
    if (token && deviceKey) {
      qrGenerator.setDeviceKey(deviceKey);
      syncKeys();
    }
    checkKeysAvailability();
  }, [token, deviceKey, syncKeys, checkKeysAvailability]);

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

  // Cleanup effect for when component unmounts
  useEffect(() => {
    return () => {
      // Re-enable screenshots when component unmounts
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const generateQR = async (
    type: "TIME_IN" | "BREAK_IN" | "BREAK_OUT" | "TIME_OUT"
  ) => {
    try {
      const qrData = await qrGenerator.generateOfflineQR(type);

      if (qrData) {
        // Enable screenshot protection when QR is displayed
        await ScreenCapture.preventScreenCaptureAsync();

        setCurrentQR(qrData);
        setQRType(type);
        setQRExpiry(Date.now() + 30 * 1000); // 30 seconds
      } else {
        Alert.alert(
          "QR Generation Failed",
          "Unable to generate QR code. Please sync keys or check your connection.",
          [{ text: "Sync Keys", onPress: syncKeys }, { text: "OK" }]
        );
      }
    } catch (error) {
      console.error("QR generation failed:", error);
      Alert.alert("Error", "Failed to generate QR code");
    }
  };

  const clearQR = async () => {
    // Disable screenshot protection when QR is cleared
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
    switch (type) {
      case "TIME_IN":
        return "Time In";
      case "BREAK_IN":
        return "Break In";
      case "BREAK_OUT":
        return "Break Out";
      case "TIME_OUT":
        return "Time Out";
      default:
        return type;
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user.role?.replace("_", " ")}
        </Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* QR Display */}
      {currentQR ? (
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>{getQRTypeDisplay(qrType!)}</Text>
          <View style={styles.qrWrapper}>
            <QRCode
              value={currentQR}
              size={250}
              backgroundColor="white"
              color="black"
            />
          </View>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Expires in: {timeLeft}s</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={clearQR}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.instructionText}>
            Show this QR code to the kiosk scanner
          </Text>
          <Text style={styles.securityText}>
            Screenshots are disabled for security
          </Text>
        </View>
      ) : (
        <View style={styles.actionsContainer}>
          <Text style={styles.instructionTitle}>Select Attendance Action</Text>

          {!keysAvailable && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                QR keys not available. Please sync to enable offline QR
                generation.
              </Text>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={syncKeys}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.syncButtonText}>Sync Keys</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

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
              <Text style={styles.actionButtonText}>Time In</Text>
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
              <Text style={styles.actionButtonText}>Break In</Text>
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
              <Text style={styles.actionButtonText}>Break Out</Text>
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
              <Text style={styles.actionButtonText}>Time Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {keysAvailable ? "Ready (Offline capable)" : "Sync required"}
        </Text>
        {syncing && <Text style={styles.syncingText}>Syncing keys...</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  logoutButton: {
    alignSelf: "flex-end",
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  qrContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 20,
  },
  qrWrapper: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  instructionText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
  },
  securityText: {
    fontSize: 12,
    color: "#dc2626",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  actionsContainer: {
    flex: 1,
    padding: 20,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 30,
  },
  warningContainer: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  warningText: {
    color: "#92400e",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "center",
  },
  syncButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  timeInButton: {
    backgroundColor: "#10b981",
  },
  breakInButton: {
    backgroundColor: "#f59e0b",
  },
  breakOutButton: {
    backgroundColor: "#8b5cf6",
  },
  timeOutButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  statusContainer: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  statusText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  syncingText: {
    fontSize: 12,
    color: "#0284c7",
    textAlign: "center",
    marginTop: 4,
  },
});

export default AttendanceScreen;
