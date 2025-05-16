import { NextRequest } from 'next/server';

// Instead of using this route, we'll rely on the server actions in actions.tsx
export async function POST(req: NextRequest) {
  // This function should never be called if everything is working correctly
  return new Response(
    JSON.stringify({ 
      error: 'This API route is not necessary. Your app should be using server actions through actions.tsx instead.'
    }),
    { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
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