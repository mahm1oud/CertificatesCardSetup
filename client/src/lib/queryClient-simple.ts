import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Simple API request function with multiple overloads
export async function apiRequest<T = any>(
  urlOrMethod: string,
  urlOrOptions?: string | { method?: string; body?: any; headers?: Record<string, string> },
  bodyOrOptions?: any,
  options?: { method?: string; body?: any; headers?: Record<string, string> }
): Promise<T> {
  let url: string;
  let method: string = 'GET';
  let body: any = undefined;
  let headers: Record<string, string> = {};

  // Handle different parameter patterns
  if (typeof urlOrOptions === 'string') {
    // Pattern: apiRequest(method, url, body, options)
    method = urlOrMethod;
    url = urlOrOptions;
    body = bodyOrOptions;
    headers = options?.headers || {};
  } else if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    // Pattern: apiRequest(url, options)
    url = urlOrMethod;
    method = urlOrOptions.method || 'GET';
    body = urlOrOptions.body;
    headers = urlOrOptions.headers || {};
  } else {
    // Pattern: apiRequest(url)
    url = urlOrMethod;
  }
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Simple query function for TanStack Query
const queryFn: QueryFunction = async ({ queryKey }) => {
  const url = queryKey[0] as string;
  return apiRequest(url);
};

// Create QueryClient with minimal configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;