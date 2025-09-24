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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

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
  annual: {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/employee/${user?.employeeId}`,
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
    [user?.employeeId, token]
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
        return "#10b981";
      case "REJECTED":
        return "#ef4444";
      case "PENDING":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case "SICK":
        return "#ef4444";
      case "VACATION":
        return "#0284c7";
      case "UNPAID":
        return "#6b7280";
      default:
        return "#8b5cf6";
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
              styles.leaveTypeBadge,
              { backgroundColor: getLeaveTypeColor(item.type) },
            ]}
          >
            <Text style={styles.leaveTypeText}>{item.type}</Text>
          </View>
          <Text style={styles.leaveDuration}>
            {calculateDuration(item.startDate, item.endDate)} day(s)
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
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
          <Text style={styles.paidStatus}>
            {item.isPaid ? "Paid Leave" : "Unpaid Leave"}
          </Text>
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
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Leave Balance */}
      {leaveBalance && (
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceTitle}>Leave Balance</Text>
          <View style={styles.balanceCards}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceType}>Annual Leave</Text>
              <Text style={styles.balanceValue}>
                {leaveBalance.annual.remaining}/{leaveBalance.annual.entitled}
              </Text>
              <Text style={styles.balanceLabel}>days remaining</Text>
            </View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceType}>Sick Leave</Text>
              <Text style={styles.balanceValue}>
                {leaveBalance.sick.remaining}/{leaveBalance.sick.entitled}
              </Text>
              <Text style={styles.balanceLabel}>days remaining</Text>
            </View>
          </View>
        </View>
      )}

      {/* Request Button */}
      <TouchableOpacity
        style={styles.requestButton}
        onPress={() => navigation.navigate("LeaveRequest")}
      >
        <Text style={styles.requestButtonText}>+ New Leave Request</Text>
      </TouchableOpacity>

      {/* Leave History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Leave History</Text>
        <FlatList
          data={leaves}
          renderItem={renderLeaveItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
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
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceContainer: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },
  balanceCards: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  balanceType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0284c7",
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  requestButton: {
    backgroundColor: "#0284c7",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  requestButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },
  leaveCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  },
  leaveTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  leaveTypeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  leaveDuration: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  leaveDetails: {
    marginBottom: 8,
  },
  leaveDates: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    marginBottom: 4,
  },
  leaveReason: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  paidStatus: {
    fontSize: 12,
    fontWeight: "500",
    color: "#059669",
  },
  leaveDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#9ca3af",
  },
});

export default LeaveHistoryScreen;
