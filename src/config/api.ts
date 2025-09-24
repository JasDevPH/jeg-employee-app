// FILE: jeg-employee-app/src/config/api.ts
const getApiUrl = () => {
  // Your computer's IP address from Wi-Fi adapter
  const DEV_API_URL = "http://192.168.18.8:3000";
  const PROD_API_URL = "https://your-production-api.com";

  return __DEV__ ? DEV_API_URL : PROD_API_URL;
};

export const API_BASE_URL = getApiUrl();
