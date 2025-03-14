import type { NextApiRequest, NextApiResponse } from "next";
import * as xrpl from "xrpl";

interface Balances {
  [key: string]: number;
}

interface BalanceResponse {
  success: boolean;
  balances?: Balances;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BalanceResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { userAddress } = req.body;
  if (!userAddress) {
    return res
      .status(400)
      .json({ success: false, message: "User address is required" });
  }

  const client = new xrpl.Client("wss://xrplcluster.com", {
    connectionTimeout: 10000,
  });

  try {
    await client.connect();

    const accountInfo = await client.request({
      command: "account_info",
      account: userAddress,
      ledger_index: "validated",
    });

    const balances: Balances = {};

    // Buat variabel rawBal
    const rawBal = accountInfo.result.account_data.Balance;

    if (rawBal != null) {
      // Pakai ts-ignore agar TS tidak protes
      // @ts-ignore
      balances["XRP"] = parseFloat(xrpl.dropsToXrp(rawBal));
    }

    await client.disconnect();

    return res.status(200).json({
      success: true,
      balances,
    });
  } catch (error: any) {
    console.error("Error fetching user balances:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user balances.",
    });
  }
}
