"use client";

import { ReactNode, useRef, useState } from "react";
import { useActions, useUIState } from "ai/rsc";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/lib/hooks/useScrollToBottom";
import { motion } from "framer-motion";
import { 
  ChatState, 
  ChatActions, 
  MessageList, 
  ChatTextMessage, 
  ChatUIMessage,
  UIComponentData,
  Dataset,
  MessageRole,
  UIMessage
} from "@/types/chat";
import { AnalyticsCard } from "@/components/AnalyticsCard";
import { DatasetUploadForm } from "@/components/DatasetUploadForm";
import { DatasetSummaryView } from "@/components/DatasetSummaryView";
import { DataVisualizer } from "@/components/DataVisualizer";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AI } from "./actions";

// Helper function to render UI components based on type
const renderUIComponent = (data: UIComponentData): ReactNode => {
  if (!data) return null;

  switch (data.type) {
    case "analytics":
      return <AnalyticsCard data={data.data} metric={data.metric} />;
    case "dataset-upload":
      return <DatasetUploadForm />;
    case "dataset-list":
      return (
        <div className="w-full max-w-3xl mx-auto p-4">
          <h3 className="text-lg font-medium mb-3">Available Datasets</h3>
          {data.data.length === 0 ? (
            <p className="text-gray-500">
              No datasets found. Use the upload tool to add a new dataset.
            </p>
          ) : (
            <div className="grid gap-3">
              {data.data.map((dataset: Dataset) => (
                <div
                  key={dataset.id}
                  className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{dataset.name}</p>
                    <p className="text-sm text-gray-500">
                      {dataset.recordCount} records • Created{" "}
                      {new Date(dataset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case "dataset-summary":
      return <DatasetSummaryView summary={data.data} />;
    case "data-visualization":
      return <DataVisualizer result={data.data} query="" />;
    case "error":
      return <ErrorMessage message={data.message} />;
    default:
      return null;
  }
};

export default function AnalyticsPage() {
  const actions = useActions<typeof AI>() as ChatActions;
  const [messages, setMessages] = useState<Array<ChatTextMessage | UIMessage>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef, scrollToBottom] =
    useScrollToBottom<HTMLDivElement>();

  // Enhanced suggested actions with more details
  const suggestedActions = [
    {
      title: "Resolution Time Analysis",
      label: "View ticket resolution trends",
      action: "Show me the ticket resolution time trends",
      description: "Analyze how quickly issues are being resolved over time",
      icon: "⏱️",
    },
    {
      title: "Customer Satisfaction",
      label: "Check satisfaction scores",
      action: "Analyze customer satisfaction scores",
      description: "Review customer satisfaction metrics and identify trends",
      icon: "😊",
    },
    {
      title: "Dataset Overview",
      label: "View available datasets",
      action: "List all available datasets",
      description: "See all datasets available for analysis",
      icon: "📊",
    },
    {
      title: "Agent Performance",
      label: "Review agent metrics",
      action: "Show agent performance metrics",
      description: "Compare performance metrics across support agents",
      icon: "👥",
    },
    {
      title: "Monthly Report",
      label: "Generate performance report",
      action: "Generate a monthly performance report",
      description: "Create a comprehensive report of key metrics",
      icon: "📈",
    },
    {
      title: "Issue Analysis",
      label: "View issue distribution",
      action: "Visualize the distribution of issue types",
      description: "See breakdown of different types of support issues",
      icon: "🎯",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage: ChatTextMessage = {
      role: "user" as MessageRole,
      content: input,
      timestamp: new Date(),
    };

    setMessages((messages) => [...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await actions.sendMessage(input);
      if (response) {
        const assistantMessage: UIMessage = {
          id: Math.random().toString(),
          role: "assistant" as MessageRole,
          content: typeof response === 'string' ? response : response.content,
          ui: typeof response === 'string' ? undefined : response.ui,
        };
        setMessages((messages) => [...messages, assistantMessage]);
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = async (action: string) => {
    const userMessage: ChatTextMessage = {
      role: "user" as MessageRole,
      content: action,
      timestamp: new Date(),
    };

    setMessages((messages) => [...messages, userMessage]);
    setIsLoading(true);

    try {
      const response = await actions.sendMessage(action);
      if (response) {
        const assistantMessage: UIMessage = {
          id: Math.random().toString(),
          role: "assistant" as MessageRole,
          content: typeof response === 'string' ? response : response.content,
          ui: typeof response === 'string' ? undefined : response.ui,
        };
        setMessages((messages) => [...messages, assistantMessage]);
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
              Business Intelligence Assistant
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-xl">
              I can help you analyze your business data, generate insights, and create visualizations.
              Try one of the suggestions below or ask me anything!
            </p>

            {/* Enhanced Suggested Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mt-4">
              {suggestedActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <button
                    onClick={() => handleSuggestedAction(action.action)}
                    className="w-full text-left bg-white dark:bg-zinc-800 border border-blue-100 dark:border-zinc-700 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-zinc-700 transition-all shadow-sm group"
                    disabled={isLoading}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{action.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                          {action.title}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                          {action.label}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message 
                key={index} 
                role={message.role}
                content={
                  'ui' in message && message.ui
                    ? renderUIComponent(message.ui)
                    : message.content
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-pulse flex space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animation-delay-200"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animation-delay-400"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-5xl mx-auto flex items-center space-x-4"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your business data..."
            className="flex-1 min-w-0 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
