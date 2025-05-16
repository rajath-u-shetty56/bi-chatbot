import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { parse } from 'papaparse';
import * as XLSX from 'xlsx';

// Helper function to parse date in DD/MM/YYYY format
function parseDate(dateStr: string): Date {
  // Check if the date is in D/M/YYYY or DD/MM/YYYY format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateStr.match(dateRegex);
  
  if (match) {
    const [_, day, month, year] = match;
    // Pad single digits with leading zeros
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    // Create date in YYYY-MM-DD format which is reliably parsed
    return new Date(`${year}-${paddedMonth}-${paddedDay}`);
  }
  
  // If not in expected format, try standard parsing
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.arrayBuffer();
    let rawData: any[] = [];

    // Parse file based on type
    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder().decode(fileContent);
      const result = parse(text, { header: true });
      rawData = result.data;
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(fileContent);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawData = XLSX.utils.sheet_to_json(firstSheet);
    } else {
      return NextResponse.json(
        { message: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // Create dataset first
    const dataset = await db.dataset.create({
      data: {
        name: name || file.name,
        description: `Uploaded file: ${file.name}`,
      },
    });

    // Map and clean the data to match our schema
    const tickets = rawData
      .filter(row => row['ID Ticket']) // Filter out empty rows
      .map(row => {
        try {
          return {
            ticketId: row['ID Ticket'],
            date: parseDate(row['Date']),
            employeeId: String(row['Employee ID']),
            agentId: String(row['Agent ID']),
            requestCategory: row['Request Category'],
            issueType: row['Issue Type'],
            severity: row['Severity'],
            priority: row['Priority'],
            resolutionTime: parseFloat(row['Resolution Time (Days)']),
            satisfactionRate: parseInt(row['Satisfaction Rate']),
            datasetId: dataset.id
          };
        } catch (err) {
          console.error('Error processing row:', row, err);
          throw new Error(`Failed to process row with ticket ID ${row['ID Ticket']}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      });

    if (tickets.length === 0) {
      throw new Error('No valid tickets found in the file');
    }

    // Create all tickets in a single transaction
    await db.ticket.createMany({
      data: tickets,
      skipDuplicates: true, // Skip if ticket with same ID exists
    });

    return NextResponse.json({
      success: true,
      dataset,
      ticketCount: tickets.length
    });
  } catch (err) {
    console.error('Error uploading dataset:', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to upload dataset' },
      { status: 500 }
    );
  }
} 