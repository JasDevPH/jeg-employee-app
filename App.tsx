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
        tabBarInactiveTintColor: Colors.darkGray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.mediumGray,
          height: 88,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: Colors.secondary,
          shadowColor: Colors.secondary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: "Attendance" }}
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
        options={{ title: "Profile" }}
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
    <Stack.Navigator>
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
              headerStyle: {
                backgroundColor: Colors.secondary,
                shadowColor: Colors.secondary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              },
              headerTintColor: Colors.white,
              headerTitleStyle: { fontWeight: "600" },
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
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
        <StatusBar style="light" backgroundColor={Colors.secondary} />
      </NavigationContainer>
    </AuthProvider>
  );
}
