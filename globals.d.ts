interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      [key: string]: any;
    };
    close: () => void;
    MainButton: {
      setText: (text: string) => void;
      show: () => void;
      hide: () => void;
      onClick: (callback: () => void) => void;
    };
  }
  
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
  