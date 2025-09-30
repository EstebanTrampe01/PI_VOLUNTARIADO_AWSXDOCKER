const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  }
  
  return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

console.log('🌐 Environment:', import.meta.env.MODE);
console.log('🌐 API Base URL:', API_BASE_URL);