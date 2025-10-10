// FILE: src/screens/ResetPasswordScreen.tsx
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
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";

interface ResetPasswordScreenProps {
  navigation: any;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
}) => {
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [employeeId, setEmployeeId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        // Device verified successfully
        setStep("reset");
        Alert.alert(
          "Device Verified",
          "Your device has been verified. You can now reset your password.",
          [{ text: "Continue" }]
        );
      } else if (response.status === 403) {
        // Device not bound - STRICT REJECTION
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

  const handleResetPassword = async () => {
    // Validation
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

    // Check password strength
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert(
        "Weak Password",
        "Password should contain both letters and numbers for better security",
        [
          { text: "Continue Anyway", onPress: () => performReset() },
          { text: "Change Password", style: "cancel" },
        ]
      );
      return;
    }

    await performReset();
  };

  const performReset = async () => {
    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();

      console.log("Resetting password:", {
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
        Alert.alert(
          "Success",
          "Your password has been reset successfully! Please log in with your new password.",
          [
            {
              text: "Go to Login",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
      } else if (response.status === 403) {
        // Device binding check failed during reset
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
  };

  const handleBackToLogin = () => {
    navigation.navigate("Login");
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.iconGradient}
                >
                  <Ionicons
                    name={step === "verify" ? "shield-checkmark" : "key"}
                    size={40}
                    color={Colors.white}
                  />
                </LinearGradient>
              </View>
              <Text style={styles.title}>
                {step === "verify" ? "Verify Device" : "Reset Password"}
              </Text>
              <Text style={styles.subtitle}>
                {step === "verify"
                  ? "Verify your device is authorized for password reset"
                  : "Create a new secure password"}
              </Text>

              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepDot,
                    step === "verify" && styles.stepDotActive,
                  ]}
                />
                <View style={styles.stepLine} />
                <View
                  style={[
                    styles.stepDot,
                    step === "reset" && styles.stepDotActive,
                  ]}
                />
              </View>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {step === "verify" ? (
                <>
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

                  {/* Info Box */}
                  <View style={styles.infoBox}>
                    <Ionicons
                      name="information-circle"
                      size={24}
                      color={Colors.info}
                    />
                    <Text style={styles.infoText}>
                      For security, password reset is only allowed on devices
                      that are bound to your account. If this device is not
                      authorized, contact HR.
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
                </>
              ) : (
                <>
                  {/* Employee ID Display */}
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
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
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
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={20}
                          color={Colors.darkGray}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Password Requirements */}
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
                          newPassword.length >= 6
                            ? Colors.success
                            : Colors.darkGray
                        }
                      />
                      <Text style={styles.requirementText}>
                        At least 6 characters
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={
                          /[A-Za-z]/.test(newPassword) &&
                          /[0-9]/.test(newPassword)
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={
                          /[A-Za-z]/.test(newPassword) &&
                          /[0-9]/.test(newPassword)
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
                          newPassword === confirmPassword &&
                          newPassword.length > 0
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={
                          newPassword === confirmPassword &&
                          newPassword.length > 0
                            ? Colors.success
                            : Colors.darkGray
                        }
                      />
                      <Text style={styles.requirementText}>
                        Passwords match
                      </Text>
                    </View>
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
                </>
              )}

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
});

export default ResetPasswordScreen;
