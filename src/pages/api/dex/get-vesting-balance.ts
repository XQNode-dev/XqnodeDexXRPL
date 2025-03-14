// File: pages/api/dex/get-vesting-balance.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "xrpl";

interface VestingBalanceResponse {
  success: boolean;
  totalXRP?: number;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VestingBalanceResponse>
) {
  // This endpoint only accepts GET requests
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // Retrieve the sale wallet address from your environment variables
  const SALE_WALLET_ADDRESS = process.env.SALE_WALLET_ADDRESS;
  if (!SALE_WALLET_ADDRESS) {
    return res.status(500).json({ success: false, message: "Sale wallet is not configured" });
  }

  try {
    const client = new Client("wss://xrplcluster.com");
    await client.connect();

    // Request account_info for the sale wallet
    const response = await client.request({
      command: "account_info",
      account: SALE_WALLET_ADDRESS,
      ledger_index: "validated",
    });

    await client.disconnect();

    // Ensure that the account data and balance are available
    if (
      response.result &&
      response.result.account_data &&
      response.result.account_data.Balance
    ) {
      // Balance is returned in drops (1 XRP = 1,000,000 drops)
      const balanceDrops = response.result.account_data.Balance;
      const totalXRP = parseFloat(balanceDrops) / 1e6;
      return res.status(200).json({ success: true, totalXRP });
    } else {
      return res.status(500).json({ success: false, message: "Unable to fetch balance" });
    }
  } catch (error: any) {
    console.error("Error fetching sale wallet balance:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Internal Server Error" });
  }
}
