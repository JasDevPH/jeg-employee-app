// FILE: jeg-employee-app/src/components/CustomSplashScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  Text,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from "../constants/colors";

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get("window");

interface CustomSplashScreenProps {
  onReady: () => void;
}

const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({ onReady }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [textFadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Start animations in sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide splash after animation
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      onReady();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onReady, fadeAnim, scaleAnim, textFadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/jeg_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Animated.View
          style={[styles.textContainer, { opacity: textFadeAnim }]}
        >
          <Text style={styles.appName}>JEG Employee</Text>
          <Text style={styles.tagline}>Your workplace companion</Text>
        </Animated.View>

        <Animated.View
          style={[styles.loadingContainer, { opacity: textFadeAnim }]}
        >
          <View style={styles.loadingBar}>
            <Animated.View
              style={[
                styles.loadingProgress,
                {
                  transform: [
                    {
                      translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 0],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 JEG Ventures Corporation</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
    width: width,
    height: height,
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginBottom: 32,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.primaryFaded,
  },
  logo: {
    width: 160,
    height: 160,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  loadingContainer: {
    width: 200,
    alignItems: "center",
  },
  loadingBar: {
    width: "100%",
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingProgress: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});

export default CustomSplashScreen;
