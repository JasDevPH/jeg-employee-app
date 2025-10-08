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
  employeeId?: string; // Make optional since admin users don't have employeeId
  employeeCode?: string;
  email?: string;
  role: string;
  firstName?: string;
  lastName?: string;
  employee?: {
    id: string;
    employeeCode?: string;
    firstName: string;
    lastName: string;
    position?: string;
    isActive: boolean;
  };
}

interface LoginResult {
  success: boolean;
  error?: string;
  requiresPasswordReset?: boolean;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  deviceKey: string | null;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  completeLogin: (userData: User) => Promise<void>;
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
        setDeviceKey(storedDeviceKey);
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
    identifier: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const deviceInfo = getDeviceInfo();

      console.log("Attempting login with:", { identifier, deviceInfo });

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: identifier, // Can be employeeId or email
          password,
          platform: "mobile",
          deviceInfo,
        }),
      });

      const data = await response.json();
      console.log("Login response:", { status: response.status, data });

      // Handle device binding errors FIRST (security priority)
      if (response.status === 403) {
        return {
          success: false,
          error:
            data.message ||
            "Device not authorized. Contact admin to reset device binding.",
        };
      }

      // Handle other authentication errors
      if (!response.ok || !data.success || !data.token) {
        return {
          success: false,
          error: data.message || "Login failed. Please try again.",
        };
      }

      // Store token and deviceKey
      await SecureStore.setItemAsync("token", data.token);
      setToken(data.token);

      if (data.deviceKey) {
        await SecureStore.setItemAsync("deviceKey", data.deviceKey);
        setDeviceKey(data.deviceKey);
      }

      // Check for password reset (after device validation)
      if (data.requiresPasswordReset) {
        return {
          success: true,
          requiresPasswordReset: true,
          user: data.user,
        };
      } else {
        // Normal login - store user and complete login
        await SecureStore.setItemAsync("user", JSON.stringify(data.user));
        setUser(data.user);

        return {
          success: true,
          requiresPasswordReset: false,
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  };

  const completeLogin = async (userData: User) => {
    try {
      await SecureStore.setItemAsync("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Complete login error:", error);
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
        completeLogin,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
