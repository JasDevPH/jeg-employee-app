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
import { LinearGradient } from "expo-linear-gradient";
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
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Request Leave</Text>
          <Text style={styles.subtitle}>
            Fill out the form below to submit your leave request
          </Text>
        </View>

        {/* Leave Type */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Leave Type</Text>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: getSelectedLeaveType().color },
                ]}
              >
                <Ionicons
                  name={getSelectedLeaveType().icon as any}
                  size={20}
                  color={Colors.white}
                />
              </View>
              <Text style={styles.pickerLabel}>
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
        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <View style={styles.dateContainer}>
              <Text style={styles.sectionTitle}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateText}>
                  {startDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateContainer}>
              <Text style={styles.sectionTitle}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration Display */}
          <View style={styles.durationContainer}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.durationText}>
              Duration: {calculateDuration()} day(s)
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
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Reason</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Please provide a detailed reason for your leave request..."
              placeholderTextColor={Colors.darkGray}
              multiline
              numberOfLines={4}
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
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.submitButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={Colors.white} />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
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
  content: {
    padding: 20,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.darkGray,
    lineHeight: 22,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.secondary,
  },
  picker: {
    height: 50,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 12,
    fontWeight: "500",
  },
  durationContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  durationText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 8,
  },
  textAreaContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    padding: 16,
    fontSize: 16,
    color: Colors.secondary,
    height: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    borderRadius: 16,
    marginTop: 32,
    marginBottom: Platform.OS === "ios" ? 40 : 20,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default LeaveRequestScreen;
