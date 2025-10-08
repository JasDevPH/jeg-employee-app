// FILE: jeg-employee-app/src/components/CustomSplashScreen.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, Image, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from "../constants/colors";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get("window");

interface CustomSplashScreenProps {
  onReady: () => void;
}

const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({ onReady }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide splash after animation
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      onReady();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onReady, fadeAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={[Colors.secondary, Colors.secondaryLight]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../assets/jeg_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: width,
    height: height,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    padding: 40,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: 200,
    height: 200,
  },
});

export default CustomSplashScreen;
