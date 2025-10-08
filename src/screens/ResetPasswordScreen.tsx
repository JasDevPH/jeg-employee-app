// FILE: jeg-employee-app/src/screens/ForgotPasswordScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [employeeId, setEmployeeId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const getDeviceInfo = () => {
    return `${Device.brand || "Unknown"} ${Device.modelName || "Device"} (${
      Device.osName
    } ${Device.osVersion})`;
  };

  const handleVerifyDevice = async () => {
    if (!employeeId.trim()) {
      Alert.alert("Error", "Please enter your Employee ID or Email");
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();

      const response = await fetch(
        `${API_BASE_URL}/api/auth/verify-device-for-reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: employeeId.trim(),
            deviceInfo,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setVerified(true);
      } else if (response.status === 403) {
        Alert.alert(
          "Device Not Bound",
          "The device you are using to reset the account is not bound. Please ask for a device bind reset first."
        );
      } else {
        Alert.alert(
          "Error",
          data.message || "Verification failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Device verification error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();

      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password-unauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: employeeId.trim(),
            newPassword,
            deviceInfo,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          "Success",
          "Password updated successfully! Please log in with your new password.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />
      <LinearGradient
        colors={[Colors.secondary, Colors.secondaryLight]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Ionicons name="key-outline" size={60} color={Colors.white} />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {verified
                ? "Create a new secure password"
                : "Verify your device first"}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {!verified ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Employee ID or Email</Text>
                  <TextInput
                    style={styles.input}
                    value={employeeId}
                    onChangeText={setEmployeeId}
                    placeholder="Enter your employee ID or email"
                    placeholderTextColor={Colors.darkGray}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyDevice}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons
                          name="shield-checkmark"
                          size={20}
                          color={Colors.white}
                        />
                        <Text style={styles.buttonText}>Verify Device</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.darkGray}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.darkGray}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={Colors.white}
                        />
                        <Text style={styles.buttonText}>Reset Password</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors.white}
            />
            <Text style={styles.infoText}>
              Password reset requires device verification. If your device is not
              bound, contact HR for assistance.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.secondary,
  },
  button: {
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  backButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    color: Colors.darkGray,
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.white,
    marginLeft: 12,
    lineHeight: 18,
  },
});

export default ForgotPasswordScreen;
