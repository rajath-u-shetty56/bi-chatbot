import { db } from '../lib/db';

async function checkDatabase() {
  try {
    // Check datasets
    const datasets = await db.dataset.findMany({
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    });
    
    console.log('\nDatasets:', datasets.length ? datasets : 'No datasets found');
    
    if (datasets.length > 0) {
      // Check tickets for the first dataset
      const tickets = await db.ticket.findMany({
        where: { datasetId: datasets[0].id },
        take: 5
      });
      
      console.log('\nSample tickets from first dataset:', tickets.length ? tickets : 'No tickets found');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDatabase(); 