import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import type { Ticket } from '@/app/generated/prisma';

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

    // Get tickets from the first dataset that has tickets
    let sampleTickets: Ticket[] = [];
    for (const dataset of datasets) {
      if (dataset._count.tickets > 0) {
        sampleTickets = await db.ticket.findMany({
          where: { datasetId: dataset.id },
          take: 5,
          orderBy: { date: 'desc' }
        });
        break;
      }
    }

    return NextResponse.json({
      datasets: datasets.map(d => ({
        id: d.id,
        name: d.name,
        ticketCount: d._count.tickets,
        createdAt: d.createdAt
      })),
      sampleTickets
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({ error: 'Failed to check database' }, { status: 500 });
  }
} 