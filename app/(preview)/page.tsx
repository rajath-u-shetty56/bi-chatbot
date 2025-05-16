'use client'
import { ReactNode, useRef, useState } from "react";
import { useActions } from "ai/rsc";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/lib/hooks/useScrollToBottom";
import { motion } from "framer-motion";
import { generateId } from "ai";
import { 
  ChatActions, 
  ChatTextMessage, 
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
import { ReportView } from "@/components/ReportView";
import { AI } from "./actions";
import { CSVUploadCard } from "@/components/CSVUploadCard";

interface AIResponse {
  content: string | ReactNode;
  ui?: UIComponentData;
}

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
                  className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-200">{dataset.name}</p>
                    <p className="text-sm text-gray-400">
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
    case "report":
      return <ReportView data={data.data} />;
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
    },
    {
      title: "Customer Satisfaction",
      label: "Check satisfaction scores",
      action: "Analyze customer satisfaction scores",
      description: "Review customer satisfaction metrics and identify trends",
    },
    {
      title: "Dataset Overview",
      label: "View available datasets",
      action: "List all available datasets",
      description: "See all datasets available for analysis",
    },
    {
      title: "Agent Performance",
      label: "Review agent metrics",
      action: "Show agent performance metrics",
      description: "Compare performance metrics across support agents",
    },
    {
      title: "Monthly Report",
      label: "Generate performance report",
      action: "Generate a monthly performance report",
      description: "Create a comprehensive report of key metrics",
    },
    {
      title: "Issue Analysis",
      label: "View issue distribution",
      action: "Visualize the distribution of issue types",
      description: "See breakdown of different types of support issues",
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
          id: generateId(),
          role: "assistant" as MessageRole,
          content: String(
            typeof response === 'object' && 'content' in response 
              ? response.content 
              : response
          ),
          ui: typeof response === 'object' && 'ui' in response 
            ? response.ui as UIComponentData
            : undefined,
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
          id: generateId(),
          role: "assistant" as MessageRole,
          content: String(
            typeof response === 'object' && 'content' in response 
              ? response.content 
              : response
          ),
          ui: typeof response === 'object' && 'ui' in response 
            ? response.ui as UIComponentData
            : undefined,
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
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 bg-zinc-900"
      >
        {messages.length === 0 ? (
          <motion.div 
            className="flex flex-col items-center justify-center min-h-full space-y-6 py-16 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="rounded-full bg-zinc-800 p-4 w-16 h-16 flex items-center justify-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-zinc-300">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </motion.div>
            
            <motion.div
              className="text-center space-y-3 max-w-xl"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-3xl font-bold text-white">
                Business Intelligence Assistant
              </h1>
              <p className="text-zinc-400 text-center">
                I can help you analyze your business data, generate insights, and create visualizations.
                Try one of the suggestions below or ask me anything!
              </p>
            </motion.div>

            {/* CSV Upload Card */}
            <motion.div
              className="w-full max-w-5xl mt-6 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <CSVUploadCard />
            </motion.div>

            {/* Enhanced Suggested Actions Grid */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl mt-4 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {suggestedActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.97 }}
                >
                  <button
                    onClick={() => handleSuggestedAction(action.action)}
                    className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:bg-zinc-750 transition-all shadow-md group"
                    disabled={isLoading}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-1">
                        <div className="font-semibold text-blue-400 mb-1">
                          {action.title}
                        </div>
                        <div className="text-sm text-zinc-300 mb-2">
                          {action.label}
                        </div>
                        <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <>
            <div className="pb-32 pt-4 md:pt-10 px-4 md:px-8 mx-32">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Message 
                    role={message.role}
                    content={
                      'ui' in message && message.ui
                        ? renderUIComponent(message.ui)
                        : message.content
                    }
                  />
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
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
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your business data..."
            className="flex-1 min-w-0 p-4 pl-5 pr-12 rounded-full border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-800 text-zinc-200 placeholder-zinc-400"
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
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
            Business Intelligence Assistant powered by AI
          </p>
        </div>
      </motion.div>
    </div>
  );
}