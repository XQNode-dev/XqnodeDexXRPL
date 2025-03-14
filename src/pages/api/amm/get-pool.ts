// file: /pages/api/dex/get-pool.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "xrpl";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface GetPoolResponse {
  success: boolean;
  message: string;
  pool?: {
    pair: string;
    asset1: {
      currency: string;
      issuer: string | null;
      amount: number;
    };
    asset2: {
      currency: string;
      issuer: string | null;
      amount: number;
    };
    lpSupply: number;
    currentFee: number;
    totalAssetA: number;
    totalAssetB: number;
    tvl: number;
    marketCap: number;
    account?: string;
    volume24h?: number;
    supply?: number;
    holders?: number;
    trustlines?: number;
    priceChange?: number;
  };
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
  res: NextApiResponse<GetPoolResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed." });
  }

  const { pairId } = req.query;
  if (!pairId) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'pairId' harus disediakan.",
    });
  }

  try {
    const pairDoc = await adminDb.collection("pairs").doc(String(pairId)).get();
    if (!pairDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Pair tidak ditemukan." });
    }

    const pairData = pairDoc.data();
    if (!pairData || !pairData.baseToken || !pairData.quoteToken) {
      return res
        .status(400)
        .json({ success: false, message: "Data pair tidak lengkap." });
    }

    const assetStr = String(pairData.baseToken).toUpperCase();
    const asset2Str = String(pairData.quoteToken).toUpperCase();

    const assetCurrency = convertCurrency(assetStr);
    const asset2Currency = convertCurrency(asset2Str);

    const issuer1 =
      assetStr === "XRP"
        ? null
        : pairData.baseIssuer
        ? String(pairData.baseIssuer)
        : null;

    const issuer2 = asset2Str === "XRP" ? null : null;

    if (assetStr !== "XRP" && !issuer1) {
      return res.status(400).json({
        success: false,
        message: "Issuer untuk baseToken tidak ditemukan.",
      });
    }

    const client = new Client("wss://xrplcluster.com/");
    await client.connect();

    const assetObj: any = { currency: assetCurrency };
    if (assetCurrency !== "XRP") {
      assetObj.issuer = issuer1;
    }
    const asset2Obj: any = { currency: asset2Currency };
    if (asset2Currency !== "XRP") {
      asset2Obj.issuer = issuer2;
    }

    const ammRequest: any = {
      command: "amm_info",
      asset: assetObj,
      asset2: asset2Obj,
      ledger_index: "validated",
    };

    const response = await client.request(ammRequest as any);
    const ammInfo = (response.result as any).amm;
    console.log("Raw ammInfo dari ledger:", JSON.stringify(ammInfo, null, 2));

    if (!ammInfo) {
      await client.disconnect();
      return res
        .status(404)
        .json({ success: false, message: "Pool tidak ditemukan di ledger." });
    }

    // [3] Parsing data pool
    let amount1 = 0;
    if (ammInfo.amount && typeof ammInfo.amount === "string") {
      amount1 = parseFloat(ammInfo.amount) / 1e6;
    } else if (ammInfo.amount && ammInfo.amount.value) {
      amount1 = parseFloat(ammInfo.amount.value);
    }

    let amount2 = 0;
    if (ammInfo.amount2 && typeof ammInfo.amount2 === "string") {
      amount2 = parseFloat(ammInfo.amount2) / 1e6;
    } else if (ammInfo.amount2 && ammInfo.amount2.value) {
      amount2 = parseFloat(ammInfo.amount2.value);
    }

    let lpSupply = 0;
    if (ammInfo.lp_token && ammInfo.lp_token.value) {
      lpSupply = parseFloat(ammInfo.lp_token.value);
    }

    let fee = 0;
    if (ammInfo.trading_fee) {
      fee = Number(ammInfo.trading_fee) / 100000; // ex: 0.01 = 1%
    }

    const tvlXRP = 2 * amount2;
    const marketCapUSD = tvlXRP * XRP_TO_USD;

    const volume24h = 1234;   
    const supply = 273000000; 
    const holders = 466;      
    const trustlines = 19000; 
    const priceChange = 12.5; 

    await client.disconnect();

    const poolData = {
      pair: `${assetStr}/${asset2Str}`,
      asset1: {
        currency: assetCurrency,
        issuer: issuer1,
        amount: amount1,
      },
      asset2: {
        currency: asset2Currency,
        issuer: issuer2,
        amount: amount2,
      },
      lpSupply,
      currentFee: fee,
      totalAssetA: amount1,
      totalAssetB: amount2,
      tvl: tvlXRP,
      marketCap: marketCapUSD,
      account: ammInfo.account, 

      volume24h,
      supply,
      holders,
      trustlines,
      priceChange,
    };

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).json({
      success: true,
      message: "Pool + Stats fetched successfully.",
      pool: poolData,
    });
  } catch (error: any) {
    console.error("Error in get-pool API:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
