// FILE: jeg-employee-app/src/screens/ResetPasswordScreen.tsx
import React, { useState, useEffect } from "react";
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

interface ResetPasswordScreenProps {
  navigation: any;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
}) => {
  const { user, token, logout } = useAuth(); // Get auth context
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

  // Countdown timer for success state
  useEffect(() => {
    if (step === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === "success" && countdown === 0) {
      handleSuccessComplete();
    }
  }, [step, countdown]);

  const handleSuccessComplete = async () => {
    if (isLoggedIn) {
      // Logged in user - logout and redirect to login
      await logout();
      navigation.navigate("Login");
    } else {
      // Logged out user - just redirect to login
      navigation.navigate("Login");
    }
  };

  const getDeviceInfo = () => {
    return `${Device.brand || "Unknown"} ${Device.modelName || "Device"} (${
      Device.osName
    } ${Device.osVersion})`;
  };

  // FOR LOGGED-OUT USERS ONLY
  const handleVerifyDevice = async () => {
    if (!employeeId.trim()) {
      Alert.alert("Error", "Please enter your Employee ID or Email");
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();

      console.log("Verifying device for reset:", {
        employeeId: employeeId.trim(),
        deviceInfo,
      });

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

      console.log("Device verification response:", {
        status: response.status,
        data,
      });

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
            "This device is not bound to your account. Please contact HR to reset your device binding before you can reset your password.",
          [
            {
              text: "Contact HR",
              onPress: () => {
                Alert.alert(
                  "Contact HR",
                  "Please contact your HR department to request a device binding reset. Once approved, you can return to this screen to reset your password."
                );
              },
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

  // FOR LOGGED-IN USERS - with current password
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

      console.log("Resetting password (authenticated):", { identifier });

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

      console.log("Password reset response:", {
        status: response.status,
        data,
      });

      if (response.ok && data.success) {
        setStep("success");
        setCountdown(5);
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

  // FOR LOGGED-OUT USERS - without current password
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

      console.log("Resetting password (unauthenticated):", {
        employeeId: employeeId.trim(),
        deviceInfo,
      });

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

      console.log("Password reset response:", {
        status: response.status,
        data,
      });

      if (response.ok && data.success) {
        setStep("success");
        setCountdown(5);
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
    navigation.navigate("Login");
  };

  // SUCCESS SCREEN
  if (step === "success") {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.secondary}
        />
        <LinearGradient
          colors={[Colors.secondary, Colors.secondaryLight]}
          style={styles.gradient}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={[Colors.success, "#10B981"]}
                style={styles.successIconGradient}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={80}
                  color={Colors.white}
                />
              </LinearGradient>
            </View>

            <Text style={styles.successTitle}>Password Reset Successful!</Text>
            <Text style={styles.successMessage}>
              {isLoggedIn
                ? "Your password has been updated. You will be logged out for security."
                : "Your password has been updated successfully. You can now log in with your new password."}
            </Text>

            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                {isLoggedIn ? "Logging out" : "Redirecting"} in
              </Text>
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownNumber}>{countdown}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleSuccessComplete}
            >
              <Text style={styles.continueButtonText}>
                Continue to Login Now
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
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
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.secondary}
        />
        <LinearGradient
          colors={[Colors.secondary, Colors.secondaryLight]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.headerContainer}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.iconGradient}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={40}
                      color={Colors.white}
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Verify Device</Text>
                <Text style={styles.subtitle}>
                  Verify your device is authorized for password reset
                </Text>

                <View style={styles.stepIndicator}>
                  <View style={[styles.stepDot, styles.stepDotActive]} />
                  <View style={styles.stepLine} />
                  <View style={styles.stepDot} />
                </View>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Employee ID or Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={Colors.darkGray}
                      style={styles.inputIcon}
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

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToLogin}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // RESET PASSWORD SCREEN (for both logged-in and logged-out users)
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="key" size={40} color={Colors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Create a new secure password</Text>

              {!isLoggedIn && (
                <View style={styles.stepIndicator}>
                  <View style={styles.stepDot} />
                  <View style={styles.stepLine} />
                  <View style={[styles.stepDot, styles.stepDotActive]} />
                </View>
              )}
            </View>

            <View style={styles.formContainer}>
              {!isLoggedIn && (
                <View style={styles.employeeIdDisplay}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.success}
                  />
                  <Text style={styles.employeeIdText}>
                    Resetting password for: {employeeId}
                  </Text>
                </View>
              )}

              {isLoggedIn && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={Colors.darkGray}
                      style={styles.inputIcon}
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
                      onPress={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={
                          showCurrentPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={20}
                        color={Colors.darkGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.darkGray}
                    style={styles.inputIcon}
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
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.darkGray}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.darkGray}
                    style={styles.inputIcon}
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
                    style={styles.eyeIcon}
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
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={
                  isLoggedIn
                    ? handleResetPasswordAuthenticated
                    : handleResetPasswordUnauthenticated
                }
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

              {!isLoggedIn && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleBackToVerify}
                  disabled={loading}
                >
                  <Ionicons
                    name="arrow-back"
                    size={16}
                    color={Colors.darkGray}
                  />
                  <Text style={styles.secondaryButtonText}>
                    Back to Verification
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.backButton}
                onPress={
                  isLoggedIn ? () => navigation.goBack() : handleBackToLogin
                }
                disabled={loading}
              >
                <Text style={styles.backButtonText}>
                  {isLoggedIn ? "Cancel" : "Back to Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.mediumGray,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.mediumGray,
    marginHorizontal: 8,
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 12,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.secondary,
  },
  eyeIcon: {
    padding: 16,
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
  employeeIdDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  employeeIdText: {
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
  button: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
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
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  // SUCCESS SCREEN STYLES
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successIconContainer: {
    marginBottom: 32,
  },
  successIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 32,
    marginBottom: 48,
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  countdownText: {
    fontSize: 16,
    color: Colors.white,
    marginBottom: 16,
    fontWeight: "500",
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.primary,
  },
  continueButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
});

export default ResetPasswordScreen;
