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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

  // Helper functions to get user data
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

  const getEmploymentStatus = () => {
    if (user?.employee?.isActive !== undefined) {
      return user.employee.isActive ? "Active" : "Inactive";
    }
    return "Active";
  };

  const isActive = () => {
    if (user?.employee?.isActive !== undefined) {
      return user.employee.isActive;
    }
    return true;
  };

  const profileSections = [
    {
      title: "Personal Information",
      items: [
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
          label: "Role",
          value: user?.role?.replace("_", " ") || "Employee",
          color: Colors.warning,
        },
      ],
    },
    {
      title: "Employment Details",
      items: [
        {
          icon: "business-outline",
          label: "Employment Type",
          value: "Full Time",
          color: Colors.primary,
        },
        {
          icon: "checkmark-circle-outline",
          label: "Status",
          value: getEmploymentStatus(),
          color: isActive() ? Colors.success : Colors.error,
        },
        {
          icon: "calendar-outline",
          label: "Employee ID",
          value: getEmployeeId(),
          color: Colors.info,
        },
      ],
    },
    {
      title: "App Information",
      items: [
        {
          icon: "phone-portrait-outline",
          label: "App Version",
          value: "1.0.0",
          color: Colors.darkGray,
        },
        {
          icon: "shield-checkmark-outline",
          label: "Device Security",
          value: "Device Bound",
          color: Colors.success,
        },
        {
          icon: "sync-outline",
          label: "Last Sync",
          value: "Just now",
          color: Colors.primary,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {/* Profile Header */}
      <LinearGradient
        colors={[Colors.secondary, Colors.secondaryLight]}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.avatar}
          >
            <Ionicons name="person" size={48} color={Colors.white} />
          </LinearGradient>
        </View>

        <Text style={styles.name}>{getFullName()}</Text>

        <Text style={styles.position}>{getPosition()}</Text>

        <View style={styles.idContainer}>
          <Ionicons
            name="id-card-outline"
            size={16}
            color={Colors.mediumGray}
          />
          <Text style={styles.employeeId}>ID: {getEmployeeId()}</Text>
        </View>
      </LinearGradient>

      {/* Profile Sections */}
      <View style={styles.contentContainer}>
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            {section.items.map((item, itemIndex) => (
              <View
                key={itemIndex}
                style={[
                  styles.infoItem,
                  itemIndex === section.items.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={item.color}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      item.label === "Status" &&
                        !isActive() && { color: Colors.error },
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.mediumGray}
                />
              </View>
            ))}
          </View>
        ))}

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Ionicons name="key-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color={Colors.darkGray}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.actionButtonText}>Notification Settings</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color={Colors.darkGray}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.actionButtonText}>Help & Support</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color={Colors.darkGray}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={[Colors.error, "#DC2626"]}
            style={styles.logoutButtonGradient}
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.white} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 4,
    textAlign: "center",
  },
  position: {
    fontSize: 16,
    color: Colors.mediumGray,
    marginBottom: 12,
  },
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionButton: {
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 16,
    flex: 1,
  },
  employeeId: {
    fontSize: 12,
    color: Colors.mediumGray,
    marginLeft: 4,
    fontWeight: "500",
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.secondary,
    padding: 20,
    paddingBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 2,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.secondary,
  },
  actionsSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.secondary,
  },
  logoutButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 40,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  debugContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.warning,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: Colors.darkGray,
    fontFamily: "monospace",
    marginBottom: 4,
  },
});

export default ProfileScreen;
