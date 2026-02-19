/**
 * Nowsta API Client
 *
 * Handles communication with the Nowsta scheduling platform API.
 * Supports fetching employees and shifts for synchronization.
 */

export interface NowstaEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NowstaShift {
  id: string;
  employee_id: string;
  location_id?: string;
  location_name?: string;
  start_time: string;
  end_time: string;
  role?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NowstaLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface NowstaSyncResult {
  success: boolean;
  employeesImported: number;
  employeesSkipped: number;
  shiftsImported: number;
  shiftsSkipped: number;
  errors: string[];
}

export interface NowstaApiConfig {
  apiKey: string;
  apiSecret: string;
  organizationId?: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.nowsta.com/v1";

export class NowstaClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly organizationId?: string;
  private readonly baseUrl: string;

  constructor(config: NowstaApiConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.organizationId = config.organizationId;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-Api-Secret": this.apiSecret,
        ...(this.organizationId
          ? { "X-Organization-Id": this.organizationId }
          : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new NowstaApiError(
        `Nowsta API error: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Test the API connection by fetching current user info
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<{ id: string }>("/me");
      return { success: true, message: "Connection successful" };
    } catch (error) {
      const message =
        error instanceof NowstaApiError ? error.message : "Connection failed";
      return { success: false, message };
    }
  }

  /**
   * Fetch all employees from Nowsta
   */
  getEmployees(params?: {
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ employees: NowstaEmployee[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) {
      searchParams.set("is_active", String(params.isActive));
    }
    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const endpoint = `/employees${query ? `?${query}` : ""}`;

    return this.request<{ employees: NowstaEmployee[]; total: number }>(
      endpoint
    );
  }

  /**
   * Fetch a single employee by ID
   */
  getEmployee(id: string): Promise<NowstaEmployee> {
    return this.request<NowstaEmployee>(`/employees/${id}`);
  }

  /**
   * Fetch shifts from Nowsta within a date range
   */
  getShifts(params: {
    startDate: Date;
    endDate: Date;
    employeeId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ shifts: NowstaShift[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set("start_date", params.startDate.toISOString());
    searchParams.set("end_date", params.endDate.toISOString());

    if (params.employeeId) {
      searchParams.set("employee_id", params.employeeId);
    }
    if (params.locationId) {
      searchParams.set("location_id", params.locationId);
    }
    if (params.page) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const endpoint = `/shifts?${searchParams.toString()}`;
    return this.request<{ shifts: NowstaShift[]; total: number }>(endpoint);
  }

  /**
   * Fetch locations from Nowsta
   */
  getLocations(): Promise<{ locations: NowstaLocation[] }> {
    return this.request<{ locations: NowstaLocation[] }>("/locations");
  }

  /**
   * Fetch all employees with pagination handling
   */
  async getAllEmployees(): Promise<NowstaEmployee[]> {
    const allEmployees: NowstaEmployee[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { employees, total } = await this.getEmployees({
        page,
        limit,
        isActive: true,
      });
      allEmployees.push(...employees);

      if (allEmployees.length >= total || employees.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allEmployees;
  }

  /**
   * Fetch all shifts within a date range with pagination handling
   */
  async getAllShifts(startDate: Date, endDate: Date): Promise<NowstaShift[]> {
    const allShifts: NowstaShift[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { shifts, total } = await this.getShifts({
        startDate,
        endDate,
        page,
        limit,
      });
      allShifts.push(...shifts);

      if (allShifts.length >= total || shifts.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allShifts;
  }
}

export class NowstaApiError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "NowstaApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Create a Nowsta client from database config
 */
export function createNowstaClient(config: {
  apiKey: string;
  apiSecret: string;
  organizationId?: string | null;
}): NowstaClient {
  return new NowstaClient({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    organizationId: config.organizationId ?? undefined,
  });
}
