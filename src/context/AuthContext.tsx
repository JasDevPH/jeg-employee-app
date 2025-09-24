// FILE: jeg-employee-app/src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { API_BASE_URL } from "../config/api";

interface User {
  id: string;
  employeeId: string;
  email: string;
  role: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position?: string;
    isActive: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  deviceKey: string | null;
  login: (
    employeeId: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("token");
      const storedDeviceKey = await SecureStore.getItemAsync("deviceKey");
      const storedUser = await SecureStore.getItemAsync("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setDeviceKey(storedDeviceKey); // deviceKey might be null for web users
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceInfo = () => {
    return `${Device.brand || "Unknown"} ${Device.modelName || "Device"} (${
      Device.osName
    } ${Device.osVersion})`;
  };

  const login = async (
    employeeId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const deviceInfo = getDeviceInfo();

      console.log("Attempting login with:", { employeeId, deviceInfo });

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          password,
          platform: "mobile",
          deviceInfo,
        }),
      });

      const data = await response.json();
      console.log("Login response:", { status: response.status, data });

      if (response.ok) {
        // Store auth data
        await SecureStore.setItemAsync("token", data.token);
        await SecureStore.setItemAsync("user", JSON.stringify(data.user));

        // Store device key if provided (mobile users)
        if (data.deviceKey) {
          await SecureStore.setItemAsync("deviceKey", data.deviceKey);
          setDeviceKey(data.deviceKey);
        }

        setToken(data.token);
        setUser(data.user);

        return { success: true };
      } else {
        return { success: false, error: data.message || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("deviceKey");
      await SecureStore.deleteItemAsync("user");

      setToken(null);
      setDeviceKey(null);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        deviceKey,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
