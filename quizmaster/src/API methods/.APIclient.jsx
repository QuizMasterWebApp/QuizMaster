import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export default apiClient;