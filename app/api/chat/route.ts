import { OpenAIStream, StreamingTextResponse } from 'ai';
import { db } from '@/lib/prisma';
import OpenAI from 'openai';

export const runtime = 'edge';

// Create an OpenAI API client (that's edge-friendly)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { messages, datasetId, datasetName } = await req.json();

    if (!datasetId || !datasetName) {
      return new Response(
        JSON.stringify({ error: 'Dataset ID and name are required' }),
        { status: 400 }
      );
    }

    // Get dataset information and a sample of tickets for context
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId },
      include: {
        tickets: {
          take: 5, // Get 5 sample tickets for context
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!dataset) {
      return new Response(
        JSON.stringify({ error: 'Dataset not found' }),
        { status: 404 }
      );
    }

    // Create a system message with dataset context
    const systemMessage = {
      role: 'system' as const,
      content: `You are analyzing a dataset named "${datasetName}" containing help desk tickets. 
      The dataset has the following structure:
      - Ticket ID
      - Date
      - Employee ID
      - Agent ID
      - Request Category
      - Issue Type
      - Severity
      - Priority
      - Resolution Time (Days)
      - Satisfaction Rate

      Here are some sample tickets for context:
      ${dataset.tickets.map(ticket => `
        - Ticket ${ticket.ticketId}:
          Category: ${ticket.requestCategory}
          Issue: ${ticket.issueType}
          Resolution: ${ticket.resolutionTime} days
          Satisfaction: ${ticket.satisfactionRate}/5
      `).join('\n')}

      Analyze the data and provide insights based on the user's questions.
      If asked for visualizations or statistics, you can use the following formats:
      - Tables: Use markdown table format
      - Charts: Describe the type of chart and data points needed
      `
    };

    // Prepare messages for OpenAI
    const apiMessages = [
      systemMessage,
      ...messages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }))
    ];

    // Create stream
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: apiMessages,
      temperature: 0.7,
      stream: true,
    });

    // Convert the response into a friendly stream
    const stream = OpenAIStream(response, {
      onCompletion: async (completion: string) => {
        // Optional: Save the completion to your database
        console.log('Chat completion:', completion);
      },
    });

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500 }
    );
  }
}

// Instead, we can export a GET method here to handle any potential GET requests and redirect them
export async function GET() {
  return new Response(
    JSON.stringify({
      message: 'This is an API route for the chat interface. Please use the main application.'
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}