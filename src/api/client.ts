/**
 * CODE SOCIAL — API Client Abstraction
 * 
 * Provides an enterprise-grade API client layer that handles:
 * - Mock vs real HTTP transport switching
 * - Unified response formatting
 * - Network error handling
 * - Authentication headers injection
 * - Future FastAPI backend integration without component changes
 */

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  details?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private isMockMode: boolean;

  constructor() {
    // In production or when VITE_API_URL is configured, switch to live HTTP
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || '/api/v1';
    this.isMockMode = !(import.meta as any).env?.VITE_USE_REAL_API;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public isMock(): boolean {
    return this.isMockMode;
  }

  /**
   * Simulates network latency in mock mode to verify loading states & optimistic UI
   */
  public async simulateLatency(ms: number = 80): Promise<void> {
    if (this.isMockMode && ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  /**
   * Helper to wrap raw data into standard ApiResponse envelope
   */
  public wrapSuccess<T>(data: T, message?: string): ApiResponse<T> {
    return {
      data,
      status: 200,
      message,
      success: true,
    };
  }

  /**
   * Placeholder for future real HTTP calls (e.g. fetch / axios)
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    if (this.isMockMode) {
      throw new Error(`Real API calls disabled. Endpoint ${endpoint} should be handled by mock API handler.`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw {
        message: `HTTP Error ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      } as ApiError;
    }

    const json = await response.json();
    return {
      data: json,
      status: response.status,
      success: true,
    };
  }
}

export const apiClient = new ApiClient();
