import React, { useEffect, useState } from "react";

interface Offer {
  offerId: string;
  pairId: string;
  action: "buy" | "sell";
  amount: number | string;
  price: number | string;
  userAddress: string;
  status: "open" | "filled" | "cancelled";
}

interface OrderBookProps {
  pairId: string;
}

interface OrderBookData {
  success: boolean;
  bids?: Offer[];
  asks?: Offer[];
  currentPrice?: string;
  message?: string;
}


function formatNumberDisplay(val: number | string, decimals: number): string {
  const num = typeof val === "number" ? val : parseFloat(val);
  if (!Number.isFinite(num)) return "NaN";

  const fixStr = num.toFixed(decimals); 

  const finalStr = parseFloat(fixStr).toString(); 

  return finalStr;
}

export default function OrderBook({ pairId }: OrderBookProps) {
  const [bids, setBids] = useState<Offer[]>([]);
  const [asks, setAsks] = useState<Offer[]>([]);
  const [currentPrice, setCurrentPrice] = useState<string>("N/A");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchOrderBook = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dex/get-order-book?pairId=${pairId}`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      const data: OrderBookData = await response.json();
      console.log("Fetched order book data:", data);

      if (data.success) {
        setBids(data.bids || []);
        setAsks(data.asks || []);
        setCurrentPrice(data.currentPrice || "N/A");
        setError(null);
      } else {
        setError(data.message || "Failed to fetch order book.");
      }
    } catch (err: any) {
      console.error("Error fetching order book:", err);
      setError("Error fetching order book.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pairId) return;
    console.log(`Fetching order book for pairId: ${pairId}`);
    fetchOrderBook();
  }, [pairId]);

  if (loading) {
    return <div className="text-gray-300 animate-pulse">Loading order book...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-900 bg-opacity-80 p-4 rounded-2xl shadow-2xl border border-gray-700 text-white font-sans 
                    text-[0.65rem] md:text-xs">
      {/* Current Price */}
      <div className="mb-4">
        <h2 className="text-base md:text-lg font-extrabold text-center tracking-wider text-transparent bg-clip-text 
                       bg-gradient-to-r from-teal-400 to-pink-500">
          Current Price:{" "}
          <span className="text-teal-300">{currentPrice} XRP</span>
        </h2>
      </div>

      {/* GRID Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BIDS */}
        <div className="space-y-2">
          <h3 className="text-sm md:text-base font-bold text-teal-400 tracking-wide">Bids</h3>
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-3 shadow-inner">
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-gray-400 border-b border-gray-600 text-left">
                  <th className="py-2 w-1/2">Price (XRP)</th>
                  <th className="py-2 w-1/2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bids.length > 0 ? (
                  bids.map((bid) => (
                    <tr
                      key={bid.offerId}
                      className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                    >
                      <td className="py-1 pr-2 text-teal-300 font-medium whitespace-nowrap overflow-hidden">
                        {formatNumberDisplay(bid.price, 7) /* 3 decimal for price */}
                      </td>
                      <td className="py-1 text-right text-gray-300 whitespace-nowrap">
                        {formatNumberDisplay(bid.amount, 0) /* 2 decimal for amount */}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="text-center text-gray-500 py-2">
                      No bids available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ASKS */}
        <div className="space-y-2">
          <h3 className="text-sm md:text-base font-bold text-pink-400 tracking-wide">Asks</h3>
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-3 shadow-inner">
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-gray-400 border-b border-gray-600 text-left">
                  <th className="py-2 w-1/2">Price (XRP)</th>
                  <th className="py-2 w-1/2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {asks.length > 0 ? (
                  asks.map((ask) => (
                    <tr
                      key={ask.offerId}
                      className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                    >
                      <td className="py-1 pr-2 text-pink-300 font-medium whitespace-nowrap overflow-hidden">
                        {formatNumberDisplay(ask.price, 3)}
                      </td>
                      <td className="py-1 text-right text-gray-300 whitespace-nowrap">
                        {formatNumberDisplay(ask.amount, 2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="text-center text-gray-500 py-2">
                      No asks available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-center text-[0.6rem] md:text-xs text-gray-400 space-y-1">
        <p>
          Total Bids: <span className="text-teal-300 font-semibold">{bids.length}</span>
        </p>
        <p>
          Total Asks: <span className="text-pink-300 font-semibold">{asks.length}</span>
        </p>
      </div>
    </div>
  );
}
