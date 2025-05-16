import { PrismaClient } from '@/app/generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: 
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Get analytics for ticket-related metrics
export async function getTicketAnalytics(
  datasetId: string, 
  metric: string,
  groupBy?: string
) {
  // Base where clause
  const whereClause = {
    datasetId
  };
  
  // Return different analytics based on requested metric
  switch (metric) {
    case "resolution_time":
      return getResolutionTimeAnalytics(whereClause);
    case "satisfaction":
      return getSatisfactionAnalytics(whereClause);
    case "issue_distribution":
      return getIssueDistributionAnalytics(whereClause);
    case "ticket_count":
      return getTicketTrendsAnalytics(whereClause, groupBy || 'month');
    default:
      throw new Error(`Unsupported metric: ${metric}`);
  }
}

// Get the list of all available datasets
export async function getDatasetList() {
  const datasets = await db.dataset.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          tickets: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  // Transform data to include record count
  return datasets.map(dataset => ({
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    createdAt: dataset.createdAt,
    recordCount: dataset._count.tickets
  }));
}

// Get a dataset by ID
export async function getDatasetById(datasetId: string) {
  return db.dataset.findUnique({
    where: { id: datasetId },
    include: {
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });
}

// Get summary statistics for a dataset
export async function getDatasetSummary(datasetId: string) {
  // Get basic dataset info
  const dataset = await db.dataset.findUnique({
    where: { id: datasetId },
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: { tickets: true }
      }
    }
  });
  
  if (!dataset) {
    throw new Error(`Dataset with ID ${datasetId} not found`);
  }
  
  // Get date range
  const dateRange = await db.ticket.aggregate({
    where: { datasetId },
    _min: { date: true },
    _max: { date: true }
  });
  
  // Get average resolution time
  const avgResolution = await db.ticket.aggregate({
    where: { datasetId },
    _avg: { resolutionTime: true }
  });
  
  // Get average satisfaction rate
  const avgSatisfaction = await db.ticket.aggregate({
    where: { datasetId },
    _avg: { satisfactionRate: true }
  });
  
  // Get top issue types
  const issueTypes = await db.ticket.groupBy({
    by: ['issueType'],
    where: { datasetId },
    _count: true,
    orderBy: {
      _count: {
        ticketId: 'desc'
      }
    },
    take: 5
  });
  
  // Get priority distribution
  const priorityDist = await db.ticket.groupBy({
    by: ['priority'],
    where: { datasetId },
    _count: true
  });
  
  // Format the priority distribution
  const priorityDistribution: Record<string, number> = {};
  priorityDist.forEach(item => {
    priorityDistribution[item.priority] = item._count;
  });
  
  // Format top issue types
  const topIssueTypes = issueTypes.map(issue => ({
    name: issue.issueType,
    count: issue._count
  }));
  
  // Return the formatted summary
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    recordCount: dataset._count.tickets,
    dateRange: {
      start: dateRange._min.date?.toISOString() || '',
      end: dateRange._max.date?.toISOString() || ''
    },
    metrics: {
      avgResolutionTime: avgResolution._avg.resolutionTime || 0,
      avgSatisfactionRate: avgSatisfaction._avg.satisfactionRate || 0,
      topIssueTypes,
      priorityDistribution
    }
  };
}

// Analyze data based on natural language query
export async function analyzeDataByQuery(
  datasetId: string, 
  query: string, 
  chartType: string = 'auto'
) {
  // This is a simplified implementation that would need to be extended based on your NLP capabilities
  // Currently handling a few common query patterns manually
  
  let data, summary, insights, recommendedChartType;
  
  const lowerQuery = query.toLowerCase();
  
  // Determine what data to fetch based on the query
  if (lowerQuery.includes('resolution time') || lowerQuery.includes('how long')) {
    const whereClause = { datasetId };
    const result = await getResolutionTimeAnalytics(whereClause);
    
    data = result.data;
    summary = `Average resolution time is ${result.avgResolutionTime.toFixed(2)} days`;
    insights = [
      `${result.fastestResolution.toFixed(2)} days was the fastest resolution time`,
      `${result.slowestResolution.toFixed(2)} days was the slowest resolution time`,
      `${result.percentageUnderDay.toFixed(2)}% of tickets were resolved in under a day`
    ];
    recommendedChartType = 'line';
  } 
  else if (lowerQuery.includes('satisfaction') || lowerQuery.includes('customer rating')) {
    const whereClause = { datasetId };
    const result = await getSatisfactionAnalytics(whereClause);
    
    data = result.ratingDistribution;
    summary = `Average satisfaction rating is ${result.avgRating.toFixed(2)}/5`;
    insights = [
      `${result.percentageHigh.toFixed(2)}% of tickets received high satisfaction ratings (4-5)`,
      `${result.percentageLow.toFixed(2)}% of tickets received low satisfaction ratings (1-2)`
    ];
    recommendedChartType = 'pie';
  }
  else if (lowerQuery.includes('issue') || lowerQuery.includes('problem type')) {
    const whereClause = { datasetId };
    const result = await getIssueDistributionAnalytics(whereClause);
    
    data = result.issueDistribution;
    summary = `Found ${Object.keys(result.issueDistribution).length} different issue types`;
    insights = [
      `"${result.topIssue.type}" is the most common issue type with ${result.topIssue.count} tickets`,
      `"${result.categories[0].name}" is the most common request category`
    ];
    recommendedChartType = 'bar';
  }
  else if (lowerQuery.includes('agent') || lowerQuery.includes('performance')) {
    const whereClause = { datasetId };
    const result = await getAgentPerformanceAnalytics(whereClause);
    
    data = result.agentPerformance;
    summary = `Analyzed performance of ${result.agentPerformance.length} agents`;
    insights = [
      `Agent ${result.topPerformer.id} has the highest satisfaction rating (${result.topPerformer.avgSatisfaction.toFixed(2)})`,
      `Agent ${result.fastestAgent.id} has the fastest resolution time (${result.fastestAgent.avgResolution.toFixed(2)} days)`
    ];
    recommendedChartType = 'table';
  }
  else {
    // Default to a basic summary if the query isn't recognized
    const ticketCount = await db.ticket.count({ where: { datasetId } });
    
    data = { totalTickets: ticketCount };
    summary = `Dataset contains ${ticketCount} tickets`;
    insights = ["Use more specific queries to analyze particular aspects of the data"];
    recommendedChartType = 'bar';
  }
  
  // Use the requested chart type or the recommended one
  const finalChartType = chartType === 'auto' ? recommendedChartType : chartType;
  
  return {
    chartType: finalChartType,
    data,
    summary,
    insights
  };
}

// Helper functions for specific analytics

async function getResolutionTimeAnalytics(whereClause: any) {
  // Get resolution time statistics
  const resolutionStats = await db.ticket.aggregate({
    where: whereClause,
    _avg: { resolutionTime: true },
    _min: { resolutionTime: true },
    _max: { resolutionTime: true }
  });
  
  // Get resolution time distribution by days
  const tickets = await db.ticket.findMany({
    where: whereClause,
    select: {
      date: true,
      resolutionTime: true
    },
    orderBy: {
      date: 'asc'
    }
  });
  
  // Group by date for trend analysis
  const resolutionByDate: any = {};
  tickets.forEach(ticket => {
    const dateStr = ticket.date.toISOString().split('T')[0];
    if (!resolutionByDate[dateStr]) {
      resolutionByDate[dateStr] = [];
    }
    resolutionByDate[dateStr].push(ticket.resolutionTime);
  });
  
  // Calculate daily average
  const dailyAverage = Object.entries(resolutionByDate).map(([date, times]: [string, any]) => {
    const avg = (times as number[]).reduce((sum, time) => sum + time, 0) / (times as number[]).length;
    return { date, avgResolutionTime: avg };
  });
  
  // Count tickets resolved in under a day
  const underDayCount = tickets.filter(t => t.resolutionTime < 1).length;
  const percentageUnderDay = (underDayCount / tickets.length) * 100;
  
  return {
    avgResolutionTime: resolutionStats._avg.resolutionTime || 0,
    fastestResolution: resolutionStats._min.resolutionTime || 0,
    slowestResolution: resolutionStats._max.resolutionTime || 0,
    percentageUnderDay,
    data: dailyAverage
  };
}

async function getSatisfactionAnalytics(whereClause: any) {
  // Get satisfaction statistics
  const satisfactionStats = await db.ticket.aggregate({
    where: whereClause,
    _avg: { satisfactionRate: true }
  });
  
  // Get satisfaction distribution
  const ratingDistribution = await db.ticket.groupBy({
    by: ['satisfactionRate'],
    where: whereClause,
    _count: true
  });
  
  // Format distribution
  const distribution = ratingDistribution.map(rating => ({
    rating: rating.satisfactionRate,
    count: rating._count
  }));
  
  // Count high and low ratings
  const totalTickets = distribution.reduce((sum, item) => sum + item.count, 0);
  const highRatings = distribution
    .filter(item => item.rating >= 4)
    .reduce((sum, item) => sum + item.count, 0);
  const lowRatings = distribution
    .filter(item => item.rating <= 2)
    .reduce((sum, item) => sum + item.count, 0);
  
  const percentageHigh = (highRatings / totalTickets) * 100;
  const percentageLow = (lowRatings / totalTickets) * 100;
  
  return {
    avgRating: satisfactionStats._avg.satisfactionRate || 0,
    percentageHigh,
    percentageLow,
    ratingDistribution: distribution
  };
}

async function getIssueDistributionAnalytics(whereClause: any) {
  // Get issue type distribution
  const issueTypes = await db.ticket.groupBy({
    by: ['issueType'],
    where: whereClause,
    _count: true
  });
  
  // Get request category distribution
  const categories = await db.ticket.groupBy({
    by: ['requestCategory'],
    where: whereClause,
    _count: true
  });
  
  // Format distributions
  const issueDistribution = issueTypes.map(issue => ({
    type: issue.issueType,
    count: issue._count
  }));
  
  const categoryDistribution = categories.map(category => ({
    name: category.requestCategory,
    count: category._count
  }));
  
  // Find top issue type
  const sortedIssues = [...issueDistribution].sort((a, b) => b.count - a.count);
  const topIssue = sortedIssues.length > 0 ? sortedIssues[0] : { type: 'None', count: 0 };
  
  // Find top categories
  const sortedCategories = [...categoryDistribution].sort((a, b) => b.count - a.count);
  
  return {
    issueDistribution,
    topIssue,
    categories: sortedCategories
  };
}

async function getAgentPerformanceAnalytics(whereClause: any) {
  // Get agent performance
  const tickets = await db.ticket.findMany({
    where: whereClause,
    select: {
      agentId: true,
      resolutionTime: true,
      satisfactionRate: true
    }
  });
  
  // Calculate metrics per agent
  const agentStats: Record<string, { 
    ticketCount: number, 
    totalResolutionTime: number,
    totalSatisfaction: number
  }> = {};
  
  tickets.forEach(ticket => {
    if (!agentStats[ticket.agentId]) {
      agentStats[ticket.agentId] = {
        ticketCount: 0,
        totalResolutionTime: 0,
        totalSatisfaction: 0
      };
    }
    
    agentStats[ticket.agentId].ticketCount++;
    agentStats[ticket.agentId].totalResolutionTime += ticket.resolutionTime;
    agentStats[ticket.agentId].totalSatisfaction += ticket.satisfactionRate;
  });
  
  // Format agent performance metrics
  const agentPerformance = Object.entries(agentStats).map(([agentId, stats]) => {
    const avgResolution = stats.totalResolutionTime / stats.ticketCount;
    const avgSatisfaction = stats.totalSatisfaction / stats.ticketCount;
    
    return {
      id: agentId,
      ticketCount: stats.ticketCount,
      avgResolution,
      avgSatisfaction
    };
  });
  
  // Sort for top performers
  const byResolution = [...agentPerformance].sort((a, b) => a.avgResolution - b.avgResolution);
  const bySatisfaction = [...agentPerformance].sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);
  
  const fastestAgent = byResolution.length > 0 ? byResolution[0] : null;
  const topPerformer = bySatisfaction.length > 0 ? bySatisfaction[0] : null;
  
  return {
    agentPerformance,
    fastestAgent: fastestAgent || { id: 'none', avgResolution: 0 },
    topPerformer: topPerformer || { id: 'none', avgSatisfaction: 0 }
  };
}

// Add new function for ticket trends
async function getTicketTrendsAnalytics(whereClause: any, groupBy: string) {
  const tickets = await db.ticket.findMany({
    where: whereClause,
    select: {
      date: true,
    },
    orderBy: {
      date: 'asc'
    }
  });

  // Group tickets by the specified time period
  const ticketsByPeriod: Record<string, number> = {};
  tickets.forEach(ticket => {
    let periodKey: string;
    switch (groupBy) {
      case 'month':
        periodKey = ticket.date.toISOString().slice(0, 7); // YYYY-MM
        break;
      case 'week':
        // Get week number
        const weekNum = Math.ceil((ticket.date.getDate() + 6 - ticket.date.getDay()) / 7);
        periodKey = `${ticket.date.toISOString().slice(0, 7)}-W${weekNum}`;
        break;
      case 'day':
        periodKey = ticket.date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      default:
        periodKey = ticket.date.toISOString().slice(0, 7); // Default to month
    }
    
    ticketsByPeriod[periodKey] = (ticketsByPeriod[periodKey] || 0) + 1;
  });

  // Convert to array format for visualization
  const data = Object.entries(ticketsByPeriod).map(([period, count]) => ({
    period,
    count
  }));

  // Calculate some basic stats
  const totalTickets = tickets.length;
  const avgTicketsPerPeriod = totalTickets / Object.keys(ticketsByPeriod).length;
  const maxTicketsInPeriod = Math.max(...Object.values(ticketsByPeriod));

  return {
    data: data.sort((a, b) => a.period.localeCompare(b.period)), // Sort by period
    totalTickets,
    avgTicketsPerPeriod,
    maxTicketsInPeriod,
    insights: [
      `Average of ${avgTicketsPerPeriod.toFixed(1)} tickets per ${groupBy}`,
      `Peak volume of ${maxTicketsInPeriod} tickets in a single ${groupBy}`,
      `Total of ${totalTickets} tickets analyzed`
    ]
  };
}

// Helper function to create timeframe filters
function getTimeframeFilter(timeframe: string) {
  const now = new Date();
  
  if (timeframe === 'last_7_days') {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    return {
      date: {
        gte: sevenDaysAgo
      }
    };
  }
  
  if (timeframe === 'last_30_days') {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return {
      date: {
        gte: thirtyDaysAgo
      }
    };
  }
  
  if (timeframe === 'last_90_days') {
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    return {
      date: {
        gte: ninetyDaysAgo
      }
    };
  }
  
  if (timeframe === 'this_year') {
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    return {
      date: {
        gte: firstDayOfYear
      }
    };
  }
  
  // Parse custom timeframes in format "YYYY-MM-DD_YYYY-MM-DD"
  if (timeframe.includes('_')) {
    const [startStr, endStr] = timeframe.split('_');
    
    try {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      return {
        date: {
          gte: startDate,
          lte: endDate
        }
      };
    } catch (e) {
      console.error('Invalid date format in timeframe', e);
    }
  }
  
  // Default to no filter if timeframe is not recognized
  return {};
}