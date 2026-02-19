/**
 * Goodshuffle API Client
 *
 * Handles communication with the Goodshuffle Pro API for event, inventory, and invoice management.
 * Supports fetching, creating, updating, and deleting items for synchronization.
 */

export interface GoodshuffleEvent {
  id: string;
  name: string;
  event_date: string;
  end_date?: string;
  status: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  venue_name?: string;
  venue_address?: string;
  guest_count?: number;
  total_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: GoodshuffleEventItem[];
}

export interface GoodshuffleEventItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface GoodshuffleInventoryItem {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  quantity_available: number;
  unit_cost?: number;
  unit_of_measure?: string;
  created_at: string;
  updated_at: string;
}

export interface GoodshuffleInvoice {
  id: string;
  invoice_number: string;
  event_id?: string;
  client_name?: string;
  client_email?: string;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  line_items?: GoodshuffleInvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface GoodshuffleInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface GoodshuffleSyncResult {
  success: boolean;
  eventsImported: number;
  eventsSkipped: number;
  eventsUpdated: number;
  conflicts: GoodshuffleConflict[];
  errors: string[];
}

export interface GoodshuffleInventorySyncResult {
  success: boolean;
  itemsImported: number;
  itemsSkipped: number;
  itemsUpdated: number;
  conflicts: GoodshuffleConflict[];
  errors: string[];
}

export interface GoodshuffleInvoiceSyncResult {
  success: boolean;
  invoicesImported: number;
  invoicesSkipped: number;
  invoicesUpdated: number;
  conflicts: GoodshuffleConflict[];
  errors: string[];
}

export interface GoodshuffleConflict {
  goodshuffleEventId?: string;
  convoyEventId?: string;
  goodshuffleItemId?: string;
  convoyInventoryItemId?: string;
  goodshuffleInvoiceId?: string;
  convoyInvoiceId?: string;
  field: string;
  goodshuffleValue: unknown;
  convoyValue: unknown;
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
