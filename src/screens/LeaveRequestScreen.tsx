// FILE: jeg-employee-app/src/screens/LeaveRequestScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { Colors } from "../constants/colors";

interface LeaveRequestScreenProps {
  navigation: any;
}

const LeaveRequestScreen: React.FC<LeaveRequestScreenProps> = ({
  navigation,
}) => {
  const [leaveType, setLeaveType] = useState("VACATION");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const leaveTypes = [
    {
      label: "Vacation Leave",
      value: "VACATION",
      icon: "airplane",
      color: Colors.info,
    },
    {
      label: "Sick Leave",
      value: "SICK",
      icon: "medical",
      color: Colors.error,
    },
    {
      label: "Unpaid Leave",
      value: "UNPAID",
      icon: "wallet-outline",
      color: Colors.darkGray,
    },
    {
      label: "Others",
      value: "OTHERS",
      icon: "calendar",
      color: Colors.primary,
    },
  ];

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for your leave request");
      return;
    }

    if (startDate > endDate) {
      Alert.alert("Error", "End date cannot be before start date");
      return;
    }

    if (startDate < new Date()) {
      Alert.alert("Error", "Start date cannot be in the past");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: leaveType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success",
          "Your leave request has been submitted and is pending approval.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to submit leave request");
      }
    } catch (error) {
      console.error("Leave request error:", error);
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getSelectedLeaveType = () => {
    return leaveTypes.find((type) => type.value === leaveType) || leaveTypes[0];
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Request Leave</Text>
          <Text style={styles.subtitle}>
            Fill in the details below to submit your leave request
          </Text>
        </View>

        {/* Leave Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Leave Type</Text>
          <View style={styles.leaveTypeCard}>
            <View style={styles.selectedTypeHeader}>
              <View
                style={[
                  styles.typeIconCircle,
                  { backgroundColor: `${getSelectedLeaveType().color}20` },
                ]}
              >
                <Ionicons
                  name={getSelectedLeaveType().icon as any}
                  size={24}
                  color={getSelectedLeaveType().color}
                />
              </View>
              <Text style={styles.selectedTypeText}>
                {getSelectedLeaveType().label}
              </Text>
            </View>
            <Picker
              selectedValue={leaveType}
              onValueChange={(itemValue) => setLeaveType(itemValue)}
              style={styles.picker}
            >
              {leaveTypes.map((type) => (
                <Picker.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.dateGrid}>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.dateButtonText}>
                  {startDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.dateButtonText}>
                  {endDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration Display */}
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.durationText}>
              Total: {calculateDuration()} day(s)
            </Text>
          </View>
        </View>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
                if (selectedDate > endDate) {
                  setEndDate(selectedDate);
                }
              }
            }}
            minimumDate={new Date()}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
            minimumDate={startDate}
          />
        )}

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reason for Leave</Text>
          <View style={styles.textAreaCard}>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Please provide a detailed reason for your leave request..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={Colors.white} />
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </>
          )}
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  leaveTypeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedTypeText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  picker: {
    height: 50,
  },
  dateGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textPrimary,
    marginLeft: 12,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryFaded,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  durationText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 8,
  },
  textAreaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  textArea: {
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default LeaveRequestScreen;
