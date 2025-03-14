declare global {
    interface Window {
      TelegramLoginWidget: {
        init: (options: {
          bot_id: string;
          onAuth: (user: { id: string; first_name: string; last_name: string }) => void;
        }) => void;
      };
    }
  }
  
  export {};
  