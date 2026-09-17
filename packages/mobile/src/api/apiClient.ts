import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Configuración base para la API
const API_URL = 'https://api.openpay.com'; // Cambia esto según tu entorno

// Clase para manejar las solicitudes a la API
class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Interceptor para agregar token de autenticación a cada solicitud
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Verificar si hay conexión a internet
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          return Promise.reject(new Error('No hay conexión a internet'));
        }

        // Agregar token de autenticación si existe
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para manejar respuestas y errores
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Manejar errores de autenticación (401)
        if (error.response && error.response.status === 401) {
          // Limpiar token expirado
          await AsyncStorage.removeItem('auth_token');
          
          // Aquí puedes disparar un evento global para redirigir al usuario a la pantalla de login
          // Por ejemplo: EventEmitter.emit('session_expired');
        }
        
        // Errores de red o timeout
        if (error.code === 'ECONNABORTED' || !error.response) {
          return Promise.reject({
            message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
            isNetworkError: true,
          });
        }
        
        // Otros errores
        return Promise.reject(error);
      }
    );
  }

  // Implementación del patrón Singleton
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // Métodos para realizar solicitudes HTTP
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
    return response.data;
  }

  // Método para actualizar el token de autenticación
  public async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }

  // Método para limpiar el token de autenticación
  public async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }
}

// Exportar una instancia del cliente API
export const apiClient = ApiClient.getInstance();

// Exportar la clase para uso especializado si es necesario
export default ApiClient; 