// FILE: jeg-employee-app/src/screens/LeaveHistoryScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isPaid?: boolean;
  createdAt: string;
}

interface LeaveBalance {
  vacation: {
    entitled: number;
    taken: number;
    remaining: number;
  };
  sick: {
    entitled: number;
    taken: number;
    remaining: number;
  };
}

interface LeaveHistoryScreenProps {
  navigation: any;
}

const LeaveHistoryScreen: React.FC<LeaveHistoryScreenProps> = ({
  navigation,
}) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, token } = useAuth();

  const fetchLeaveData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        const actualEmployeeId = user?.employee?.id || user?.employeeId;

        if (!actualEmployeeId) {
          console.error("No employee ID available");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/employee/${actualEmployeeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          setLeaves(data.leaves || []);
          setLeaveBalance(data.leaveBalance || null);
        }
      } catch (error) {
        console.error("Error fetching leave data:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchLeaveData();
    }, [fetchLeaveData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaveData(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return Colors.success;
      case "REJECTED":
        return Colors.error;
      case "PENDING":
        return Colors.warning;
      default:
        return Colors.darkGray;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "checkmark-circle";
      case "REJECTED":
        return "close-circle";
      case "PENDING":
        return "time";
      default:
        return "help-circle";
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case "SICK":
        return "medical";
      case "VACATION":
        return "airplane";
      case "UNPAID":
        return "wallet-outline";
      default:
        return "calendar";
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case "SICK":
        return Colors.error;
      case "VACATION":
        return Colors.info;
      case "UNPAID":
        return Colors.darkGray;
      default:
        return Colors.primary;
    }
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const renderLeaveItem = ({ item }: { item: LeaveRequest }) => (
    <View style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <View style={styles.leaveTypeContainer}>
          <View
            style={[
              styles.leaveTypeIcon,
              { backgroundColor: `${getLeaveTypeColor(item.type)}20` },
            ]}
          >
            <Ionicons
              name={getLeaveTypeIcon(item.type) as any}
              size={24}
              color={getLeaveTypeColor(item.type)}
            />
          </View>
          <View style={styles.leaveInfo}>
            <Text style={styles.leaveType}>{item.type}</Text>
            <Text style={styles.leaveDuration}>
              {calculateDuration(item.startDate, item.endDate)} day(s)
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.leaveDetails}>
        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.leaveDates}>
            {new Date(item.startDate).toLocaleDateString()} -{" "}
            {new Date(item.endDate).toLocaleDateString()}
          </Text>
        </View>

        {item.reason && (
          <Text style={styles.leaveReason} numberOfLines={2}>
            {item.reason}
          </Text>
        )}

        {item.status === "APPROVED" && item.isPaid !== undefined && (
          <View style={styles.paidBadge}>
            <Ionicons
              name={item.isPaid ? "checkmark-circle" : "alert-circle"}
              size={14}
              color={item.isPaid ? Colors.success : Colors.warning}
            />
            <Text
              style={[
                styles.paidStatus,
                { color: item.isPaid ? Colors.success : Colors.warning },
              ]}
            >
              {item.isPaid ? "Paid Leave" : "Unpaid Leave"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.leaveFooter}>
        <Text style={styles.leaveDate}>
          Submitted {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading leave data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Leave Balance Header */}
      {leaveBalance && (
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceTitle}>Your Leave Balance</Text>
          <View style={styles.balanceCards}>
            <View style={styles.balanceCard}>
              <View
                style={[
                  styles.balanceIcon,
                  { backgroundColor: `${Colors.info}20` },
                ]}
              >
                <Ionicons name="airplane" size={28} color={Colors.info} />
              </View>
              <Text style={styles.balanceType}>Vacation</Text>
              <Text style={styles.balanceValue}>
                {leaveBalance.vacation?.remaining || 0}
              </Text>
              <Text style={styles.balanceLabel}>
                of {leaveBalance.vacation?.entitled || 0} days
              </Text>
            </View>

            <View style={styles.balanceCard}>
              <View
                style={[
                  styles.balanceIcon,
                  { backgroundColor: `${Colors.error}20` },
                ]}
              >
                <Ionicons name="medical" size={28} color={Colors.error} />
              </View>
              <Text style={styles.balanceType}>Sick Leave</Text>
              <Text style={styles.balanceValue}>
                {leaveBalance.sick?.remaining || 0}
              </Text>
              <Text style={styles.balanceLabel}>
                of {leaveBalance.sick?.entitled || 0} days
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Request Button */}
      <View style={styles.requestContainer}>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => navigation.navigate("LeaveRequest")}
        >
          <Ionicons name="add-circle" size={20} color={Colors.white} />
          <Text style={styles.requestButtonText}>New Leave Request</Text>
        </TouchableOpacity>
      </View>

      {/* Leave History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Requests</Text>
        <FlatList
          data={leaves}
          renderItem={renderLeaveItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={64}
                  color={Colors.textSecondary}
                />
              </View>
              <Text style={styles.emptyText}>No leave requests yet</Text>
              <Text style={styles.emptySubtext}>
                Submit your first leave request to get started
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  balanceContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  balanceCards: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceType: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -1,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  requestContainer: {
    padding: 20,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  leaveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leaveTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  leaveTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  leaveInfo: {
    flex: 1,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  leaveDuration: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  leaveDetails: {
    padding: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  leaveDates: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  leaveReason: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  paidStatus: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  leaveFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  leaveDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

export default LeaveHistoryScreen;
