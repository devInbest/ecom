export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'NONSENSE';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

const env = {
  appName: APP_NAME,
  apiUrl: API_URL,
  googleClientId: GOOGLE_CLIENT_ID,
  razorpayKeyId: RAZORPAY_KEY_ID,
};

export default env;
