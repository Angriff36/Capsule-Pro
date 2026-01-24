import { DocumentProps } from '@react-pdf/renderer';

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
  size?: 'A4' | 'LETTER' | 'LEGAL';
  orientation?: 'portrait' | 'landscape';
  quality?: 'low' | 'medium' | 'high';
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

export type PDFData = BattleBoardPDFData | ProposalPDFData | ContractPDFData;

export interface PDFTemplateProps<T = PDFData> {
  data: T;
  config?: PDFConfig;
}
