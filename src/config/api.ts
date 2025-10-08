// FILE: jeg-employee-app/src/config/api.ts
const getApiUrl = () => {
  // Your computer's IP address from Wi-Fi adapter
  const DEV_API_URL = "https://jeg-payroll-system.vercel.app";
  const PROD_API_URL = "https://jeg-payroll-system.vercel.app";

  return __DEV__ ? DEV_API_URL : PROD_API_URL;
};

export const API_BASE_URL = getApiUrl();
