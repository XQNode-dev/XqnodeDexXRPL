import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
);

/**
 * Body request:
 * {
 *   userAddress: string;
 *   asset1Currency: string;
 *   asset1Issuer?: string | null;
 *   asset2Currency: string;
 *   asset2Issuer?: string | null;
 *   bidType: number;   // Tipe AMMBid: SHIFT=1, BID_AUCTION=4, dsb.
 *
 *   // SHIFT mode:
 *   amount?: number;
 *
 *   // Auction mode:
 *   bidMin?: { currency: string, issuer: string, value: string };
 *   bidMax?: { currency: string, issuer: string, value: string };
 * }
 */

interface AmmBidRequest {
  userAddress: string;
  asset1Currency: string;
  asset1Issuer?: string | null;
  asset2Currency: string;
  asset2Issuer?: string | null;

  bidType: number;
  
  // SHIFT
  amount?: number;

  // Auction
  bidMin?: { currency: string; issuer: string; value: string };
  bidMax?: { currency: string; issuer: string; value: string };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const body = req.body as AmmBidRequest;

    // Minimal validasi
    if (!body.userAddress) {
      return res.status(400).json({ success: false, message: "userAddress required" });
    }
    if (!body.asset1Currency || !body.asset2Currency) {
      return res.status(400).json({ success: false, message: "asset1/asset2 missing" });
    }

    // Helper buildAsset
    function buildAsset(currency: string, issuer?: string | null) {
      const ccy = currency.trim().toUpperCase();
      if (ccy === "XRP") {
        return "XRP";
      }
      if (!issuer) {
        throw new Error(`Issuer required for non-XRP token: ${ccy}`);
      }
      return { currency: ccy, issuer };
    }

    const assetA = buildAsset(body.asset1Currency, body.asset1Issuer);
    const assetB = buildAsset(body.asset2Currency, body.asset2Issuer);

    const tx: any = {
      TransactionType: "AMMBid",
      Account: body.userAddress,
      Asset: assetA,
      Asset2: assetB,
      BidType: body.bidType
    };

    // SHIFT scenario (Amount)
    if (typeof body.amount === "number" && body.amount > 0 && body.bidType === 1) {

      const ccy = body.asset1Currency.trim().toUpperCase();
      if (ccy === "XRP") {
        tx.Amount = String(Math.floor(body.amount * 1_000_000));
      } else {
        if (!body.asset1Issuer) {
          throw new Error(`Issuer required for non-XRP SHIFT: ${ccy}`);
        }
        tx.Amount = {
          currency: ccy,
          issuer: body.asset1Issuer,
          value: body.amount.toString()
        };
      }
    }

    else if (body.bidType === 4) {
      if (!body.bidMin && !body.bidMax) {
        throw new Error(`Missing bidMin/bidMax in Auction mode`);
      }
      if (body.bidMin) {
        tx.BidMin = body.bidMin;
      }
      if (body.bidMax) {
        tx.BidMax = body.bidMax;
      }
    }

    console.log("Final AMMBid TX =>", JSON.stringify(tx, null, 2));

    const payload = await xumm.payload.create(tx, true);
    if (!payload?.uuid) {
      return res.status(500).json({ success: false, message: "Failed to create XUMM payload" });
    }

    return res.status(200).json({ success: true, payloadUuid: payload.uuid });

  } catch (err: any) {
    console.error("AMMBid error =>", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
