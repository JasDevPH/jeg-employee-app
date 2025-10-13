// FILE: jeg-employee-app/src/screens/ProfileScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Colors } from "../constants/colors";

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", onPress: logout, style: "destructive" },
    ]);
  };

  const getFullName = () => {
    if (user?.employee?.firstName && user?.employee?.lastName) {
      return `${user.employee.firstName} ${user.employee.lastName}`;
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return "Employee";
  };

  const getPosition = () => {
    return (
      user?.employee?.position || user?.role?.replace("_", " ") || "Employee"
    );
  };

  const getEmployeeId = () => {
    return (
      user?.employee?.employeeCode ||
      user?.employeeCode ||
      user?.id?.substring(0, 8) ||
      "N/A"
    );
  };

  const getEmail = () => {
    return user?.email || "Not provided";
  };

  const isActive = () => {
    if (user?.employee?.isActive !== undefined) {
      return user.employee.isActive;
    }
    return true;
  };

  const profileActions = [
    {
      icon: "key-outline",
      label: "Change Password",
      color: Colors.primary,
      onPress: () => navigation.navigate("ResetPassword"),
    },
    {
      icon: "notifications-outline",
      label: "Notification Settings",
      color: Colors.info,
      onPress: () => {},
    },
    {
      icon: "help-circle-outline",
      label: "Help & Support",
      color: Colors.warning,
      onPress: () => {},
    },
    {
      icon: "document-text-outline",
      label: "Terms & Privacy",
      color: Colors.textSecondary,
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={48} color={Colors.primary} />
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isActive() ? Colors.success : Colors.error },
            ]}
          >
            <View style={styles.statusDot} />
          </View>
        </View>

        <Text style={styles.userName}>{getFullName()}</Text>
        <Text style={styles.userPosition}>{getPosition()}</Text>

        <View style={styles.idBadge}>
          <Ionicons name="id-card-outline" size={14} color={Colors.primary} />
          <Text style={styles.idText}>ID: {getEmployeeId()}</Text>
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.contentContainer}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: `${Colors.primary}15` },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{getFullName()}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: `${Colors.info}15` },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={Colors.info} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{getEmail()}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: `${Colors.success}15` },
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color={Colors.success}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Position</Text>
                <Text style={styles.infoValue}>{getPosition()}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: `${Colors.warning}15` },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={Colors.warning}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.statusRow}>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: isActive() ? Colors.success : Colors.error },
                    ]}
                  >
                    {isActive() ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            {profileActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: `${action.color}15` },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={24}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <View style={styles.appInfoCard}>
            <Image
              source={require("../../assets/jeg_logo.png")}
              style={styles.appLogo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>JEG Employee App</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appCopyright}>
              © 2024 JEG Ventures Corporation
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  statusBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  userPosition: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  idText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: 4,
  },
  contentContainer: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  appInfoSection: {
    marginBottom: 24,
  },
  appInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  appLogo: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  appCopyright: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.error}15`,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.error,
    marginLeft: 8,
  },
});

export default ProfileScreen;
