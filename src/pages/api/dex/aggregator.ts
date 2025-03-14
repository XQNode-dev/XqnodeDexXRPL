
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { Client } from "xrpl";

interface AggregatorResponse {
  success: boolean;
  message: string;
}



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AggregatorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed. Use POST." });
  }

  const { pairId } = req.body;
  if (!pairId) {
    return res
      .status(400)
      .json({ success: false, message: "pairId required in request body" });
  }

  try {
    const pairDoc = await adminDb.collection("pairs").doc(String(pairId)).get();
    if (!pairDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Pair not found in Firestore." });
    }
    const pairData = pairDoc.data()!;
    const baseToken = String(pairData.baseToken).toUpperCase();
    const baseIssuer = pairData.baseIssuer || null;
    const poolAccount = pairData.poolAccount || null;

    if (baseToken !== "XRP" && !baseIssuer) {
      return res.status(400).json({
        success: false,
        message: "baseIssuer must not be empty for non-XRP tokens.",
      });
    }

    const client = new Client("wss://xrplcluster.com/");
    await client.connect();

    // -----------------------------------------------------
    // (A) gateway_balances => supply, holders, trustlines
    // -----------------------------------------------------
    let totalSupply = 0;
    let holders = 0;
    let trustlines = 0;

    if (baseIssuer && baseToken !== "XRP") {
      const gbResp: any = await client.request({
        command: "gateway_balances",
        account: baseIssuer,
        ledger_index: "validated",
        strict: true,
      });
      const gbRes = gbResp.result;

      if (gbRes.obligations && gbRes.obligations[baseToken]) {
        totalSupply = parseFloat(gbRes.obligations[baseToken]) || 0;
      }

      const addrSet = new Set<string>();
      if (gbRes.balances) {
        for (const address in gbRes.balances) {
          const arr = gbRes.balances[address];
          if (Array.isArray(arr)) {
            arr.forEach((obj) => {
              if (obj.currency === baseToken) {
                const val = parseFloat(obj.value);
                if (val !== 0) {
                  addrSet.add(address);
                }
              }
            });
          }
        }
      }
      holders = addrSet.size;
      trustlines = addrSet.size; 

    }

    // -----------------------------------------------------
    // (B) account_tx => Volume 24h
    // -----------------------------------------------------
    let volume24hXRP = 0;
    if (poolAccount) {
      const txResp: any = await client.request({
        command: "account_tx",
        account: poolAccount,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 200, // real: handle marker paging if >200 tx
      });
      const txs = txResp.result.transactions || [];

      // Filter 24 jam
      const nowUnix2000 = Math.floor(Date.now() / 1000) - 946684800;
      const dayAgoUnix2000 = nowUnix2000 - 24 * 3600;

      for (const item of txs) {
        const tx = item.tx;
        if (!tx || tx.date === undefined) continue;
        const txDate = tx.date;
        if (txDate < dayAgoUnix2000) {
          // older than 24h
          continue;
        }
        if (tx.TransactionType === "OfferCreate") {
          if (typeof tx.TakerGets === "string") {
            volume24hXRP += parseFloat(tx.TakerGets) / 1e6;
          }
          if (typeof tx.TakerPays === "string") {
            volume24hXRP += parseFloat(tx.TakerPays) / 1e6;
          }
        } else if (
          tx.TransactionType === "AMMDeposit" ||
          tx.TransactionType === "AMMWithdraw"
        ) {
          if (typeof tx.Amount === "string") {
            volume24hXRP += parseFloat(tx.Amount) / 1e6;
          }
        }
      }
    }

    await client.disconnect();

    if (baseIssuer && baseToken !== "XRP") {
      await adminDb
        .collection("issuers")
        .doc(baseIssuer)
        .set(
          {
            totalSupply,
            holders,
            trustlines,
          },
          { merge: true }
        );
    }

    const aggregatorRef = pairDoc.ref
      .collection("aggregator")
      .doc("volume24h");
    await aggregatorRef.set(
      {
        lastUpdate: Date.now(),
        volumeXRP: volume24hXRP,
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      message:
        `Aggregator updated issuer (supply=${totalSupply}, holders=${holders}, trustlines=${trustlines}) & volume24hXRP=${volume24hXRP}`,
    });
  } catch (err: any) {
    console.error("Aggregator error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
