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
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Colors } from "../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Responsive sizing
const isSmallScreen = SCREEN_WIDTH < 375;
const scale = SCREEN_WIDTH / 375;

const normalize = (size: number) => {
  return Math.round(size * scale);
};

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

  const profileInfo = [
    {
      icon: "person-outline",
      label: "Full Name",
      value: getFullName(),
      color: Colors.primary,
    },
    {
      icon: "mail-outline",
      label: "Email",
      value: getEmail(),
      color: Colors.info,
    },
    {
      icon: "briefcase-outline",
      label: "Position",
      value: getPosition(),
      color: Colors.success,
    },
    {
      icon: "shield-outline",
      label: "Status",
      value: isActive() ? "Active" : "Inactive",
      color: isActive() ? Colors.success : Colors.error,
      showStatus: true,
    },
  ];

  const profileActions = [
    {
      icon: "key-outline",
      label: "Change Password",
      color: Colors.primary,
      onPress: () => navigation.navigate("ResetPassword"),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Profile Header with Gradient */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons
                name="person"
                size={normalize(48)}
                color={Colors.primary}
              />
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isActive() ? Colors.success : Colors.error,
                },
              ]}
            >
              <View style={styles.statusDot} />
            </View>
          </View>

          <Text style={styles.userName} numberOfLines={2}>
            {getFullName()}
          </Text>
          <Text style={styles.userPosition} numberOfLines={1}>
            {getPosition()}
          </Text>

          <View style={styles.idBadge}>
            <Ionicons
              name="id-card-outline"
              size={normalize(14)}
              color={Colors.white}
            />
            <Text style={styles.idText}>ID: {getEmployeeId()}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            {profileInfo.map((info, index) => (
              <React.Fragment key={index}>
                <View style={styles.infoRow}>
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: `${info.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={info.icon as any}
                      size={normalize(20)}
                      color={info.color}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{info.label}</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        info.showStatus && { color: info.color },
                      ]}
                      numberOfLines={1}
                    >
                      {info.value}
                    </Text>
                  </View>
                </View>
                {index < profileInfo.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            {profileActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: `${action.color}15` },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={normalize(24)}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {action.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={normalize(18)}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.error, "#DC2626"]}
            style={styles.logoutGradient}
          >
            <Ionicons
              name="log-out-outline"
              size={normalize(20)}
              color={Colors.white}
            />
            <Text style={styles.logoutText}>Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>© 2025 JEG Ventures Corporation</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarCircle: {
    width: normalize(100),
    height: normalize(100),
    borderRadius: normalize(50),
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: `${Colors.white}40`,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  statusBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: normalize(26),
    height: normalize(26),
    borderRadius: normalize(13),
    borderWidth: 3,
    borderColor: Colors.white,
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
    fontSize: normalize(24),
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: -0.5,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  userPosition: {
    fontSize: normalize(16),
    color: `${Colors.white}90`,
    marginBottom: 12,
    textAlign: "center",
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.white}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.white}40`,
  },
  idText: {
    fontSize: normalize(12),
    color: Colors.white,
    fontWeight: "600",
    marginLeft: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: normalize(18),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoIconCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: normalize(12),
    color: Colors.textSecondary,
    marginBottom: 2,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: normalize(15),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  actionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIconCircle: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionLabel: {
    flex: 1,
    fontSize: normalize(15),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  appInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  appInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appLogoCircle: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appLogoText: {
    fontSize: normalize(22),
    fontWeight: "bold",
    color: Colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  appInfoContent: {
    flex: 1,
  },
  appName: {
    fontSize: normalize(16),
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  appVersion: {
    fontSize: normalize(12),
    color: Colors.textSecondary,
  },
  appDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  appDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  appDetailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  appDetailDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  appDetailText: {
    fontSize: normalize(12),
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  logoutButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: normalize(16),
    fontWeight: "700",
    color: Colors.white,
    marginLeft: 8,
  },
  footer: {
    fontSize: normalize(11),
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
});

export default ProfileScreen;
