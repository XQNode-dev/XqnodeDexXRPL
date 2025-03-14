// file: /pages/api/amm/bid.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";

interface BidSlotRequest {
  poolId: string;
  userAddress: string;
  lpBid: number; 
}
interface BidSlotResponse {
  success: boolean;
  payloadUuid?: string;
  message?: string;
}

export default async function bidSlotHandler(
  req: NextApiRequest,
  res: NextApiResponse<BidSlotResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { poolId, userAddress, lpBid } = req.body as BidSlotRequest;
  if (!poolId || !userAddress || lpBid == null) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const pool = await getPoolFromDb(poolId);
    if (!pool) {
      return res.status(404).json({ success: false, message: "Pool not found" });
    }


    const txJson: any = {
      TransactionType: "AMMBidSlot",
      Account: userAddress,
      PoolID: poolId,
      LPBid: lpBid.toString(),
      Flags: 0,
    };

    const xumm = new XummSdk(
      process.env.XUMM_API_KEY || "",
      process.env.XUMM_API_SECRET || ""
    );
    const payload = await xumm.payload.create(txJson, {
      custom_meta: {
        instruction: "Bid Auction Slot",
        poolId,
        lpBid,
      },
    } as any);

    return res.status(200).json({
      success: true,
      payloadUuid: payload?.uuid,
    });
  } catch (err: any) {
    console.error("AMM bid slot error:", err);
    return res.status(500).json({
      success: false,
      message: "AMM bid slot error: " + err.message,
    });
  }
}

// Dummy DB
async function getPoolFromDb(poolId: string) {
  return {
    id: poolId,
    assetA: "XRP",
    assetB: "XQN",
    assetA_issuer: "",
    assetB_issuer: "rIssuerXQN",
    lpTokenSupply: 100_000,
    totalA: 50_000,
    totalB: 200_000,
    currentFee: 0.003,
  };
}
