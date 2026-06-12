export interface PDFConfig {
  author?: string;
  creationDate?: Date;
  creator?: string;
  filename?: string;
  keywords?: string[];
  producer?: string;
  subject?: string;
  title?: string;
}

export interface PDFGenerationOptions {
  compression?: boolean;
  orientation?: "portrait" | "landscape";
  quality?: "low" | "medium" | "high";
  size?: "A4" | "LETTER" | "LEGAL";
}

export interface BattleBoardPDFData {
  event: {
    id: string;
    name: string;
    date: Date;
    venue?: string;
    address?: string;
    clientName?: string;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
  staff: Array<{
    id: string;
    name: string;
    role?: string;
    assignments: number;
  }>;
  summary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    status: string;
    priority: string;
    category?: string;
    assignee?: string;
    progress: number;
    dependencies: string[];
    isOnCriticalPath: boolean;
    slackMinutes: number;
    notes?: string;
  }>;
}

export interface ProposalPDFData {
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
  client?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  event?: {
    name: string;
    date: Date;
    guestCount: number;
    venue?: string;
  };
  lead?: {
    name: string;
    email?: string;
    phone?: string;
  };
  lineItems: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
  proposal: {
    id: string;
    proposalNumber: string;
    status: string;
    validUntil: Date;
    subtotal: number;
    taxAmount: number;
    total: number;
    notes?: string;
    createdAt: Date;
  };
}

export interface ContractPDFData {
  client?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  contract: {
    id: string;
    title: string;
    status: string;
    notes?: string;
    expiresAt?: Date;
    createdAt: Date;
  };
  event: {
    id: string;
    name: string;
    date: Date;
    venue?: string;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
  signatures: Array<{
    id: string;
    signerName: string;
    signerEmail: string;
    signedAt: Date;
  }>;
  terms?: string[];
}

export interface EventDetailPDFData {
  dishes?: Array<{
    name: string;
    servings: number;
    instructions: string | null;
  }>;
  event: {
    id: string;
    name: string;
    date: Date | string;
    type: string;
    status: string;
    guestCount: number;
    venue: string | null;
    address: string | null;
    budget: number | null;
    notes: string | null;
    tags: string[];
  };
  guests?: Array<{
    name: string;
    dietaryRestrictions: string | null;
    mealChoice: string | null;
    tableNumber: string | null;
  }>;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
  staff?: Array<{
    name: string;
    role: string | null;
    assignments: number;
  }>;
  tasks?: Array<{
    title: string;
    assignee: string | null;
    startTime: string;
    endTime: string;
    status: string;
    priority: string;
    notes: string | null;
  }>;
}

export interface PackingListPDFData {
  fromLocation?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  items: Array<{
    id: string;
    itemName: string;
    itemNumber?: string;
    quantityShipped: number;
    quantityReceived?: number;
    unit?: string;
    unitCost?: number;
    totalCost?: number;
    condition?: string;
    lotNumber?: string;
    expirationDate?: Date;
    notes?: string;
  }>;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
  shipment: {
    id: string;
    shipmentNumber: string;
    status: string;
    scheduledDate: Date;
    shippedDate?: Date;
    estimatedDeliveryDate?: Date;
    carrier?: string;
    trackingNumber?: string;
    shippingMethod?: string;
    notes?: string;
  };
  summary: {
    totalItems: number;
    totalValue: number;
    weightTotal?: number;
  };
  toLocation?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export interface PrepListPDFData {
  event: {
    id: string;
    title: string;
    eventDate: Date;
    guestCount: number;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
  prepList: {
    eventId: string;
    eventTitle: string;
    eventDate: Date;
    guestCount: number;
    batchMultiplier: number;
    totalIngredients: number;
    totalEstimatedTime: number;
    stationLists: Array<{
      stationId: string;
      stationName: string;
      totalIngredients: number;
      estimatedTime: number;
      color: string;
      ingredients: Array<{
        ingredientId: string;
        ingredientName: string;
        scaledQuantity: number;
        scaledUnit: string;
        category?: string;
        isOptional: boolean;
        preparationNotes?: string;
        allergens: string[];
        dietarySubstitutions: string[];
      }>;
      tasks: Array<{
        id: string;
        name: string;
        dueDate: Date;
        status: string;
        priority: number;
      }>;
    }>;
  };
}

export type PDFData =
  | BattleBoardPDFData
  | ProposalPDFData
  | ContractPDFData
  | EventDetailPDFData
  | PackingListPDFData
  | PrepListPDFData;

export interface PDFTemplateProps<T = PDFData> {
  config?: PDFConfig;
  data: T;
}
