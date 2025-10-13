// FILE: jeg-employee-app/src/screens/ResetPasswordScreen.tsx
import React, { useState, useEffect, useRef } from "react";
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
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { CommonActions } from "@react-navigation/native";

interface ResetPasswordScreenProps {
  navigation: any;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
}) => {
  const { user, token, logout } = useAuth();
  const isLoggedIn = !!user && !!token;

  const [step, setStep] = useState<"verify" | "reset" | "success">(
    isLoggedIn ? "reset" : "verify"
  );
  const [employeeId, setEmployeeId] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [wasLoggedIn, setWasLoggedIn] = useState(isLoggedIn);

  const navigationRef = useRef(navigation);

  // Update ref when navigation changes
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  // Reset state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setStep(isLoggedIn ? "reset" : "verify");
      setEmployeeId("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setCountdown(5);
      setLoading(false);
      setWasLoggedIn(isLoggedIn);
    }, [isLoggedIn])
  );

  useEffect(() => {
    if (step === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === "success" && countdown === 0) {
      handleSuccessComplete();
    }
  }, [step, countdown]);

  const handleSuccessComplete = async () => {
    if (wasLoggedIn) {
      // For logged-in users: logout and force navigation reset
      try {
        await logout();

        // Force reset navigation stack to Login after logout
        // Use setTimeout to ensure logout completes first
        setTimeout(() => {
          navigationRef.current?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }],
            })
          );
        }, 100);
      } catch (error) {
        console.error("Logout error:", error);
        // Even if logout fails, try to navigate to Login
        navigationRef.current?.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      }
    } else {
      // For logged-out users: replace navigation stack to go to Login
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    }
  };

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: employeeId.trim(), deviceInfo }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setStep("reset");
        Alert.alert(
          "Device Verified",
          "Your device has been verified. You can now reset your password.",
          [{ text: "Continue" }]
        );
      } else if (response.status === 403) {
        Alert.alert(
          "Device Not Authorized",
          data.message ||
            "This device is not bound to your account. Please contact HR to reset your device binding.",
          [
            {
              text: "Contact HR",
              onPress: () =>
                Alert.alert(
                  "Contact HR",
                  "Please contact your HR department to request a device binding reset."
                ),
            },
            { text: "Go Back", onPress: () => navigation.goBack() },
          ]
        );
      } else if (response.status === 404) {
        Alert.alert(
          "Account Not Found",
          "No account found with this Employee ID or Email. Please check and try again."
        );
      } else {
        Alert.alert(
          "Verification Failed",
          data.message || "Unable to verify device. Please try again."
        );
      }
    } catch (error) {
      console.error("Device verification error:", error);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordAuthenticated = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters long for security"
      );
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert(
        "Weak Password",
        "Password should contain both letters and numbers for better security",
        [
          {
            text: "Continue Anyway",
            onPress: () => performAuthenticatedReset(),
          },
          { text: "Change Password", style: "cancel" },
        ]
      );
      return;
    }

    await performAuthenticatedReset();
  };

  const performAuthenticatedReset = async () => {
    setLoading(true);
    try {
      const identifier = user?.employeeCode || user?.email || user?.id;
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: identifier,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep("success");
        setCountdown(5);
        setWasLoggedIn(true);
      } else {
        Alert.alert(
          "Reset Failed",
          data.message || "Failed to reset password. Please try again."
        );
      }
    } catch (error) {
      console.error("Password reset error:", error);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordUnauthenticated = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters long for security"
      );
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert(
        "Weak Password",
        "Password should contain both letters and numbers for better security",
        [
          {
            text: "Continue Anyway",
            onPress: () => performUnauthenticatedReset(),
          },
          { text: "Change Password", style: "cancel" },
        ]
      );
      return;
    }

    await performUnauthenticatedReset();
  };

  const performUnauthenticatedReset = async () => {
    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();
      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password-unauth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: employeeId.trim(),
            newPassword,
            deviceInfo,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setStep("success");
        setCountdown(5);
        setWasLoggedIn(false);
      } else if (response.status === 403) {
        Alert.alert(
          "Device Not Authorized",
          "Your device authorization has changed. Please verify your device again.",
          [
            {
              text: "Start Over",
              onPress: () => {
                setStep("verify");
                setNewPassword("");
                setConfirmPassword("");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Reset Failed",
          data.message || "Failed to reset password. Please try again."
        );
      }
    } catch (error) {
      console.error("Password reset error:", error);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToVerify = () => {
    setStep("verify");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
  };

  const handleBackToLogin = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Login" }],
      })
    );
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // If user is logged out but on reset step, redirect to verify
  if (!isLoggedIn && step === "reset") {
    setStep("verify");
    return null;
  }

  // SUCCESS SCREEN
  if (step === "success") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={Colors.success}
            />
          </View>

          <Text style={styles.successTitle}>Password Reset Successful!</Text>
          <Text style={styles.successMessage}>
            {wasLoggedIn
              ? "Your password has been updated. You will be logged out for security."
              : "Your password has been updated successfully. You can now log in with your new password."}
          </Text>

          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>
              {wasLoggedIn ? "Logging out" : "Redirecting"} in
            </Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSuccessComplete}
          >
            <Text style={styles.continueButtonText}>Continue to Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // VERIFY DEVICE SCREEN (for logged-out users)
  if (step === "verify" && !isLoggedIn) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoSection}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>JEG</Text>
              </LinearGradient>

              <Text style={styles.screenTitle}>Verify Device</Text>
              <Text style={styles.screenSubtitle}>
                Verify your device is authorized for password reset
              </Text>

              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee ID or Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={Colors.darkGray}
                  />
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
              </View>

              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={Colors.info}
                />
                <Text style={styles.infoText}>
                  For security, password reset is only allowed on devices that
                  are bound to your account. If this device is not authorized,
                  contact HR.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyDevice}
                disabled={loading}
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
                    <Text style={styles.primaryButtonText}>Verify Device</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={handleBackToLogin}
                disabled={loading}
              >
                <Text style={styles.textButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // RESET PASSWORD SCREEN (for both logged-in and logged-out users)
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>JEG</Text>
            </LinearGradient>

            <Text style={styles.screenTitle}>Reset Password</Text>
            <Text style={styles.screenSubtitle}>
              Create a new secure password
            </Text>

            {!isLoggedIn && (
              <View style={styles.stepIndicator}>
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>
            )}
          </View>

          <View style={styles.formCard}>
            {!isLoggedIn && employeeId && (
              <View style={styles.verifiedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={Colors.success}
                />
                <Text style={styles.verifiedText}>
                  Resetting password for: {employeeId}
                </Text>
              </View>
            )}

            {isLoggedIn && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.darkGray}
                  />
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={Colors.darkGray}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={
                        showCurrentPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color={Colors.darkGray}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.darkGray}
                />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password (min. 6 characters)"
                  placeholderTextColor={Colors.darkGray}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.darkGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.darkGray}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.darkGray}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={Colors.darkGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>
                Password Requirements:
              </Text>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={
                    newPassword.length >= 6
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={
                    newPassword.length >= 6 ? Colors.success : Colors.darkGray
                  }
                />
                <Text style={styles.requirementText}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={
                    /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword)
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={
                    /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword)
                      ? Colors.success
                      : Colors.darkGray
                  }
                />
                <Text style={styles.requirementText}>
                  Contains letters and numbers
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={
                    newPassword === confirmPassword && newPassword.length > 0
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={
                    newPassword === confirmPassword && newPassword.length > 0
                      ? Colors.success
                      : Colors.darkGray
                  }
                />
                <Text style={styles.requirementText}>Passwords match</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={
                isLoggedIn
                  ? handleResetPasswordAuthenticated
                  : handleResetPasswordUnauthenticated
              }
              disabled={loading}
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
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                </>
              )}
            </TouchableOpacity>

            {!isLoggedIn && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBackToVerify}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={16} color={Colors.darkGray} />
                <Text style={styles.secondaryButtonText}>
                  Back to Verification
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.textButton}
              onPress={isLoggedIn ? handleCancel : handleBackToLogin}
              disabled={loading}
            >
              <Text style={styles.textButtonText}>
                {isLoggedIn ? "Cancel" : "Back to Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.secondary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.mediumGray,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.mediumGray,
    marginHorizontal: 8,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Colors.info}30`,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary,
    marginLeft: 12,
    lineHeight: 20,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  verifiedText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: "500",
    marginLeft: 8,
  },
  requirementsBox: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: Colors.darkGray,
    marginLeft: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: Colors.darkGray,
    fontSize: 14,
    marginLeft: 6,
  },
  textButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  textButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  // SUCCESS SCREEN
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.success}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.secondary,
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  successMessage: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 32,
    marginBottom: 48,
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  countdownLabel: {
    fontSize: 16,
    color: Colors.darkGray,
    marginBottom: 16,
    fontWeight: "500",
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -1,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});
export default ResetPasswordScreen;
