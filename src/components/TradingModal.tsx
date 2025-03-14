// components/TradingModal.tsx
import React from "react";

interface TradingModalProps {
  pair: any;
  onClose: () => void;
}

export default function TradingModal({ pair, onClose }: TradingModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 text-cyan-300">Trade {pair.baseToken} / {pair.quoteToken}</h2>

        {/* Form Trading */}
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Amount</label>
            <input
              type="number"
              placeholder="0.0"
              className="w-full px-4 py-2 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Price</label>
            <input
              type="number"
              placeholder="Price"
              className="w-full px-4 py-2 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="bg-[#2a2f45] rounded-lg p-3 shadow-inner">
            <p className="text-sm">Estimated Total: 0.0000 {pair.quoteToken}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex space-x-4">
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
            Buy
          </button>
          <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
            Sell
          </button>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
