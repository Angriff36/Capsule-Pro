import { pdf, Document, Page, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
import type { PDFConfig, PDFGenerationOptions } from '../types';

// Default styles
const defaultStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1pt solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
});

/**
 * PDF Document wrapper component
 */
export const PDFDocument: React.FC<{
  children: React.ReactNode;
  config?: PDFConfig;
  options?: PDFGenerationOptions;
}> = ({ children, config, options }) => {
  const size = options?.size || 'LETTER';
  const orientation = options?.orientation || 'portrait';

  return (
    <Document
      title={config?.title}
      author={config?.author}
      subject={config?.subject}
      keywords={config?.keywords?.join(", ")}
      creator={config?.creator}
      producer={config?.producer}
      creationDate={config?.creationDate}
    >
      <Page size={size} orientation={orientation} style={defaultStyles.page}>
        {children}
      </Page>
    </Document>
  );
};

/**
 * Generate PDF from a React component
 *
 * @param component - The React component to render as PDF
 * @param filename - Optional filename for the PDF
 * @returns PDF blob as Uint8Array
 */
export async function generatePDF(
  component: React.ReactElement,
  filename?: string
): Promise<Uint8Array> {
  try {
    // @ts-ignore
    const doc = await pdf(component);
    const blob = await doc.toBlob();
    return new Uint8Array(await blob.arrayBuffer());
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate and download PDF in browser
 *
 * @param component - The React component to render as PDF
 * @param filename - The filename for the downloaded PDF (without .pdf extension)
 * @returns Promise that resolves when download is complete
 */
export async function downloadPDF(
  component: React.ReactElement,
  filename: string = 'document'
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('downloadPDF can only be used in browser environments');
  }

  try {
    // @ts-ignore
    const doc = await pdf(component);
    const blob = await doc.toBlob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download PDF:', error);
    throw new Error(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get PDF as base64 string
 *
 * @param component - The React component to render as PDF
 * @returns Base64 encoded PDF string
 */
export async function getPDFAsBase64(
  component: React.ReactElement
): Promise<string> {
  try {
    // @ts-ignore
    const doc = await pdf(component);
    const blob = await doc.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Failed to generate PDF as base64:', error);
    throw new Error(`PDF base64 generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get PDF as data URL
 *
 * @param component - The React component to render as PDF
 * @returns Data URL string (data:application/pdf;base64,...)
 */
export async function getPDFAsDataUrl(
  component: React.ReactElement
): Promise<string> {
  const base64 = await getPDFAsBase64(component);
  return `data:application/pdf;base64,${base64}`;
}
