// FILE: jeg-employee-app/src/utils/qrGenerator.ts
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

interface QRKey {
  timestamp: number;
  key: string;
  validFrom: number;
  validTo: number;
  hourIndex?: number;
}

interface KeySyncResponse {
  keys: QRKey[];
  syncTimestamp: number;
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    activeDevices: number;
  };
  keyInfo: {
    totalKeys: number;
    validityWindow: string;
    rotationInterval: string;
    clockSkewTolerance: string;
  };
}

class OfflineQRGenerator {
  private keys: QRKey[] = [];
  private employeeId: string = "";
  private deviceKey: string = "";
  private lastSync: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  async syncKeys(token: string): Promise<boolean> {
    try {
      console.log("Syncing QR keys...");
      const response = await fetch(`${API_BASE_URL}/api/qr/keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Keys sync response status:", response.status);

      if (response.ok) {
        const data: KeySyncResponse = await response.json();
        console.log("Keys sync response:", {
          keyCount: data.keys?.length,
          employeeId: data.employee?.id,
          syncTimestamp: data.syncTimestamp,
        });

        this.keys = data.keys || [];
        // Use the employee ID from the response
        this.employeeId = data.employee?.id || "";
        this.lastSync = data.syncTimestamp || Date.now();

        await this.saveToStorage();

        console.log("Keys synced successfully:", {
          totalKeys: this.keys.length,
          employeeId: this.employeeId,
          hasDeviceKey: !!this.deviceKey,
        });

        return true;
      } else {
        const errorText = await response.text();
        console.error("Keys sync failed:", response.status, errorText);
      }
    } catch (error) {
      console.error("Key sync network error:", error);
    }
    return false;
  }

  async generateOfflineQR(
    type: "TIME_IN" | "BREAK_IN" | "BREAK_OUT" | "TIME_OUT"
  ): Promise<string | null> {
    const now = Date.now();

    console.log("Generating QR for:", {
      type,
      now: new Date(now).toISOString(),
      employeeId: this.employeeId,
      hasDeviceKey: !!this.deviceKey,
      availableKeys: this.keys.length,
    });

    // Find valid key for current time
    const validKey = this.keys.find(
      (key) => now >= key.validFrom && now <= key.validTo
    );

    if (!validKey) {
      console.log(
        "No valid key found. Available keys:",
        this.keys.map((k) => ({
          validFrom: new Date(k.validFrom).toISOString(),
          validTo: new Date(k.validTo).toISOString(),
          hourIndex: k.hourIndex,
        }))
      );
      return null;
    }

    if (!this.employeeId) {
      console.error("Missing employeeId - sync keys first");
      return null;
    }

    if (!this.deviceKey) {
      console.error("Missing deviceKey - check authentication");
      return null;
    }

    // Generate nonce
    const nonce = await Crypto.getRandomBytesAsync(8);
    const nonceString = Array.from(nonce)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiry = now + 30 * 1000; // 30 seconds expiry

    const payload = {
      employeeId: this.employeeId,
      deviceKey: this.deviceKey,
      type,
      timestamp: now,
      nonce: nonceString,
      expiry,
    };

    console.log("QR payload:", payload);

    // Create signature using the same method as backend
    const payloadString = JSON.stringify(payload);
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      validKey.key + payloadString,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    const qrData = {
      ...payload,
      signature,
    };

    const qrString = JSON.stringify(qrData);
    const base64QR = btoa(qrString);

    console.log("Generated QR data length:", base64QR.length);

    return base64QR;
  }

  setEmployeeId(employeeId: string) {
    console.log("Setting employeeId:", employeeId);
    this.employeeId = employeeId;
    this.saveToStorage();
  }

  setDeviceKey(deviceKey: string) {
    console.log("Setting deviceKey:", deviceKey ? "present" : "missing");
    this.deviceKey = deviceKey;
    this.saveToStorage();
  }

  hasValidKeys(): boolean {
    const now = Date.now();
    const validKeys = this.keys.filter(
      (key) => now >= key.validFrom && now <= key.validTo
    );

    return validKeys.length > 0 && !!this.employeeId && !!this.deviceKey;
  }

  getStatus() {
    const now = Date.now();
    const validKeys = this.keys.filter(
      (key) => now >= key.validFrom && now <= key.validTo
    );

    return {
      totalKeys: this.keys.length,
      validKeys: validKeys.length,
      hasEmployeeId: !!this.employeeId,
      hasDeviceKey: !!this.deviceKey,
      lastSync: this.lastSync,
      isReady: this.hasValidKeys(),
    };
  }

  private async saveToStorage() {
    try {
      const dataToSave = {
        keys: this.keys,
        employeeId: this.employeeId,
        deviceKey: this.deviceKey,
        lastSync: this.lastSync,
        savedAt: Date.now(),
      };

      await AsyncStorage.setItem("qr_keys", JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save QR keys:", error);
    }
  }

  private async loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem("qr_keys");
      if (stored) {
        const data = JSON.parse(stored);
        this.keys = data.keys || [];
        this.employeeId = data.employeeId || "";
        this.deviceKey = data.deviceKey || "";
        this.lastSync = data.lastSync || 0;

        console.log("QR data loaded from storage:", {
          keys: this.keys.length,
          employeeId: this.employeeId ? "present" : "missing",
          deviceKey: this.deviceKey ? "present" : "missing",
        });
      }
    } catch (error) {
      console.error("Failed to load QR keys:", error);
    }
  }

  async clearStorage() {
    this.keys = [];
    this.employeeId = "";
    this.deviceKey = "";
    this.lastSync = 0;
    await AsyncStorage.removeItem("qr_keys");
    console.log("QR storage cleared");
  }
}

export const qrGenerator = new OfflineQRGenerator();
