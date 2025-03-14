// file: pages/api/amm/pathfind.ts

import type { NextApiRequest, NextApiResponse } from "next";



interface PathfindBody {
  sourceAccount: string;
  destinationAccount: string;
  destinationAmount: any;        
  sourceCurrencies?: any[];      
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { sourceAccount, destinationAccount, destinationAmount, sourceCurrencies } = req.body as PathfindBody;
    if (!sourceAccount || !destinationAccount || !destinationAmount) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const rpcReq = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "ripple_path_find",
        params: [
          {
            source_account: sourceAccount,
            destination_account: destinationAccount,
            destination_amount: destinationAmount,
            ...(sourceCurrencies ? { source_currencies: sourceCurrencies } : {})
          }
        ]
      })
    };

    const rpcUrl = "https://xrplcluster.com"; 
    const resp = await fetch(rpcUrl, rpcReq);
    const json = await resp.json();

    if (!json.result) {
      return res.status(400).json({ success: false, message: "No result from pathfind." });
    }
    const result = json.result;
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error_message || "Pathfind error" });
    }

    return res.status(200).json({
      success: true,
      alternatives: result.alternatives || [],
      message: "Pathfind success"
    });
  } catch (err: any) {
    console.error("Pathfind error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
