// file: /src/pages/api/amm/snapshot-all.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "xrpl";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface SnapshotDetail {
  pairId: string;
  status: "success" | "failed" | "skipped";
  docId?: string;
  error?: string;
}

interface SnapshotResponse {
  success: boolean;
  message: string;
  details?: SnapshotDetail[];
}

const XRP_TO_USD = 0.35; 

function isoToHex(iso: string): string {
  let hex = "";
  for (let i = 0; i < iso.length; i++) {
    hex += iso.charCodeAt(i).toString(16);
  }
  return hex.padEnd(40, "0").toUpperCase();
}

function convertCurrency(currency: string): string {
  if (currency === "XRP") return currency;
  return currency.length === 3 ? currency : isoToHex(currency);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SnapshotResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed. Hanya POST yang diperbolehkan.",
    });
  }

  try {
    const pairsSnapshot = await adminDb.collection("pairs").get();
    if (pairsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada pair yang ditemukan di Firestore.",
      });
    }

    const client = new Client("wss://xrplcluster.com/");
    await client.connect();

    const results: SnapshotDetail[] = [];

    for (const pairDoc of pairsSnapshot.docs) {
      const pairId = pairDoc.id;
      const pairData = pairDoc.data();

      if (!pairData.baseToken || !pairData.quoteToken) {
        results.push({
          pairId,
          status: "skipped",
          error: "Data pair tidak lengkap.",
        });
        continue;
      }

      const baseTokenStr = String(pairData.baseToken).toUpperCase();
      const quoteTokenStr = String(pairData.quoteToken).toUpperCase();
      const assetCurrency = convertCurrency(baseTokenStr);
      const asset2Currency = convertCurrency(quoteTokenStr);

      try {
        const assetObj: any = { currency: assetCurrency };
        if (assetCurrency !== "XRP") {
          assetObj.issuer = pairData.baseIssuer;
        }
        const asset2Obj: any = { currency: asset2Currency };
        if (asset2Currency !== "XRP" && pairData.quoteIssuer) {
          asset2Obj.issuer = pairData.quoteIssuer;
        }

        const ammRequest = {
          command: "amm_info",
          asset: assetObj,
          asset2: asset2Obj,
          ledger_index: "validated",
        } as any;

        const response = (await client.request(ammRequest)) as any;
        const ammInfo = response.result.amm;

        if (!ammInfo) {
          results.push({
            pairId,
            status: "failed",
            error: "AMM pool tidak ditemukan di ledger.",
          });
          continue;
        }

        let amount1 = 0; 
        let amount2 = 0; 
        let lpSupply = 0;
        let fee = 0;

        if (ammInfo.amount) {
          if (typeof ammInfo.amount === "string") {
            amount1 = parseFloat(ammInfo.amount) / 1e6;
          } else if (ammInfo.amount.value) {
            amount1 = parseFloat(ammInfo.amount.value);
          }
        }
        if (ammInfo.amount2) {
          if (typeof ammInfo.amount2 === "string") {
            amount2 = parseFloat(ammInfo.amount2) / 1e6;
          } else if (ammInfo.amount2.value) {
            amount2 = parseFloat(ammInfo.amount2.value);
          }
        }
        if (ammInfo.lp_token?.value) {
          lpSupply = parseFloat(ammInfo.lp_token.value);
        }
        if (ammInfo.trading_fee) {
          fee = Number(ammInfo.trading_fee) / 100000; // misal: 0.01 = 1%
        }

        const tvlXRP = 2 * amount2;
        const tvlUSD = tvlXRP * XRP_TO_USD;

        const docRef = await adminDb.collection("tvl_history").add({
          timestamp: Date.now(),
          pairId: pairId,
          baseToken: assetCurrency,
          quoteToken: asset2Currency,
          baseIssuer: pairData.baseIssuer || null,
          quoteIssuer: pairData.quoteIssuer || null,
          tvlXRP,
          tvlUSD,
          totalAssetA: amount1,
          totalAssetB: amount2,
          lpSupply,
          fee,
          poolAccount: ammInfo.account,
        });

        results.push({
          pairId,
          status: "success",
          docId: docRef.id,
        });
      } catch (error: any) {
        results.push({
          pairId,
          status: "failed",
          error: error.message,
        });
      }
    }

    await client.disconnect();

    return res.status(200).json({
      success: true,
      message: "Snapshot untuk semua pair telah selesai.",
      details: results,
    });
  } catch (err: any) {
    console.error("Error pada snapshot-all handler:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
