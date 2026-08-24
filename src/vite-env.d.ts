/// <reference types="vite/client" />

interface Window {
  turnstile?: {
    render: (selector: string, options: Record<string, unknown>) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId?: string) => void;
  };
}
