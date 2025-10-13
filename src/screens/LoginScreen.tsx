// FILE: jeg-employee-app/src/screens/LoginScreen.tsx
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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Colors } from "../constants/colors";
import { API_BASE_URL } from "../config/api";

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loginResult, setLoginResult] = useState<any>(null);
  const { login, completeLogin } = useAuth();

  const handleLogin = async () => {
    if (!employeeId.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both Employee ID and Password");
      return;
    }

    setLoading(true);
    try {
      const result = await login(employeeId.trim(), password);

      if (result.success) {
        if (result.requiresPasswordReset) {
          setLoginResult(result);
          setCurrentUserData({ employeeId: employeeId.trim(), password });

          Alert.alert(
            "Password Reset Required",
            "You are using the default password. You must change it for security before proceeding.",
            [
              {
                text: "Change Password",
                onPress: () => {
                  setShowResetPassword(true);
                },
              },
            ],
            {
              cancelable: false,
            }
          );
        }
      } else {
        Alert.alert("Login Failed", result.error || "Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
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

    if (!currentUserData) {
      Alert.alert("Error", "Session expired. Please login again.");
      setShowResetPassword(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: currentUserData.employeeId,
          currentPassword: currentUserData.password,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert("Success", "Password updated successfully!", [
          {
            text: "OK",
            onPress: async () => {
              if (loginResult?.user) {
                await completeLogin(loginResult.user);
              }
              setShowResetPassword(false);
              setCurrentUserData(null);
              setNewPassword("");
              setConfirmPassword("");
              setShowNewPassword(false);
              setShowConfirmPassword(false);
              setLoginResult(null);
            },
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to update password");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowResetPassword(false);
    setCurrentUserData(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setLoginResult(null);
  };

  const handleForgotPassword = () => {
    navigation.navigate("ResetPassword");
  };

  if (showResetPassword) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.background}
        />
        <View style={styles.modernContainer}>
          <View style={styles.logoSection}>
            <Image
              source={require("../../assets/jeg_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.modernTitle}>Reset Password</Text>
            <Text style={styles.modernSubtitle}>
              Create a new secure password
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.modernLabel}>New Password</Text>
              <View style={styles.modernInputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.darkGray}
                />
                <TextInput
                  style={styles.modernInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={Colors.darkGray}
                  secureTextEntry={!showNewPassword}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.darkGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modernLabel}>Confirm Password</Text>
              <View style={styles.modernInputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.darkGray}
                />
                <TextInput
                  style={styles.modernInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.darkGray}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
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

            <TouchableOpacity
              style={[styles.modernButton, loading && styles.buttonDisabled]}
              onPress={handlePasswordReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.modernButtonText}>Update Password</Text>
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
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.modernContainer}>
        <View style={styles.logoSection}>
          <Image
            source={require("../../assets/jeg_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.modernTitle}>Welcome Back</Text>
          <Text style={styles.modernSubtitle}>
            Sign in to JEG Employee Portal
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.modernLabel}>Employee ID or Email</Text>
            <View style={styles.modernInputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors.darkGray}
              />
              <TextInput
                style={styles.modernInput}
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

          <View style={styles.inputGroup}>
            <Text style={styles.modernLabel}>Password</Text>
            <View style={styles.modernInputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.darkGray}
              />
              <TextInput
                style={styles.modernInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.darkGray}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.darkGray}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modernButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.modernButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>JEG Ventures Corporation © 2025</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modernContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  modernTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modernSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  modernLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modernInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  modernButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modernButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  textButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default LoginScreen;
