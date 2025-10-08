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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";

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
    branch: {
      name: string;
      address: string;
    };
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
    leave: {
      unpaidDays: number;
      amount: number;
    };
    other: {
      items: Record<string, number>;
      subtotal: number;
    };
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
          branch: {
            name: "Main Office",
            address: "N/A",
          },
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
          leave: {
            unpaidDays: 0,
            amount: 0,
          },
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

      console.log("Breakdown created:", breakdown); // Debug log
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endDate = new Date(payslip.payrollCycle?.endDate).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
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
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.payslipHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.periodContainer}>
            <Ionicons name="calendar-outline" size={20} color={Colors.white} />
            <Text style={styles.periodText}>{formatPeriod(item)}</Text>
          </View>
          <View style={styles.netPayContainer}>
            <Text style={styles.netPayLabel}>Net Pay</Text>
            <Text style={styles.netPayText}>
              ₱{Number(item.netPay).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
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
          <Text style={styles.statusText}>
            {item.payrollCycle?.status || "PROCESSING"}
          </Text>
          {item.workDays > 0 && (
            <Text style={styles.workDaysText}>• {item.workDays} work days</Text>
          )}
        </View>
      </LinearGradient>

      <View style={styles.payslipDetails}>
        <View style={styles.payslipRow}>
          <View style={styles.rowIcon}>
            <Ionicons name="trending-up" size={16} color={Colors.success} />
          </View>
          <Text style={styles.labelText}>Gross Pay:</Text>
          <Text style={styles.valueText}>
            ₱{Number(item.grossPay).toLocaleString()}
          </Text>
        </View>

        <View style={styles.payslipRow}>
          <View style={styles.rowIcon}>
            <Ionicons name="trending-down" size={16} color={Colors.error} />
          </View>
          <Text style={styles.labelText}>Total Deductions:</Text>
          <Text style={[styles.valueText, styles.deductionText]}>
            -₱{Number(item.totalDeductions).toLocaleString()}
          </Text>
        </View>

        <View style={[styles.payslipRow, styles.netPayRow]}>
          <View style={styles.rowIcon}>
            <Ionicons name="wallet" size={16} color={Colors.primary} />
          </View>
          <Text style={[styles.labelText, styles.netPayLabelText]}>
            Net Pay:
          </Text>
          <Text style={[styles.valueText, styles.netPayValue]}>
            ₱{Number(item.netPay).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.payslipFooter}>
        <Ionicons name="eye-outline" size={14} color={Colors.primary} />
        <Text style={styles.tapText}>Tap to view details</Text>
      </View>
    </TouchableOpacity>
  );

  const actualEmployeeId = user?.employee?.id || user?.employeeId;

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
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {summary && payslips.length > 0 && (
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={[Colors.secondary, Colors.secondaryLight]}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Payslips</Text>
                <Text style={styles.summaryValue}>{summary.totalPayslips}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Average Pay</Text>
                <Text style={styles.summaryValue}>
                  ₱{Math.round(summary.averageNetPay).toLocaleString()}
                </Text>
              </View>
            </View>
          </LinearGradient>
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
            <Ionicons
              name="document-text-outline"
              size={80}
              color={Colors.darkGray}
            />
            <Text style={styles.emptyText}>No payslips available</Text>
            <Text style={styles.emptySubtext}>
              Your payslips will appear here once payroll is processed and
              finalized
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
                    <Ionicons name="close" size={28} color={Colors.secondary} />
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
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Branch:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPayslip.employee.branch.name}
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
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status:</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            color: getStatusColor(
                              selectedPayslip.payPeriod.status
                            ),
                          },
                        ]}
                      >
                        {selectedPayslip.payPeriod.status}
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
                    {Object.entries(selectedPayslip.earnings.allowances).map(
                      ([key, value]) => (
                        <View key={key} style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              { fontSize: 12, color: Colors.darkGray },
                            ]}
                          >
                            {" "}
                            {key}:
                          </Text>
                          <Text style={[styles.infoValue, { fontSize: 12 }]}>
                            ₱{Number(value).toLocaleString()}
                          </Text>
                        </View>
                      )
                    )}
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

                    {/* Statutory */}
                    <Text style={styles.subSectionTitle}>
                      Statutory Contributions
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SSS (4.5%):</Text>
                      <Text style={styles.infoValue}>
                        ₱
                        {selectedPayslip.deductions.statutory.sss.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>PhilHealth (2.5%):</Text>
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
                    <View style={[styles.infoRow, { marginLeft: 10 }]}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { fontSize: 12, fontStyle: "italic" },
                        ]}
                      >
                        Statutory Subtotal:
                      </Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { fontSize: 12, fontStyle: "italic" },
                        ]}
                      >
                        ₱
                        {selectedPayslip.deductions.statutory.subtotal.toLocaleString()}
                      </Text>
                    </View>

                    {/* Leave Deductions */}
                    {selectedPayslip.deductions.leave.amount > 0 && (
                      <>
                        <Text
                          style={[styles.subSectionTitle, { marginTop: 10 }]}
                        >
                          Leave Deductions
                        </Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>
                            Unpaid Leave Days:
                          </Text>
                          <Text style={styles.infoValue}>
                            {selectedPayslip.deductions.leave.unpaidDays}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Amount:</Text>
                          <Text style={styles.infoValue}>
                            ₱
                            {selectedPayslip.deductions.leave.amount.toLocaleString()}
                          </Text>
                        </View>
                      </>
                    )}

                    {/* Other Deductions */}
                    {Object.keys(selectedPayslip.deductions.other.items)
                      .length > 0 && (
                      <>
                        <Text
                          style={[styles.subSectionTitle, { marginTop: 10 }]}
                        >
                          Other Deductions
                        </Text>
                        {Object.entries(
                          selectedPayslip.deductions.other.items
                        ).map(([key, value]) => (
                          <View key={key} style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{key}:</Text>
                            <Text style={styles.infoValue}>
                              ₱{Number(value).toLocaleString()}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}

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
                      <Text style={[styles.netPayFinal]}>
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
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryDark]}
                      style={styles.downloadButtonGradient}
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
                    </LinearGradient>
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
  summaryContainer: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: "hidden",
  },
  summaryGradient: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.white,
  },
  listContainer: {
    padding: 16,
  },
  payslipCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  payslipHeader: {
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  periodContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  periodText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
    marginLeft: 8,
  },
  netPayContainer: {
    alignItems: "flex-end",
  },
  netPayLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
  },
  netPayText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    fontWeight: "600",
  },
  workDaysText: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.7,
    marginLeft: 8,
  },
  payslipDetails: {
    padding: 20,
  },
  payslipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rowIcon: {
    width: 24,
    marginRight: 12,
    alignItems: "center",
  },
  labelText: {
    fontSize: 14,
    color: Colors.darkGray,
    flex: 1,
  },
  valueText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
  },
  deductionText: {
    color: Colors.error,
  },
  netPayRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
    marginBottom: 0,
  },
  netPayLabelText: {
    fontWeight: "bold",
  },
  netPayValue: {
    fontWeight: "bold",
    color: Colors.primary,
    fontSize: 18,
  },
  payslipFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: Colors.lightGray,
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
  },
  tapText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.darkGray,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "95%", // Changed from maxHeight to fixed height
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.secondary,
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.darkGray,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.darkGray,
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
    color: Colors.darkGray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
    marginTop: 8,
    paddingTop: 12,
  },
  netPaySection: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  netPayFinal: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
  },
  downloadButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  downloadButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  downloadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default PayslipScreen;
