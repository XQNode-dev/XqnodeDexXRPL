// src/pages/api/dex/get-order-book.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { Client } from "xrpl";  

// ----- Types -----
interface Offer {
  offerId: string;
  pairId: string;
  action: "buy" | "sell";
  amount: string;
  price: string;
  userAddress: string;
  status: "open" | "filled" | "cancelled";
}
interface OrderBookResponse {
  success: boolean;
  bids?: Offer[];
  asks?: Offer[];
  currentPrice?: string;
  message?: string;
}
interface Pair {
  id: string;
  baseToken: string;
  quoteToken: string;
  baseIssuer: string;
  createdBy: string;
  status: string;
  createdAt: { _seconds: number; _nanoseconds: number };
}

// 1) Helper: encode ASCII => 40-hex
function encodeCurrencyAscii(ascii: string) {
  const maxBytes = 20;
  const buf = new Uint8Array(maxBytes);
  const asciiBytes = [...ascii].map((c) => c.charCodeAt(0));
  for (let i = 0; i < maxBytes; i++) {
    buf[i] = asciiBytes[i] ?? 0;
  }
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// 2) Helper: construct XRPL currency param
function constructCurrency(token: string, issuer?: string) {
  if (token === "XRP") return { currency: "XRP" };

  if (token.length <= 3) {
    // user wants 3-ltr code
    return { currency: token.toUpperCase(), issuer };
  }

  // If already 40-hex => pass
  if (/^[A-Fa-f0-9]{40}$/.test(token)) {
    return { currency: token.toUpperCase(), issuer };
  }

  // Else => encode ASCII => 40-hex
  const hex = encodeCurrencyAscii(token);
  return { currency: hex, issuer };
}

// 3) formatNumber => normal / scientific
function formatNumber(val: number): string {
  if (!Number.isFinite(val)) return "";
  const abs = Math.abs(val);
  if (abs >= 1e9 || (abs > 0 && abs < 1e-8)) {
    return val.toExponential(4);
  }
  return val.toFixed(8);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderBookResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const { pairId } = req.query;
  if (!pairId || typeof pairId !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "pairId must be a valid string" });
  }

  try {
    // A) Fetch pair data
    const pairDoc = await adminDb.collection("pairs").doc(pairId).get();
    if (!pairDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Pair not found" });
    }
    const pairData = pairDoc.data() as Pair;

    // B) Connect XRPL
    const client = new Client("wss://s1.ripple.com", {
      connectionTimeout: 10000,
    }); // <-- Gunakan Client dari named import
    await client.connect();

    // C) Build "book_offers" requests => cast 'as any'
    const reqA = {
      command: "book_offers",
      ledger_index: "validated",
      taker_gets: constructCurrency(
        pairData.quoteToken,
        pairData.quoteToken !== "XRP" ? pairData.baseIssuer : undefined
      ),
      taker_pays: constructCurrency(
        pairData.baseToken,
        pairData.baseToken !== "XRP" ? pairData.baseIssuer : undefined
      ),
      limit: 50,
    } as any;

    const reqB = {
      command: "book_offers",
      ledger_index: "validated",
      taker_gets: constructCurrency(
        pairData.baseToken,
        pairData.baseToken !== "XRP" ? pairData.baseIssuer : undefined
      ),
      taker_pays: constructCurrency(
        pairData.quoteToken,
        pairData.quoteToken !== "XRP" ? pairData.baseIssuer : undefined
      ),
      limit: 50,
    } as any;

    const [respA, respB] = await Promise.all([
      client.request(reqA as any),
      client.request(reqB as any),
    ]);
    await client.disconnect();

    // E) Combine raw offers => cast 'as any'
    const rawOffers: any[] = [
      ...((respA as any).result?.offers || []),
      ...((respB as any).result?.offers || []),
    ];

    const bids: Offer[] = [];
    const asks: Offer[] = [];

    function parseOffer(off: any): Offer | null {
      try {
        const tpVal =
          typeof off.TakerPays === "string"
            ? parseFloat(off.TakerPays) / 1e6
            : parseFloat(off.TakerPays.value || "0");
        const tgVal =
          typeof off.TakerGets === "string"
            ? parseFloat(off.TakerGets) / 1e6
            : parseFloat(off.TakerGets.value || "0");

        if (!Number.isFinite(tpVal) || !Number.isFinite(tgVal)) {
          return null;
        }

        // if TakerPays bigger => "sell"
        const action: "buy" | "sell" = tpVal > tgVal ? "sell" : "buy";
        const rawPrice =
          action === "buy" ? tpVal / tgVal : tgVal / tpVal;

        if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
          return null;
        }

        const rawAmount = action === "buy" ? tgVal : tpVal;

        return {
          offerId: off.Sequence?.toString() || "unknown",
          pairId: pairId as string,
          action,
          price: formatNumber(rawPrice),
          amount: formatNumber(rawAmount),
          userAddress: off.Account,
          status: "open",
        };
      } catch (e) {
        console.error("Error parsing offer:", e);
        return null;
      }
    }

    for (const off of rawOffers) {
      const parsed = parseOffer(off);
      if (parsed) {
        if (parsed.action === "buy") bids.push(parsed);
        else asks.push(parsed);
      }
    }

    // F) sort => bids desc, asks asc
    bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    // G) current price => midpoint
    let currentPrice = "N/A";
    if (bids.length > 0 && asks.length > 0) {
      const bestBid = parseFloat(bids[0].price);
      const bestAsk = parseFloat(asks[0].price);
      currentPrice = formatNumber((bestBid + bestAsk) / 2);
    } else if (bids.length > 0) {
      currentPrice = bids[0].price;
    } else if (asks.length > 0) {
      currentPrice = asks[0].price;
    }

    return res.status(200).json({
      success: true,
      bids,
      asks,
      currentPrice,
    });
  } catch (err: any) {
    console.error("Error fetching order book:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
