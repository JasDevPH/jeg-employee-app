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
          barStyle="light-content"
          backgroundColor={Colors.secondary}
        />
        <LinearGradient
          colors={[Colors.secondary, Colors.secondaryLight]}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[
                  Colors.primaryLight,
                  Colors.primary,
                  Colors.primaryDark,
                ]}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>JEG</Text>
              </LinearGradient>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Create a new secure password</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.inputWithIcon}
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
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={
                          showNewPassword ? "eye-off-outline" : "eye-outline"
                        }
                        size={20}
                        color={Colors.darkGray}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.inputWithIcon}
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

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    loading && styles.loginButtonDisabled,
                  ]}
                  onPress={handlePasswordReset}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.loginButtonGradient}
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
                        <Text style={styles.loginButtonText}>
                          Update Password
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleBackToLogin}
                  disabled={loading}
                >
                  <Text style={styles.skipButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

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
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>JEG</Text>
            </LinearGradient>
            <Text style={styles.title}>Employee Portal</Text>
            <Text style={styles.subtitle}>JEG Ventures Payroll System</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.form}>
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

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputWithIcon}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
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

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
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
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  form: {
    marginBottom: 24,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 12,
  },
  inputWithIcon: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.secondary,
  },
  eyeIcon: {
    padding: 16,
  },
  loginButton: {
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  loginButtonGradient: {
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  skipButton: {
    marginTop: 16,
    alignItems: "center",
  },
  skipButtonText: {
    color: Colors.darkGray,
    fontSize: 14,
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default LoginScreen;
