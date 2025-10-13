// FILE: jeg-employee-app/src/screens/PayslipScreen.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";

// Interfaces remain the same
interface PayslipItem {
  id: string;
  payrollCycleId: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  workDays: number;
  finalized: boolean;
  payrollCycle: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    period: string;
  };
  createdAt: string;
}

interface PayslipBreakdown {
  payslipId: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    position: string;
    email: string;
    branch: { name: string; address: string };
  };
  payPeriod: {
    startDate: string;
    endDate: string;
    status: string;
    workDays: number;
  };
  earnings: {
    basicPay: number;
    allowances: Record<string, number>;
    grossPay: number;
  };
  deductions: {
    statutory: {
      sss: number;
      philHealth: number;
      pagIbig: number;
      subtotal: number;
    };
    leave: { unpaidDays: number; amount: number };
    other: { items: Record<string, number>; subtotal: number };
    total: number;
  };
  netPay: number;
  createdAt: string;
}

interface PayslipResponse {
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    isActive: boolean;
  };
  summary: {
    totalPayslips: number;
    totalEarnings: number;
    averageNetPay: number;
    lastPayDate: string | null;
  };
  payslips: PayslipItem[];
}

const PayslipScreen: React.FC = () => {
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [summary, setSummary] = useState<PayslipResponse["summary"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayslip, setSelectedPayslip] =
    useState<PayslipBreakdown | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { user, token } = useAuth();

  const fetchPayslips = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        const actualEmployeeId = user?.employee?.id || user?.employeeId;

        if (!actualEmployeeId) {
          setLoading(false);
          setRefreshing(false);
          Alert.alert(
            "Error",
            "Employee ID not found. Please log out and log in again."
          );
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/payroll/employee/${actualEmployeeId}?limit=20`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (response.ok) {
          const data: PayslipResponse = await response.json();
          setPayslips(data.payslips || []);
          setSummary(data.summary || null);
        } else {
          const errorText = await response.text();
          let errorMessage = `Failed to load payslips (${response.status})`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          Alert.alert("Error", errorMessage);
        }
      } catch (error) {
        console.error("Network error fetching payslips:", error);
        Alert.alert(
          "Network Error",
          "Unable to connect to server. Please check your connection."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, token]
  );

  const fetchPayslipDetail = async (payslipId: string) => {
    setLoadingDetail(true);
    try {
      const payslip = payslips.find((p) => p.id === payslipId);
      if (!payslip) {
        Alert.alert("Error", "Payslip not found");
        setLoadingDetail(false);
        return;
      }

      const grossPay = Number(payslip.grossPay);
      const monthlyGross = grossPay * 2;

      const sssContribution =
        Math.round((Math.min(monthlyGross * 0.045, 1350) / 2) * 100) / 100;
      const philHealthContribution =
        Math.round(
          ((monthlyGross < 10000 ? 250 : Math.min(monthlyGross * 0.025, 2500)) /
            2) *
            100
        ) / 100;
      const pagIbigRate = monthlyGross <= 1500 ? 0.01 : 0.02;
      const pagIbigContribution =
        Math.round((Math.min(monthlyGross * pagIbigRate, 100) / 2) * 100) / 100;

      const statutoryTotal =
        sssContribution + philHealthContribution + pagIbigContribution;
      const otherDeductions = Math.max(
        0,
        Number(payslip.totalDeductions) - statutoryTotal
      );

      const breakdown: PayslipBreakdown = {
        payslipId: payslip.id,
        employee: {
          id: user?.employee?.id || user?.id || "",
          employeeCode:
            user?.employee?.employeeCode || user?.employeeCode || "N/A",
          fullName: user?.employee
            ? `${user.employee.firstName} ${user.employee.lastName}`
            : "Employee",
          position: user?.employee?.position || "N/A",
          email: user?.email || "N/A",
          branch: { name: "Main Office", address: "N/A" },
        },
        payPeriod: {
          startDate: payslip.payrollCycle.startDate,
          endDate: payslip.payrollCycle.endDate,
          status: payslip.payrollCycle.status,
          workDays: payslip.workDays || 0,
        },
        earnings: {
          basicPay: grossPay,
          allowances: {},
          grossPay: grossPay,
        },
        deductions: {
          statutory: {
            sss: sssContribution,
            philHealth: philHealthContribution,
            pagIbig: pagIbigContribution,
            subtotal: statutoryTotal,
          },
          leave: { unpaidDays: 0, amount: 0 },
          other: {
            items:
              otherDeductions > 0
                ? { "Other Deductions": otherDeductions }
                : {},
            subtotal: otherDeductions,
          },
          total: Number(payslip.totalDeductions),
        },
        netPay: Number(payslip.netPay),
        createdAt: payslip.createdAt,
      };

      setSelectedPayslip(breakdown);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error building payslip detail:", error);
      Alert.alert("Error", "Failed to load payslip details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadPayslipPDF = async (
    payslipId: string,
    employeeCode: string
  ) => {
    setDownloadingPDF(true);
    try {
      const payslip = payslips.find((p) => p.id === payslipId);
      if (!payslip) {
        Alert.alert("Error", "Payslip not found");
        setDownloadingPDF(false);
        return;
      }

      const actualEmployeeId = user?.employee?.id || user?.employeeId;
      const fileName = `payslip-${employeeCode}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      const downloadResult = await FileSystem.downloadAsync(
        `${API_BASE_URL}/api/payroll/cycles/${payslip.payrollCycleId}/payslip/${actualEmployeeId}`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: "application/pdf",
            dialogTitle: "Share Payslip",
          });
        } else {
          Alert.alert("Success", "Payslip saved successfully");
        }
      } else {
        Alert.alert("Error", "Failed to download payslip");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      Alert.alert("Error", "Failed to download payslip. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const actualEmployeeId = user?.employee?.id || user?.employeeId;
      if (actualEmployeeId && token) {
        fetchPayslips();
      } else {
        setLoading(false);
      }
    }, [fetchPayslips, user, token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayslips(true);
  };

  const formatPeriod = (payslip: PayslipItem): string => {
    if (payslip.payrollCycle?.period) {
      return payslip.payrollCycle.period;
    }
    const startDate = new Date(
      payslip.payrollCycle?.startDate
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endDate = new Date(payslip.payrollCycle?.endDate).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" }
    );
    return `${startDate} - ${endDate}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return Colors.success;
      case "FINALIZED":
        return Colors.primary;
      case "DRAFT":
        return Colors.warning;
      default:
        return Colors.darkGray;
    }
  };

  const renderPayslipItem = ({ item }: { item: PayslipItem }) => (
    <TouchableOpacity
      style={styles.payslipCard}
      onPress={() => fetchPayslipDetail(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.payslipHeader}>
        <View style={styles.periodSection}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <Text style={styles.periodText}>{formatPeriod(item)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${getStatusColor(
                item.payrollCycle?.status || "DRAFT"
              )}20`,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: getStatusColor(
                  item.payrollCycle?.status || "DRAFT"
                ),
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.payrollCycle?.status || "DRAFT") },
            ]}
          >
            {item.payrollCycle?.status || "PROCESSING"}
          </Text>
        </View>
      </View>

      <View style={styles.payslipBody}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Net Pay</Text>
          <Text style={styles.netPayAmount}>
            ₱{Number(item.netPay).toLocaleString()}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="trending-up" size={16} color={Colors.success} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Gross Pay</Text>
              <Text style={styles.detailValue}>
                ₱{Number(item.grossPay).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="trending-down" size={16} color={Colors.error} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Deductions</Text>
              <Text style={[styles.detailValue, { color: Colors.error }]}>
                -₱{Number(item.totalDeductions).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {item.workDays > 0 && (
          <View style={styles.workDaysBadge}>
            <Ionicons
              name="briefcase-outline"
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.workDaysText}>{item.workDays} work days</Text>
          </View>
        )}
      </View>

      <View style={styles.payslipFooter}>
        <Ionicons name="eye-outline" size={14} color={Colors.primary} />
        <Text style={styles.viewDetailsText}>Tap to view full details</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading payslips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {summary && payslips.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Earnings</Text>
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Payslips</Text>
              <Text style={styles.summaryValue}>{summary.totalPayslips}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg. Net Pay</Text>
              <Text style={styles.summaryValue}>
                ₱{Math.round(summary.averageNetPay).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={payslips}
        renderItem={renderPayslipItem}
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
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.textSecondary}
              />
            </View>
            <Text style={styles.emptyText}>No payslips available</Text>
            <Text style={styles.emptySubtext}>
              Your payslips will appear here once payroll is processed
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => fetchPayslips()}
            >
              <Ionicons name="refresh" size={16} color={Colors.primary} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {loadingDetail ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>Loading details...</Text>
              </View>
            ) : selectedPayslip ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Payslip Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons
                      name="close"
                      size={28}
                      color={Colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Employee Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>
                      Employee Information
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>ID:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPayslip.employee.employeeCode}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPayslip.employee.fullName}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Position:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPayslip.employee.position}
                      </Text>
                    </View>
                  </View>

                  {/* Pay Period */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Pay Period</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Period:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(
                          selectedPayslip.payPeriod.startDate
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          selectedPayslip.payPeriod.endDate
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Work Days:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPayslip.payPeriod.workDays}
                      </Text>
                    </View>
                  </View>

                  {/* Earnings */}
                  <View style={styles.detailSection}>
                    <Text
                      style={[styles.sectionTitle, { color: Colors.success }]}
                    >
                      Earnings
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Basic Pay:</Text>
                      <Text style={styles.infoValue}>
                        ₱{selectedPayslip.earnings.basicPay.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.infoRow, styles.totalRow]}>
                      <Text style={[styles.infoLabel, { fontWeight: "bold" }]}>
                        Gross Pay:
                      </Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { fontWeight: "bold", color: Colors.success },
                        ]}
                      >
                        ₱{selectedPayslip.earnings.grossPay.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Deductions */}
                  <View style={styles.detailSection}>
                    <Text
                      style={[styles.sectionTitle, { color: Colors.error }]}
                    >
                      Deductions
                    </Text>
                    <Text style={styles.subSectionTitle}>
                      Statutory Contributions
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SSS:</Text>
                      <Text style={styles.infoValue}>
                        ₱
                        {selectedPayslip.deductions.statutory.sss.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>PhilHealth:</Text>
                      <Text style={styles.infoValue}>
                        ₱
                        {selectedPayslip.deductions.statutory.philHealth.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Pag-IBIG:</Text>
                      <Text style={styles.infoValue}>
                        ₱
                        {selectedPayslip.deductions.statutory.pagIbig.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.infoRow, styles.totalRow]}>
                      <Text style={[styles.infoLabel, { fontWeight: "bold" }]}>
                        Total Deductions:
                      </Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { fontWeight: "bold", color: Colors.error },
                        ]}
                      >
                        ₱{selectedPayslip.deductions.total.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Net Pay */}
                  <View style={[styles.detailSection, styles.netPaySection]}>
                    <View style={styles.infoRow}>
                      <Text
                        style={[styles.sectionTitle, { color: Colors.primary }]}
                      >
                        NET PAY
                      </Text>
                      <Text style={styles.netPayFinal}>
                        ₱{selectedPayslip.netPay.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Download Button */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() =>
                      downloadPayslipPDF(
                        selectedPayslip.payslipId,
                        selectedPayslip.employee.employeeCode
                      )
                    }
                    disabled={downloadingPDF}
                  >
                    {downloadingPDF ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons
                          name="download-outline"
                          size={20}
                          color={Colors.white}
                        />
                        <Text style={styles.downloadButtonText}>
                          Download PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  summaryContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  summaryCards: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  listContainer: {
    padding: 20,
  },
  payslipCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  payslipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  periodSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  payslipBody: {
    padding: 16,
  },
  amountRow: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  netPayAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  detailContent: {
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  workDaysBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workDaysText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
    marginLeft: 4,
  },
  payslipFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: Colors.background,
  },
  viewDetailsText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: "500",
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
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "95%",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  netPaySection: {
    backgroundColor: Colors.primaryFaded,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  netPayFinal: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  downloadButton: {
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
  downloadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default PayslipScreen;
