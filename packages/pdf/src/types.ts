export interface PDFConfig {
  filename?: string;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
}

export interface PDFGenerationOptions {
  size?: "A4" | "LETTER" | "LEGAL";
  orientation?: "portrait" | "landscape";
  quality?: "low" | "medium" | "high";
  compression?: boolean;
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
  summary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
  staff: Array<{
    id: string;
    name: string;
    role?: string;
    assignments: number;
  }>;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
}

export interface ProposalPDFData {
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
  client?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  lead?: {
    name: string;
    email?: string;
    phone?: string;
  };
  event?: {
    name: string;
    date: Date;
    guestCount: number;
    venue?: string;
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
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
}

export interface ContractPDFData {
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
  client?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  signatures: Array<{
    id: string;
    signerName: string;
    signerEmail: string;
    signedAt: Date;
  }>;
  terms?: string[];
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
}

export interface EventDetailPDFData {
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
  dishes?: Array<{
    name: string;
    servings: number;
    instructions: string | null;
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
  guests?: Array<{
    name: string;
    dietaryRestrictions: string | null;
    mealChoice: string | null;
    tableNumber: string | null;
  }>;
  staff?: Array<{
    name: string;
    role: string | null;
    assignments: number;
  }>;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
}

export interface PackingListPDFData {
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
  fromLocation?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  toLocation?: {
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
  summary: {
    totalItems: number;
    totalValue: number;
    weightTotal?: number;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
}

export type PDFData =
  | BattleBoardPDFData
  | ProposalPDFData
  | ContractPDFData
  | EventDetailPDFData
  | PackingListPDFData;

export interface PDFTemplateProps<T = PDFData> {
  data: T;
  config?: PDFConfig;
}
