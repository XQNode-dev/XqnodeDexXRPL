import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'xrpl'

interface GetTransactionsResponse {
  success: boolean;
  message: string;
  transactions?: any[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetTransactionsResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { poolAccount } = req.query;
  if (!poolAccount || typeof poolAccount !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Parameter 'poolAccount' harus disediakan dan berupa string."
    });
  }

  if (!/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(poolAccount)) {
    return res.status(400).json({
      success: false,
      message: "Account malformed."
    });
  }

  const client = new Client("wss://xrplcluster.com/");
  try {
    await client.connect();
    const txResponse = await client.request({
      command: "account_tx",
      account: poolAccount,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      limit: 50
    });
    const transactions = txResponse.result.transactions;
    await client.disconnect();
    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully.",
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
