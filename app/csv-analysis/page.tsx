'use client'

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Message } from '@/components/message';
import { useActions, useUIState } from 'ai/rsc';
import { AI } from '../(preview)/actions';
import { ChatActions, ChatTextMessage, MessageRole, UIMessage, UIComponentData } from '@/types/chat';
import { motion } from 'framer-motion';
import { generateId } from 'ai';
import { DataVisualizer } from '@/components/DataVisualizer';
import { AnalyticsCard } from '@/components/AnalyticsCard';

export default function CSVAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  const datasetName = searchParams.get('name');
  const [uiState] = useUIState<typeof AI>();
  const actions = useActions<typeof AI>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<Array<ChatTextMessage | UIMessage>>([
    {
      id: generateId(),
      role: 'assistant' as MessageRole,
      content: `I'm ready to help you analyze the dataset "${datasetName ? decodeURIComponent(datasetName) : ''}". You can ask me questions like:
      
• What are the most common issue types?
• What's the average resolution time?
• Show me satisfaction ratings by category
• Which agents have the best performance?
• Show trends in ticket volume over time`,
    }
  ]);

  // Sync UI state messages with local messages
  useEffect(() => {
    if (uiState?.messages && uiState.messages.length > 0) {
      setLocalMessages(prev => {
        const newMessages = uiState.messages.filter((msg: UIMessage) => !prev.some(p => p.id === msg.id));
        return [...prev, ...newMessages];
      });
    }
  }, [uiState?.messages]);

  // Suggested analysis queries
  const suggestedQueries = [
    {
      title: "Common Issues",
      action: "What are the most common issue types?",
      icon: "🔍",
      description: "Identify frequently occurring problems"
    },
    {
      title: "Resolution Time",
      action: "What's the average resolution time?",
      icon: "⏱️",
      description: "Analyze how quickly issues are resolved"
    },
    {
      title: "Satisfaction Analysis",
      action: "Show me satisfaction ratings by category",
      icon: "😊",
      description: "Review customer satisfaction by issue type"
    },
    {
      title: "Agent Performance",
      action: "Which agents have the best performance?",
      icon: "👥",
      description: "Compare effectiveness across support team"
    }
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  // Redirect if no dataset ID
  useEffect(() => {
    if (!datasetId || !datasetName) {
      router.push('/');
    }
  }, [datasetId, datasetName, router]);

  if (!datasetId || !datasetName) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputRef.current) return;

    const message = inputRef.current.value.trim();
    if (!message) return;

    // Add user message to chat
    const userMessage: ChatTextMessage = {
      id: generateId(),
      role: "user" as MessageRole,
      content: message,
    };
    setLocalMessages(prev => [...prev, userMessage]);

    // Clear the input
    inputRef.current.value = '';
    setIsLoading(true);

    try {
      // Send the message with dataset context
      const contextualMessage = `Analyzing dataset "${decodeURIComponent(datasetName || '')}" (ID: ${datasetId}): ${message}`;
      const response = await (actions as ChatActions).sendMessage(contextualMessage);
      
      if (response) {
        const assistantMessage: UIMessage = {
          id: generateId(),
          role: "assistant" as MessageRole,
          content: typeof response === 'object' && 'content' in response ? 
            String(response.content) : 
            'Here\'s the information you requested:',
          ui: typeof response === 'object' && 'ui' in response ? 
            response.ui as UIComponentData : 
            undefined,
        };
        setLocalMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setLocalMessages(prev => [...prev, {
        id: generateId(),
        role: "assistant" as MessageRole,
        content: "Sorry, I encountered an error while processing your request. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = async (query: string) => {
    if (isLoading) return;
    
    const userMessage: ChatTextMessage = {
      id: generateId(),
      role: "user" as MessageRole,
      content: query,
    };
    setLocalMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const contextualMessage = `Analyzing dataset "${decodeURIComponent(datasetName || '')}" (ID: ${datasetId}): ${query}`;
      const response = await (actions as ChatActions).sendMessage(contextualMessage);
      
      if (response) {
        const assistantMessage: UIMessage = {
          id: generateId(),
          role: "assistant" as MessageRole,
          content: typeof response === 'object' && 'content' in response ? 
            String(response.content) : 
            'Here\'s the information you requested:',
          ui: typeof response === 'object' && 'ui' in response ? 
            response.ui as UIComponentData : 
            undefined,
        };
        setLocalMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setLocalMessages(prev => [...prev, {
        id: generateId(),
        role: "assistant" as MessageRole,
        content: "Sorry, I encountered an error while processing your request. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: ChatTextMessage | UIMessage) => {
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-4 mb-6"
      >
        <Message role={message.role} content={message.content} />
        {'ui' in message && message.ui && (
          <div className="mt-4">
            {message.ui.type === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
                {message.ui.message}
              </div>
            )}
            {message.ui.type === 'analytics' && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                <AnalyticsCard 
                  data={message.ui.data} 
                  metric={message.ui.metric} 
                />
              </div>
            )}
            {message.ui.type === 'data-visualization' && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                <DataVisualizer 
                  result={message.ui.data} 
                  query={message.content}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden">
      {/* Header */}
      <motion.div 
        className="bg-zinc-900 border-b border-zinc-800 p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-3xl mx-auto flex items-center">
          <button 
            onClick={() => router.push('/')}
            className="mr-3 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 text-zinc-400"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-medium text-white">
              {datasetName ? decodeURIComponent(datasetName) : 'Dataset Analysis'}
            </h1>
            <p className="text-xs text-zinc-400">
              Ask questions about your data to generate insights
            </p>
          </div>
        </div>
      </motion.div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 bg-zinc-900">
        <div className="max-w-3xl mx-auto pt-4 pb-32">
          {localMessages.map(renderMessage)}

          {localMessages.length === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="px-4 mt-6"
            >
              <p className="text-zinc-400 text-sm mb-3">Try asking:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedQueries.map((query, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => handleSuggestedQuery(query.action)}
                      className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg p-3 hover:bg-zinc-750 transition-all group"
                      disabled={isLoading}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-xl bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                          {query.icon}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-200 text-sm">
                            {query.title}
                          </div>
                          <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                            {query.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {isLoading && (
            <motion.div 
              className="flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex space-x-2">
                <motion.div 
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{ scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{ scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.div 
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{ scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <motion.div 
        className="border-t border-zinc-800 bg-black p-4 w-full fixed bottom-0 left-0 right-0"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center relative"
        >
          <textarea
            ref={inputRef}
            placeholder="Ask a question about your data..."
            className="flex-1 min-w-0 p-4 pl-5 pr-12 rounded-full border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-800 text-zinc-200 placeholder-zinc-400 min-h-[52px] max-h-32 resize-none overflow-hidden"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <motion.button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-5 h-5 text-white"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </motion.button>
        </form>
        <div className="max-w-3xl mx-auto flex justify-center mt-2">
          <p className="text-xs text-zinc-500">
            Dataset Analysis Assistant powered by AI
          </p>
        </div>
      </motion.div>
    </div>
  );
}