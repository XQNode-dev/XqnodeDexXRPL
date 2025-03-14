// file: /pages/api/dex/create-offer-limit-auto.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { XummSdk } from "xumm-sdk";

interface AutoLimitOfferRequest {
  pairId: string;
  action: "buy" | "sell";
  amountBase: number;
  amountQuote: number;
  userAddress: string;
}

interface AutoLimitOfferResponse {
  success: boolean;
  message: string;
  payloadUuid?: string;
}

const xumm = new XummSdk(
  process.env.XUMM_API_KEY || "",
  process.env.XUMM_API_SECRET || ""
);

const LIMIT_FLAGS = 0;

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
  res: NextApiResponse<AutoLimitOfferResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { pairId, action, amountBase, amountQuote, userAddress } =
      req.body as AutoLimitOfferRequest;

    if (!pairId || !action || !amountBase || !amountQuote || !userAddress) {
      return res.status(400).json({
        success: false,
        message:
          "Missing fields: pairId, action, amountBase, amountQuote, userAddress",
      });
    }
    if (action !== "buy" && action !== "sell") {
      return res.status(400).json({
        success: false,
        message: "action must be 'buy' or 'sell'",
      });
    }

    const pairDoc = await adminDb.collection("pairs").doc(pairId).get();
    if (!pairDoc.exists) {
      return res.status(404).json({ success: false, message: "Pair not found" });
    }
    const pairData = pairDoc.data()!;
    const baseTokenRaw = String(pairData.baseToken).trim().toUpperCase();
    const quoteTokenRaw = String(pairData.quoteToken).trim().toUpperCase();
    const baseIssuer = pairData.baseIssuer
      ? String(pairData.baseIssuer).trim()
      : null;

    const baseToken = convertCurrency(baseTokenRaw);
    const quoteToken = convertCurrency(quoteTokenRaw);

    const xrpToDrops = (x: number) => Math.floor(x * 1_000_000).toString();
    const makeIOU = (tok: string, issuer: string | null, val: number) => {
      return { currency: tok, issuer: issuer || "", value: val.toString() };
    };

    const baseIsXrp = baseToken === "XRP";
    const quoteIsXrp = quoteToken === "XRP";

    let TakerGets: any;
    let TakerPays: any;

    if (action === "buy") {
      TakerGets = baseIsXrp
        ? xrpToDrops(amountBase)
        : makeIOU(baseToken, baseIssuer, amountBase);
      TakerPays = quoteIsXrp
        ? xrpToDrops(amountQuote)
        : makeIOU(quoteToken, null, amountQuote);
    } else {
      TakerPays = baseIsXrp
        ? xrpToDrops(amountBase)
        : makeIOU(baseToken, baseIssuer, amountBase);
      TakerGets = quoteIsXrp
        ? xrpToDrops(amountQuote)
        : makeIOU(quoteToken, null, amountQuote);
    }

    const offerTx = {
      TransactionType: "OfferCreate",
      Account: userAddress,
      TakerGets,
      TakerPays,
      Flags: LIMIT_FLAGS,
      Fee: "12", // drops
    };

    const payloadBody = {
      txjson: offerTx,
      options: { submit: true },
    } as any;

    const subscription = await xumm.payload.createAndSubscribe(
      payloadBody,
      (ev) => {
        if (ev.data?.signed === true) return { resolved: true };
        if (ev.data?.signed === false) return { resolved: true };
        return {};
      }
    );

    return res.status(200).json({
      success: true,
      message: `Limit order created. Please sign in Xumm.`,
      payloadUuid: subscription.created.uuid,
    });
  } catch (err: any) {
    console.error("create-offer-limit-auto error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
}
