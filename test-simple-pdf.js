import PDFDocument from 'pdfkit';
import fs from 'fs';

// Create a simple valid PDF
const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

doc.pipe(fs.createWriteStream('C:/projects/capsule-pro/test-event.pdf'));

// Add content
doc.fontSize(24).text('Client: Johnson Family Wedding');
doc.fontSize(12).text('Date: 2025-06-15');
doc.text('Event Number: 2025-06-15-001');
doc.text('Service Style: Plated Dinner');
doc.text('Venue: Grand Ballroom at Hilton');
doc.text('Venue Address: 123 Main Street, Anytown, USA');
doc.text('Headcount: 150');
doc.moveDown();

doc.fontSize(14).text('Menu:');
doc.fontSize(10).text('Appetizers: Bruschetta - 50 pcs');
doc.text('Appetizers: Shrimp Cocktail - 80 pcs');
doc.text('Salads: Garden Salad - 100 pts');
doc.text('Entrees: Beef Tenderloin - 150 pcs');
doc.text('Entrees: Salmon Filet - 120 pcs');
doc.text('Sides: Roasted Potatoes - 200 pts');
doc.text('Sides: Grilled Vegetables - 150 pts');
doc.text('Desserts: Wedding Cake - 150 slcs');

doc.end();
