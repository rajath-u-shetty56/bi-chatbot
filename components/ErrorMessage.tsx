'use client'
import React from 'react';

interface ErrorMessageProps {
  message: string;
  retryAction?: () => void;
  showDetails?: boolean;
  details?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  retryAction,
  showDetails = false,
  details
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-lg p-4 my-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-red-500 dark:text-red-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Error
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>{message}</p>
            
            {showDetails && details && (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm font-medium flex items-center"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? 'Hide' : 'Show'} details
                  <svg 
                    className={`ml-1 h-4 w-4 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>
                
                {expanded && (
                  <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-xs overflow-auto max-h-40">
                    {details}
                  </pre>
                )}
              </div>
            )}
            
            {retryAction && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={retryAction}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Optional loading state component - can be used alongside error handling
export const LoadingMessage: React.FC<{message?: string}> = ({ 
  message = "Loading data..." 
}) => {
  return (
    <div className="flex justify-center items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3"></div>
        <p className="text-gray-600 dark:text-gray-300">{message}</p>
      </div>
    </div>
  );
};