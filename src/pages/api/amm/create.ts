// file: /pages/api/amm/create.ts

import type { NextApiRequest, NextApiResponse } from "next"
import { adminDb } from "../../../../lib/firebaseAdmin"

interface AmmCreateResponse {
  success: boolean;
  payloadUuid?: string;
  message?: string;
}

function asciiToHex20Bytes(code: string): string {
  if (code.length > 20) {
    throw new Error("Currency code is too long (max 20 bytes)");
  }
  const encoder = new TextEncoder();
  const asciiBytes = encoder.encode(code);
  const padded = new Uint8Array(20);
  padded.set(asciiBytes, 0);
  return Buffer.from(padded).toString("hex").toUpperCase();
}

function xrpToDrops(xrp: number): string {
  return String(Math.floor(xrp * 1_000_000));
}

export default async function createAmmHandler(
  req: NextApiRequest,
  res: NextApiResponse<AmmCreateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    // Param default
    const userAddress = "rJaKjGfV5PfDjE7Py5DKgxFpgwTb6KDApu"; 
    const depositXrpDrops = xrpToDrops(15);
    const xqnodeHex = asciiToHex20Bytes("XQNODE");
    const xqnodeIssuer = "rMGxLvhAGfTcbGLqqMLorruonN5ujoUdHS";
    const depositXqnodeValue = "30000"; 
    const tradingFeeBps = 1000; // 10%

    // Buat txJson AMMCreate
    const txJson: any = {
      TransactionType: "AMMCreate",
      Account: userAddress,
      TradingFee: tradingFeeBps,
      Amount: depositXrpDrops,
      Amount2: {
        currency: xqnodeHex,
        issuer: xqnodeIssuer,
        value: depositXqnodeValue
      }
    };


    const payload: any = {
      uuid: "dummy-uuid-1234" 
    };



    const payloadUuid = payload?.uuid;

    await adminDb.collection("ammPools").doc(payloadUuid).set({
      userAddress,
      assetA: "XRP",
      assetB: "XQNODE",
      assetA_issuer: null,
      assetB_issuer: xqnodeIssuer,
      totalA: 15,
      totalB: 30000,
      lpTokenSupply: 0,
      currentFee: tradingFeeBps / 10000, // 0.10 => 10%
      payloadUuid,
      createdAt: new Date().toISOString()
    });

    console.log("AMMCreate txJson =>", JSON.stringify(txJson, null, 2));

    return res.status(200).json({
      success: true,
      payloadUuid
    });
  } catch (err: any) {
    console.error("AMM create error =>", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}
