// file: /pages/api/amm/get-tvl-history.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Client, isValidAddress } from "xrpl";

const FULL_HISTORY_NODE = "wss://xrplcluster.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { pairId } = req.query;
    if (!pairId || typeof pairId !== "string") {
      return res.status(400).json({
        success: false,
        message: "pairId is required (string)",
      });
    }

    const poolInfoResp = await fetch(`http://xrplquantum.com/api/amm/get-pool?pairId=${pairId}`);
    const poolInfoData = await poolInfoResp.json();
    if (!poolInfoData.success || !poolInfoData.pool?.account) {
      return res.status(404).json({
        success: false,
        message: "Pool not found or no account field.",
      });
    }
    const poolAccount = poolInfoData.pool.account;

    if (!isValidAddress(poolAccount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid poolAccount address: " + poolAccount,
      });
    }

    const client = new Client(FULL_HISTORY_NODE);
    await client.connect();

    const allTxs: any[] = [];
    let marker: any = null;

    while (true) {
      const txRequest = {
        command: "account_tx",
        account: poolAccount,
        ledger_index_min: -1,
        ledger_index_max: -1,
        forward: true,
        limit: 200,
        marker,
      };

      const resp = await client.request(txRequest as any);
      const result = resp.result as any;

      if (Array.isArray(result.transactions)) {
        allTxs.push(...result.transactions);
      }

      if (result.marker) {
        marker = result.marker; 
      } else {
        break;
      }
    }

    await client.disconnect();

    allTxs.sort((a, b) => {
      const tA = a.tx?.date || a.tx?.TransactionDate || 0;
      const tB = b.tx?.date || b.tx?.TransactionDate || 0;
      return tA - tB;
    });

    let runningTvl = 0;
    const tvlHistory: { time: number; tvl: number }[] = [];

    for (const item of allTxs) {
      const tx = item.tx || {};
      const txType = tx.TransactionType || "Unknown";

      const dateField = tx.date || tx.TransactionDate;
      if (!dateField) continue;
      const ledgerUnix = Number(dateField) + 946684800;
      const timeMs = ledgerUnix * 1000;

      if (txType === "AMMDeposit") {
        const depositAmt = parseXrpAmount(tx.Amount);
        runningTvl += depositAmt;
        tvlHistory.push({ time: timeMs, tvl: runningTvl });
      } else if (txType === "AMMWithdraw") {
        const withdrawAmt = parseXrpAmount(tx.Amount);
        runningTvl -= withdrawAmt;
        tvlHistory.push({ time: timeMs, tvl: runningTvl });
      }
    }

    return res.status(200).json({
      success: true,
      history: tvlHistory,
    });

  } catch (err: any) {
    console.error("Error in get-tvl-history XRPL approach:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
}

function parseXrpAmount(amt: any): number {
  if (!amt) return 0;
  if (typeof amt === "string") {
    return parseFloat(amt) / 1e6;
  }
  if (amt.value) {
    return parseFloat(amt.value);
  }
  return 0;
}
