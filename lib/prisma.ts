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
  const lowerQuery = query.toLowerCase();
  
  // Initialize chart type
  let recommendedChartType = chartType === 'auto' ? 'bar' : chartType;
  
  // Get basic ticket stats
  const totalTickets = await db.ticket.count({ 
    where: { datasetId } 
  });
  
  // Get resolved tickets
  const resolvedTickets = await db.ticket.count({ 
    where: { 
      datasetId,
      resolutionTime: {
        gt: 0
      }
    } 
  });

  // Get satisfaction stats
  const satisfactionStats = await db.ticket.aggregate({
    where: { datasetId },
    _avg: { satisfactionRate: true },
    _min: { satisfactionRate: true },
    _max: { satisfactionRate: true }
  });

  // Get resolution time stats
  const resolutionStats = await db.ticket.aggregate({
    where: { datasetId },
    _avg: { resolutionTime: true },
    _min: { resolutionTime: true },
    _max: { resolutionTime: true }
  });

  // Get priority distribution
  const priorityDist = await db.ticket.groupBy({
    by: ['priority'],
    where: { datasetId },
    _count: true
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

  // Get agent performance data
  const agentPerformance = await db.ticket.groupBy({
    by: ['agentId'],
    where: { datasetId },
    _avg: {
      resolutionTime: true,
      satisfactionRate: true
    },
    _count: true
  });

  // Format data and generate analysis based on query type
  let data = [];
  let summary = '';
  let insights: string[] = [];

  // Determine chart type based on query content if auto
  if (chartType === 'auto') {
    if (lowerQuery.includes('distribution') || lowerQuery.includes('breakdown') || lowerQuery.includes('type')) {
      recommendedChartType = 'pie';
    } else if (lowerQuery.includes('trend') || lowerQuery.includes('over time')) {
      recommendedChartType = 'line';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('performance')) {
      recommendedChartType = 'bar';
    }
  }

  if (lowerQuery.includes('ticket') && (lowerQuery.includes('status') || lowerQuery.includes('resolved'))) {
    // Ticket status analysis
    data = [
      { name: 'Total Tickets', value: totalTickets },
      { name: 'Resolved', value: resolvedTickets },
      { name: 'Pending', value: totalTickets - resolvedTickets }
    ];
    
    const resolutionRate = (resolvedTickets / totalTickets) * 100;
    summary = `Analysis of ${totalTickets} total tickets shows ${resolvedTickets} (${resolutionRate.toFixed(1)}%) have been resolved. ` +
      `The average resolution time is ${resolutionStats._avg.resolutionTime?.toFixed(1) || 'N/A'} days.`;
    
    insights = [
      `Resolution rate: ${resolutionRate.toFixed(1)}%`,
      `${totalTickets - resolvedTickets} tickets are still pending`,
      `Average resolution time: ${resolutionStats._avg.resolutionTime?.toFixed(1) || 'N/A'} days`,
      `Fastest resolution: ${resolutionStats._min.resolutionTime?.toFixed(1) || 'N/A'} days`,
      `Slowest resolution: ${resolutionStats._max.resolutionTime?.toFixed(1) || 'N/A'} days`
    ];

    recommendedChartType = 'bar';
  } else if (lowerQuery.includes('issue') || lowerQuery.includes('type') || lowerQuery.includes('distribution')) {
    // Issue type analysis
    data = issueTypes.map(issue => ({
      type: issue.issueType,
      count: issue._count
    }));

    const topIssue = data[0];
    const totalIssues = data.reduce((sum, d) => sum + d.count, 0);
    
    summary = `Analysis of issue types shows "${topIssue.type}" as the most common, accounting for ` +
      `${((topIssue.count/totalIssues)*100).toFixed(1)}% of all tickets. ` +
      `The top 3 issues account for ${((data.slice(0,3).reduce((sum, d) => sum + d.count, 0)/totalIssues)*100).toFixed(1)}% of tickets.`;
    
    insights = [
      `Most common issue: ${topIssue.type} (${topIssue.count} tickets)`,
      `${data.length} distinct issue types identified`,
      `Top 3 issues account for ${((data.slice(0,3).reduce((sum, d) => sum + d.count, 0)/totalIssues)*100).toFixed(1)}% of tickets`,
      ...data.slice(0,3).map(d => `${d.type}: ${d.count} tickets (${((d.count/totalIssues)*100).toFixed(1)}%)`)
    ];

    recommendedChartType = 'pie';
  } else if (lowerQuery.includes('agent') || lowerQuery.includes('performance')) {
    // Agent performance analysis
    data = agentPerformance.map(agent => ({
      name: `Agent ${agent.agentId}`,
      resolutionTime: agent._avg.resolutionTime || 0,
      satisfaction: agent._avg.satisfactionRate || 0,
      tickets: agent._count
    })).sort((a, b) => (b.satisfaction - a.satisfaction));

    const topAgent = data[0];
    const avgResolution = data.reduce((sum, agent) => sum + agent.resolutionTime, 0) / data.length;
    
    summary = `Analysis of ${data.length} agents shows varying performance levels. ` +
      `Top performing Agent ${topAgent.name} has an average satisfaction rating of ${topAgent.satisfaction.toFixed(1)}/5 ` +
      `and resolves tickets in ${topAgent.resolutionTime.toFixed(1)} days on average.`;
    
    insights = [
      `Top agent: ${topAgent.name} (${topAgent.satisfaction.toFixed(1)}/5 satisfaction)`,
      `Team average resolution time: ${avgResolution.toFixed(1)} days`,
      `Agents handling most tickets: ${data.slice(0, 3).map(a => a.name).join(', ')}`,
      `${data.filter(a => a.satisfaction >= 4).length} agents maintain 4+ satisfaction rating`
    ];

    recommendedChartType = 'bar';
  } else if (lowerQuery.includes('satisfaction') || lowerQuery.includes('rating')) {
    // Satisfaction analysis
    const ratingCounts = await db.ticket.groupBy({
      by: ['satisfactionRate'],
      where: { datasetId },
      _count: true
    });

    data = ratingCounts.map(rate => ({
      name: `${rate.satisfactionRate} Stars`,
      value: rate._count
    })).sort((a, b) => parseInt(a.name) - parseInt(b.name));

    const highSatisfaction = data.filter(d => parseInt(d.name) >= 4).reduce((sum, d) => sum + d.value, 0);
    const totalRated = data.reduce((sum, d) => sum + d.value, 0);
    
    summary = `Customer satisfaction analysis shows an average rating of ${satisfactionStats._avg.satisfactionRate?.toFixed(1)}/5. ` +
      `${((highSatisfaction/totalRated)*100).toFixed(1)}% of tickets received high satisfaction ratings (4-5 stars).`;
    
    insights = [
      `Average satisfaction: ${satisfactionStats._avg.satisfactionRate?.toFixed(1)}/5`,
      `Highest rating: ${satisfactionStats._max.satisfactionRate}/5`,
      `Lowest rating: ${satisfactionStats._min.satisfactionRate}/5`,
      `${((highSatisfaction/totalRated)*100).toFixed(1)}% tickets rated 4+ stars`,
      `Most common rating: ${data.reduce((max, curr) => curr.value > max.value ? curr : max).name}`
    ];

    recommendedChartType = 'bar';
  } else if (lowerQuery.includes('resolution') || lowerQuery.includes('time')) {
    // Resolution time analysis
    const whereClause = { datasetId };
    const resolutionData = await getResolutionTimeAnalytics(whereClause);
    data = resolutionData.data;

    const underDayPercentage = resolutionData.percentageUnderDay;
    
    summary = `Analysis shows an average resolution time of ${resolutionData.avgResolutionTime.toFixed(1)} days. ` +
      `${underDayPercentage.toFixed(1)}% of tickets are resolved within 24 hours.`;
    
    insights = [
      `Average resolution time: ${resolutionData.avgResolutionTime.toFixed(1)} days`,
      `Fastest resolution: ${resolutionData.fastestResolution.toFixed(1)} days`,
      `Slowest resolution: ${resolutionData.slowestResolution.toFixed(1)} days`,
      `${underDayPercentage.toFixed(1)}% tickets resolved within 24 hours`
    ];

    recommendedChartType = 'line';
  } else {
    // Default to ticket status if query isn't specific
    data = [
      { name: 'Total Tickets', value: totalTickets },
      { name: 'Resolved', value: resolvedTickets },
      { name: 'Pending', value: totalTickets - resolvedTickets }
    ];
    
    summary = `Analysis of ${totalTickets} total tickets shows ${resolvedTickets} (${((resolvedTickets/totalTickets)*100).toFixed(1)}%) have been resolved. ` +
      `Average resolution time is ${resolutionStats._avg.resolutionTime?.toFixed(1)} days. ` +
      `Customer satisfaction averages ${satisfactionStats._avg.satisfactionRate?.toFixed(1)}/5.`;
    
    insights = [
      `${((resolvedTickets/totalTickets)*100).toFixed(1)}% tickets resolved`,
      `${totalTickets - resolvedTickets} tickets pending`,
      `Average resolution: ${resolutionStats._avg.resolutionTime?.toFixed(1)} days`,
      `Customer satisfaction: ${satisfactionStats._avg.satisfactionRate?.toFixed(1)}/5`,
      `Most common issue: ${issueTypes[0].issueType} (${issueTypes[0]._count} tickets)`
    ];

    recommendedChartType = 'bar';
  }

  // Generate AI explanation based on query type and results
  const aiExplanation = generateAIExplanation(lowerQuery, data, summary, insights);

  // Add logging to debug AI explanation generation
  console.log("Generated AI Explanation:", {
    query: lowerQuery,
    summary,
    insights: insights.slice(0, 3),
    aiExplanation
  });

  return {
    chartType: recommendedChartType,
    data,
    summary,
    insights,
    aiExplanation
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
  
  // Format the data in the structure expected by the UI
  const formattedData = distribution.map(item => ({
    rating: item.rating,
    count: item.count
  }));
  
  return {
    avgRating: satisfactionStats._avg.satisfactionRate || 0,
    percentageHigh,
    percentageLow,
    ratingDistribution: distribution,
    data: formattedData // Add the data property required by the interface
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
    categories: sortedCategories,
    data: issueDistribution // Add the data property with the same format as issueDistribution
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

// Helper function for AI explanations
function generateAIExplanation(query: string, data: any[], summary: string, insights: string[]): string {
  // Add logging to debug the input parameters
  console.log("Generating AI Explanation for:", {
    query,
    dataLength: data.length,
    summaryPreview: summary.slice(0, 100),
    insightsCount: insights.length
  });

  // Extract key metrics for analysis
  const metrics = {
    totalItems: data.length,
    hasTimeData: data.some(d => d.date || d.period || d.timestamp),
    categories: [...new Set(data.map(d => d.type || d.category || d.name))].length,
    maxValue: Math.max(...data.map(d => d.value || d.count || 0)),
    minValue: Math.min(...data.map(d => d.value || d.count || 0))
  };

  // Common patterns in the query
  if (query.includes('ticket') && (query.includes('status') || query.includes('resolved'))) {
    const resolutionRate = insights[0] ? parseInt(insights[0]) : 0;
    return `Based on your query about ticket status, I analyzed the resolution patterns in your dataset. ` +
           `The data reveals important insights about your team's ticket handling efficiency. ` +
           `${summary} This suggests ${insights[0]?.toLowerCase() || 'varying resolution patterns'}. ` +
           `Looking at the workload distribution, ${insights[1]?.toLowerCase() || 'there are some pending tickets'}. ` +
           `The resolution metrics indicate that your team's performance is ${
             (resolutionRate > 75) ? 'strong' : 'has room for improvement'
           } in terms of ticket closure rates.`;
  }
  
  if (query.includes('agent') || query.includes('performance')) {
    return `I've conducted a detailed analysis of agent performance metrics based on your query. ` +
           `${summary} The data highlights variations in individual agent effectiveness. ` +
           `Notably, ${insights[0]?.toLowerCase() || 'there are variations in agent performance'}, while the team as a whole maintains ` +
           `${insights[1]?.toLowerCase() || 'different resolution times'}. ` +
           `The workload distribution shows that ${insights[2]?.toLowerCase() || 'there are variations in ticket handling'}, ` +
           `suggesting potential opportunities for workload balancing.`;
  }
  
  if (query.includes('satisfaction') || query.includes('rating')) {
    const satisfactionRate = insights[3] ? parseInt(insights[3]) : 0;
    return `I've analyzed your customer satisfaction data in detail. ` +
           `${summary} The satisfaction trends reveal interesting patterns. ` +
           `Most notably, ${insights[3]?.toLowerCase() || 'there are variations in satisfaction ratings'}, which indicates ` +
           `${satisfactionRate > 70 ? 'strong customer satisfaction' : 'areas for potential improvement'}. ` +
           `The distribution shows that ${insights[4]?.toLowerCase() || 'there are patterns in satisfaction ratings'}, ` +
           `suggesting consistent service quality across most interactions.`;
  }
  
  if (query.includes('issue') || query.includes('type')) {
    return `I've performed a comprehensive analysis of your issue type distribution. ` +
           `${summary} This analysis reveals key patterns in the types of issues your team handles. ` +
           `Specifically, ${insights[0]?.toLowerCase() || 'there are various issue types'}, and interestingly, ` +
           `${insights[2]?.toLowerCase() || 'there are patterns in issue distribution'}. This suggests that focusing resources on these ` +
           `top issues could significantly impact overall service efficiency.`;
  }

  if (query.includes('trend') || query.includes('over time') || query.includes('pattern')) {
    return `I've analyzed the temporal patterns in your data. ` +
           `${summary} The analysis spans ${metrics.totalItems} data points, showing ${
             metrics.maxValue > metrics.minValue * 1.5 ? 'significant variations' : 'relatively stable patterns'
           } over time. ` +
           `Key insights include: ${insights.slice(0, 3).map(i => i.toLowerCase()).join(', ')}. ` +
           `This temporal analysis can help in forecasting and resource planning.`;
  }

  if (query.includes('compare') || query.includes('difference') || query.includes('versus')) {
    return `I've performed a comparative analysis of your data. ` +
           `${summary} Across ${metrics.categories} different categories, the analysis reveals ${
             metrics.maxValue > metrics.minValue * 2 ? 'significant disparities' : 'relatively balanced distribution'
           }. ` +
           `Notable findings include: ${insights.slice(0, 3).map(i => i.toLowerCase()).join(', ')}. ` +
           `These comparisons highlight areas for potential optimization and improvement.`;
  }
  
  // Enhanced default explanation
  return `I've conducted a comprehensive analysis of your data based on the query "${query}". ` +
         `${summary} The analysis covers ${metrics.totalItems} data points across ${metrics.categories} categories. ` +
         `Key findings include: ${insights.slice(0, 3).map(i => i.toLowerCase()).join(', ')}. ` +
         `${metrics.hasTimeData ? 'The temporal patterns in the data suggest opportunities for trend-based optimization. ' : ''}` +
         `These insights can help inform strategic decisions and process improvements.`;
}