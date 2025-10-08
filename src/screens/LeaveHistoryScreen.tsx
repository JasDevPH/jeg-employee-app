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
import { LinearGradient } from "expo-linear-gradient";
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

        // Use employee.id if available, otherwise use employeeId
        const actualEmployeeId = user?.employee?.id || user?.employeeId;

        if (!actualEmployeeId) {
          console.error("No employee ID available");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/employee/${actualEmployeeId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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
    [user, token] // Remove specific employeeId dependency
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
              { backgroundColor: getLeaveTypeColor(item.type) },
            ]}
          >
            <Ionicons
              name={getLeaveTypeIcon(item.type) as any}
              size={20}
              color={Colors.white}
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
            styles.statusContainer,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color={Colors.white}
          />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.leaveDetails}>
        <Text style={styles.leaveDates}>
          {new Date(item.startDate).toLocaleDateString()} -{" "}
          {new Date(item.endDate).toLocaleDateString()}
        </Text>
        {item.reason && (
          <Text style={styles.leaveReason} numberOfLines={2}>
            {item.reason}
          </Text>
        )}
        {item.status === "APPROVED" && item.isPaid !== undefined && (
          <View style={styles.paidContainer}>
            <Ionicons
              name={item.isPaid ? "card" : "card-outline"}
              size={14}
              color={item.isPaid ? Colors.success : Colors.darkGray}
            />
            <Text
              style={[
                styles.paidStatus,
                { color: item.isPaid ? Colors.success : Colors.darkGray },
              ]}
            >
              {item.isPaid ? "Paid Leave" : "Unpaid Leave"}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.leaveDate}>
        Submitted: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {/* Leave Balance Header */}
      {leaveBalance && (
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.balanceContainer}
        >
          <Text style={styles.balanceTitle}>Leave Balance</Text>
          <View style={styles.balanceCards}>
            <View style={styles.balanceCard}>
              <Ionicons name="airplane" size={24} color={Colors.primary} />
              <Text style={styles.balanceType}>Vacation Leave</Text>
              <Text style={styles.balanceValue}>
                {leaveBalance.vacation?.remaining || 0}/
                {leaveBalance.vacation?.entitled || 0}
              </Text>
              <Text style={styles.balanceLabel}>days remaining</Text>
            </View>
            <View style={styles.balanceCard}>
              <Ionicons name="medical" size={24} color={Colors.error} />
              <Text style={styles.balanceType}>Sick Leave</Text>
              <Text style={styles.balanceValue}>
                {leaveBalance.sick?.remaining || 0}/
                {leaveBalance.sick?.entitled || 0}
              </Text>
              <Text style={styles.balanceLabel}>days remaining</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Request Button */}
      <View style={styles.requestContainer}>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => navigation.navigate("LeaveRequest")}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.requestButtonGradient}
          >
            <Ionicons name="add-circle" size={24} color={Colors.white} />
            <Text style={styles.requestButtonText}>New Leave Request</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Leave History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Leave History</Text>
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
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.darkGray}
              />
              <Text style={styles.emptyText}>No leave requests found</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh or submit a new request
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
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.darkGray,
  },
  balanceContainer: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  balanceTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 16,
    textAlign: "center",
  },
  balanceCards: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 6,
    alignItems: "center",
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceType: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.darkGray,
    marginTop: 8,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 10,
    color: Colors.darkGray,
  },
  requestContainer: {
    padding: 16,
  },
  requestButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  requestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  requestButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 16,
  },
  leaveCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  leaveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  leaveTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  leaveTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: Colors.secondary,
  },
  leaveDuration: {
    fontSize: 12,
    color: Colors.darkGray,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  leaveDetails: {
    marginBottom: 8,
  },
  leaveDates: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.secondary,
    marginBottom: 8,
  },
  leaveReason: {
    fontSize: 13,
    color: Colors.darkGray,
    marginBottom: 8,
    lineHeight: 18,
  },
  paidContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paidStatus: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  leaveDate: {
    fontSize: 11,
    color: Colors.darkGray,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.darkGray,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: "center",
  },
});

export default LeaveHistoryScreen;
