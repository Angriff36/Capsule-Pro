/**
 * Goodshuffle API Client
 *
 * Handles communication with the Goodshuffle Pro API for event, inventory, and invoice management.
 * Supports fetching, creating, updating, and deleting items for synchronization.
 */

export interface GoodshuffleEvent {
  client_email?: string;
  client_name?: string;
  client_phone?: string;
  created_at: string;
  end_date?: string;
  event_date: string;
  guest_count?: number;
  id: string;
  items?: GoodshuffleEventItem[];
  name: string;
  notes?: string;
  status: string;
  total_price?: number;
  updated_at: string;
  venue_address?: string;
  venue_name?: string;
}

export interface GoodshuffleEventItem {
  id: string;
  name: string;
  quantity: number;
  total_price: number;
  unit_price: number;
}

export interface GoodshuffleInventoryItem {
  category?: string;
  created_at: string;
  description?: string;
  id: string;
  name: string;
  quantity_available: number;
  sku?: string;
  unit_cost?: number;
  unit_of_measure?: string;
  updated_at: string;
}

export interface GoodshuffleInvoice {
  client_email?: string;
  client_name?: string;
  created_at: string;
  due_date?: string;
  event_id?: string;
  id: string;
  invoice_number: string;
  issue_date: string;
  line_items?: GoodshuffleInvoiceLineItem[];
  notes?: string;
  paid_date?: string;
  status: string;
  total_amount: number;
  updated_at: string;
}

export interface GoodshuffleInvoiceLineItem {
  description: string;
  id: string;
  quantity: number;
  total_price: number;
  unit_price: number;
}

export interface GoodshuffleSyncResult {
  conflicts: GoodshuffleConflict[];
  errors: string[];
  eventsImported: number;
  eventsSkipped: number;
  eventsUpdated: number;
  success: boolean;
}

export interface GoodshuffleInventorySyncResult {
  conflicts: GoodshuffleConflict[];
  errors: string[];
  itemsImported: number;
  itemsSkipped: number;
  itemsUpdated: number;
  success: boolean;
}

export interface GoodshuffleInvoiceSyncResult {
  conflicts: GoodshuffleConflict[];
  errors: string[];
  invoicesImported: number;
  invoicesSkipped: number;
  invoicesUpdated: number;
  success: boolean;
}

export interface GoodshuffleConflict {
  convoyEventId?: string;
  convoyInventoryItemId?: string;
  convoyInvoiceId?: string;
  convoyValue: unknown;
  field: string;
  goodshuffleEventId?: string;
  goodshuffleInvoiceId?: string;
  goodshuffleItemId?: string;
  goodshuffleValue: unknown;
  resolution: "pending" | "convoy_wins" | "goodshuffle_wins";
}

export interface GoodshuffleApiConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.goodshuffle.com/v1";

export class GoodshuffleClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor(config: GoodshuffleApiConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
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
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GoodshuffleApiError(
        `Goodshuffle API error: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Test the API connection by fetching account info
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<{ id: string }>("/me");
      return { success: true, message: "Connection successful" };
    } catch (error) {
      const message =
        error instanceof GoodshuffleApiError
          ? error.message
          : "Connection failed";
      return { success: false, message };
    }
  }

  /**
   * Fetch all events from Goodshuffle with optional date filtering
   */
  getEvents(params?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: GoodshuffleEvent[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params?.startDate) {
      searchParams.set("start_date", params.startDate.toISOString());
    }
    if (params?.endDate) {
      searchParams.set("end_date", params.endDate.toISOString());
    }
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const endpoint = `/events${query ? `?${query}` : ""}`;

    return this.request<{ events: GoodshuffleEvent[]; total: number }>(
      endpoint
    );
  }

  /**
   * Fetch a single event by ID
   */
  getEvent(id: string): Promise<GoodshuffleEvent> {
    return this.request<GoodshuffleEvent>(`/events/${id}`);
  }

  /**
   * Create a new event in Goodshuffle
   */
  createEvent(event: Partial<GoodshuffleEvent>): Promise<GoodshuffleEvent> {
    return this.request<GoodshuffleEvent>("/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  /**
   * Update an existing event in Goodshuffle
   */
  updateEvent(
    id: string,
    event: Partial<GoodshuffleEvent>
  ): Promise<GoodshuffleEvent> {
    return this.request<GoodshuffleEvent>(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(event),
    });
  }

  /**
   * Delete an event from Goodshuffle
   */
  deleteEvent(id: string): Promise<void> {
    return this.request<void>(`/events/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Fetch all events with pagination handling
   */
  async getAllEvents(
    startDate?: Date,
    endDate?: Date
  ): Promise<GoodshuffleEvent[]> {
    const allEvents: GoodshuffleEvent[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { events, total } = await this.getEvents({
        startDate,
        endDate,
        page,
        limit,
      });
      allEvents.push(...events);

      if (allEvents.length >= total || events.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allEvents;
  }

  // ============================================
  // Inventory Methods
  // ============================================

  /**
   * Fetch all inventory items from Goodshuffle with optional filtering
   */
  getInventoryItems(params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: GoodshuffleInventoryItem[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params?.category) {
      searchParams.set("category", params.category);
    }
    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const endpoint = `/inventory${query ? `?${query}` : ""}`;

    return this.request<{ items: GoodshuffleInventoryItem[]; total: number }>(
      endpoint
    );
  }

  /**
   * Fetch a single inventory item by ID
   */
  getInventoryItem(id: string): Promise<GoodshuffleInventoryItem> {
    return this.request<GoodshuffleInventoryItem>(`/inventory/${id}`);
  }

  /**
   * Create a new inventory item in Goodshuffle
   */
  createInventoryItem(
    item: Partial<GoodshuffleInventoryItem>
  ): Promise<GoodshuffleInventoryItem> {
    return this.request<GoodshuffleInventoryItem>("/inventory", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  /**
   * Update an existing inventory item in Goodshuffle
   */
  updateInventoryItem(
    id: string,
    item: Partial<GoodshuffleInventoryItem>
  ): Promise<GoodshuffleInventoryItem> {
    return this.request<GoodshuffleInventoryItem>(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  }

  /**
   * Delete an inventory item from Goodshuffle
   */
  deleteInventoryItem(id: string): Promise<void> {
    return this.request<void>(`/inventory/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Fetch all inventory items with pagination handling
   */
  async getAllInventoryItems(): Promise<GoodshuffleInventoryItem[]> {
    const allItems: GoodshuffleInventoryItem[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { items, total } = await this.getInventoryItems({
        page,
        limit,
      });
      allItems.push(...items);

      if (allItems.length >= total || items.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allItems;
  }

  // ============================================
  // Invoice Methods
  // ============================================

  /**
   * Fetch all invoices from Goodshuffle with optional filtering
   */
  getInvoices(params?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: GoodshuffleInvoice[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params?.startDate) {
      searchParams.set("start_date", params.startDate.toISOString());
    }
    if (params?.endDate) {
      searchParams.set("end_date", params.endDate.toISOString());
    }
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const endpoint = `/invoices${query ? `?${query}` : ""}`;

    return this.request<{ invoices: GoodshuffleInvoice[]; total: number }>(
      endpoint
    );
  }

  /**
   * Fetch a single invoice by ID
   */
  getInvoice(id: string): Promise<GoodshuffleInvoice> {
    return this.request<GoodshuffleInvoice>(`/invoices/${id}`);
  }

  /**
   * Create a new invoice in Goodshuffle
   */
  createInvoice(
    invoice: Partial<GoodshuffleInvoice>
  ): Promise<GoodshuffleInvoice> {
    return this.request<GoodshuffleInvoice>("/invoices", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  }

  /**
   * Update an existing invoice in Goodshuffle
   */
  updateInvoice(
    id: string,
    invoice: Partial<GoodshuffleInvoice>
  ): Promise<GoodshuffleInvoice> {
    return this.request<GoodshuffleInvoice>(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(invoice),
    });
  }

  /**
   * Delete an invoice from Goodshuffle
   */
  deleteInvoice(id: string): Promise<void> {
    return this.request<void>(`/invoices/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Fetch all invoices with pagination handling
   */
  async getAllInvoices(
    startDate?: Date,
    endDate?: Date
  ): Promise<GoodshuffleInvoice[]> {
    const allInvoices: GoodshuffleInvoice[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { invoices, total } = await this.getInvoices({
        startDate,
        endDate,
        page,
        limit,
      });
      allInvoices.push(...invoices);

      if (allInvoices.length >= total || invoices.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allInvoices;
  }
}

export class GoodshuffleApiError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "GoodshuffleApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Create a Goodshuffle client from database config
 */
export function createGoodshuffleClient(config: {
  apiKey: string;
  apiSecret: string;
}): GoodshuffleClient {
  return new GoodshuffleClient({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });
}
