// FILE: jeg-employee-app/src/utils/qrGenerator.ts
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

interface QRKey {
  timestamp: number;
  key: string;
  validFrom: number;
  validTo: number;
}

class OfflineQRGenerator {
  private keys: QRKey[] = [];
  private employeeId: string = "";
  private deviceKey: string = "";

  constructor() {
    this.loadFromStorage();
  }

  async syncKeys(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/qr/keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        this.keys = data.keys;
        this.employeeId = data.employeeId;
        await this.saveToStorage();
        return true;
      }
    } catch (error) {
      console.error("Key sync failed:", error);
    }
    return false;
  }

  async generateOfflineQR(
    type: "TIME_IN" | "BREAK_IN" | "BREAK_OUT" | "TIME_OUT"
  ): Promise<string | null> {
    const now = Date.now();

    const validKey = this.keys.find(
      (key) => now >= key.validFrom && now <= key.validTo
    );

    if (!validKey || !this.employeeId || !this.deviceKey) {
      console.log("Missing data for QR generation:", {
        validKey: !!validKey,
        employeeId: this.employeeId,
        deviceKey: this.deviceKey,
      });
      return null;
    }

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

    console.log("Generating QR with payload:", payload);
    console.log("Using key:", validKey.key);

    // Create signature using SHA256 (must match backend validation)
    const payloadString = JSON.stringify(payload);
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      validKey.key + payloadString,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    console.log("Generated signature:", signature);

    const qrData = {
      ...payload,
      signature,
    };

    return btoa(JSON.stringify(qrData));
  }

  setDeviceKey(deviceKey: string) {
    this.deviceKey = deviceKey;
    this.saveToStorage();
  }

  hasValidKeys(): boolean {
    const now = Date.now();
    return this.keys.some((key) => now >= key.validFrom && now <= key.validTo);
  }

  private async saveToStorage() {
    try {
      await AsyncStorage.setItem(
        "qr_keys",
        JSON.stringify({
          keys: this.keys,
          employeeId: this.employeeId,
          deviceKey: this.deviceKey,
          lastSync: Date.now(),
        })
      );
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
      }
    } catch (error) {
      console.error("Failed to load QR keys:", error);
    }
  }
}

export const qrGenerator = new OfflineQRGenerator();
