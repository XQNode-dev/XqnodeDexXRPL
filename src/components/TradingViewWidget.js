
import React, { useEffect, useRef } from 'react';

const TradingViewWidget = ({ symbol }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        new window.TradingView.widget({
          container_id: containerRef.current.id,
          width: '100%',
          height: 400,
          symbol: symbol.replace('/', ':'), // Convert pair to TradingView format
          interval: '1',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
        });
      };
      document.body.appendChild(script);
    }
  }, [symbol]);

  return <div id="tradingview_widget" ref={containerRef} style={{ width: '100%', height: '400px' }} />;
};

export default TradingViewWidget;
