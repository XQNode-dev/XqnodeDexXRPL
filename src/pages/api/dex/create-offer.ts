// file: /src/pages/api/dex/create-offer.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { XummSdk } from "xumm-sdk";
import { constructTokenCurrency } from "../../../../lib/xrplUtils";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY || "",
  process.env.XUMM_API_SECRET || ""
);

const FEE_RATE = 0.003;

type XRPLDrop = string;
type XRPLIOU = { currency: string; issuer: string; value: string };
type TakerField = XRPLDrop | XRPLIOU;

interface CreateOfferRequest {
  pairId: string;
  action: "buy" | "sell"; // user wants to buy or sell base
  amount: number;
  price?: number;
  userAddress: string;
  orderType: "limit" | "market";
}

interface CreateOfferResponse {
  success: boolean;
  message: string;
  payloadUuid?: string;
}


function makeTakerField(token: string, issuer: string | undefined, numericValue: number): TakerField {
  if (token === "XRP") {
    const drops = Math.floor(numericValue * 1_000_000);
    return drops.toString();
  } else {
    const ctc = constructTokenCurrency(token, issuer);
    return {
      ...(ctc as { currency: string; issuer: string }),
      value: numericValue.toString(),
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateOfferResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { pairId, action, amount, price, userAddress, orderType } =
      req.body as CreateOfferRequest;

    if (!pairId || !action || !amount || !userAddress || !orderType) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields." });
    }

    // 1) Fetch pair
    const pairDoc = await adminDb.collection("pairs").doc(pairId).get();
    if (!pairDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Pair not found." });
    }
    const pairData = pairDoc.data()!;
    const { baseToken, quoteToken, baseIssuer } = pairData;

    // 2) usedPrice
    let usedPrice = price ?? 0;
    if (orderType === "limit") {
      if (!price || price <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Price required for limit order." });
      }
      usedPrice = price;
    } else {
      // "market" => fetch topBid/topAsk
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/dex/get-order-book?pairId=${pairId}`
      );
      const obData = await resp.json();
      // Not checking error => proceed

      const topBid = obData.bids?.[0]?.price ?? 0;
      const topAsk = obData.asks?.[0]?.price ?? 0;

      if (action === "buy") {
        usedPrice = topAsk > 0 ? topAsk : 999999;
      } else {
        usedPrice = topBid > 0 ? topBid : 0.000001;
      }
    }

    // 3) TakerGets / TakerPays
    let TakerGets: TakerField;
    let TakerPays: TakerField;

    if (action === "buy") {
      // user => get base => TakerGets= base
      // user => pay quote => TakerPays= quote
      const normalPays = amount * usedPrice;
      const finalPays = normalPays * (1 + FEE_RATE);

      TakerGets =
        baseToken === "XRP"
          ? makeTakerField("XRP", undefined, amount)
          : makeTakerField(baseToken, baseIssuer, amount);

      TakerPays =
        quoteToken === "XRP"
          ? makeTakerField("XRP", undefined, finalPays)
          : makeTakerField(quoteToken, baseIssuer, finalPays);
    } else {
      // action === "sell"
      // TakerPays= base => TakerGets= quote
      const finalAmount = amount * (1 - FEE_RATE);

      TakerPays =
        baseToken === "XRP"
          ? makeTakerField("XRP", undefined, finalAmount)
          : makeTakerField(baseToken, baseIssuer, finalAmount);

      const normalGets = usedPrice * amount;
      TakerGets =
        quoteToken === "XRP"
          ? makeTakerField("XRP", undefined, normalGets)
          : makeTakerField(quoteToken, baseIssuer, normalGets);
    }

    // 4) OfferCreate TX
    const offerCreateTx = {
      TransactionType: "OfferCreate",
      Account: userAddress,
      TakerGets,
      TakerPays,
      Fee: "12",
      Flags: 0,
    };

    const payloadBody = {
      txjson: offerCreateTx,
      options: { submit: true },
    } as any;

    // 6) Create & Subscribe 
    const subscription = await xumm.payload.createAndSubscribe(
      payloadBody,
      (event) => {
        if (event.data?.signed === true) return { resolved: true };
        if (event.data?.signed === false) return { resolved: true };
        return {};
      }
    );

    return res.status(200).json({
      success: true,
      message: `OfferCreate type=${orderType}, action=${action}, priceUsed=${usedPrice}. Please sign in Xumm.`,
      payloadUuid: (await subscription).created.uuid,
    });
  } catch (err: any) {
    console.error("Error create-offer:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
