import { NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma';

const db = new PrismaClient();

export async function GET() {
  try {
    // Check datasets
    const datasets = await db.dataset.findMany({
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    });
    
    let response: any = {
      datasetsCount: datasets.length,
      datasets: datasets
    };
    
    if (datasets.length > 0) {
      // Check tickets for the first dataset
      const tickets = await db.ticket.findMany({
        where: { datasetId: datasets[0].id },
        take: 5
      });
      
      response.sampleTickets = tickets;
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: 'Failed to check database' },
      { status: 500 }
    );
  }
} 