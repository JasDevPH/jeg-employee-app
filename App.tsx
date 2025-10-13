// FILE: jeg-employee-app/App.tsx
import React, { useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

import CustomSplashScreen from "./src/components/CustomSplashScreen";
import LoginScreen from "./src/screens/LoginScreen";
import AttendanceScreen from "./src/screens/AttendanceScreen";
import LeaveHistoryScreen from "./src/screens/LeaveHistoryScreen";
import LeaveRequestScreen from "./src/screens/LeaveRequestScreen";
import PayslipScreen from "./src/screens/PayslipScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { Colors } from "./src/constants/colors";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Attendance") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Leaves") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Payslip") {
            iconName = focused ? "document-text" : "document-text-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          letterSpacing: -0.3,
        },
      })}
    >
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: "Attendance",
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeaveHistoryScreen}
        options={{ title: "Leaves" }}
      />
      <Tab.Screen
        name="Payslip"
        component={PayslipScreen}
        options={{ title: "Payslip" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          letterSpacing: -0.3,
        },
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LeaveRequest"
            component={LeaveRequestScreen}
            options={{
              title: "Request Leave",
            }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{
              title: "Change Password",
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <CustomSplashScreen onReady={() => setAppIsReady(true)} />;
  }

  return (
    <AuthProvider>
      <NavigationContainer onReady={onLayoutRootView}>
        <AppNavigator />
        <StatusBar style="dark" backgroundColor={Colors.background} />
      </NavigationContainer>
    </AuthProvider>
  );
}
