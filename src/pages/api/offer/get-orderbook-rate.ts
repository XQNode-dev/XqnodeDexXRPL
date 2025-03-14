import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '../../../../lib/firebaseAdmin'

interface OrderbookRequestBody {
  pairId: string;
  takerGetsValue: number;
}

interface OrderbookRateResponse {
  success: boolean;
  message: string;
  estimatedValue: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderbookRateResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const { pairId, takerGetsValue } = req.body as OrderbookRequestBody;
    if (!pairId || !takerGetsValue || takerGetsValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid input parameters",
        estimatedValue: "0"
      });
    }

    // Ambil data pair dari Firestore (sesuai dengan API get-pool Anda)
    const pairDoc = await adminDb.collection("pairs").doc(String(pairId)).get();
    if (!pairDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Pair tidak ditemukan.",
        estimatedValue: "0"
      });
    }

    const pairData = pairDoc.data();
    if (!pairData || !pairData.baseToken || !pairData.quoteToken) {
      return res.status(400).json({
        success: false,
        message: "Data pair tidak lengkap.",
        estimatedValue: "0"
      });
    }

    // Asumsikan: 
    // - baseToken adalah token issued, misalnya "XQN" dengan issuer dari field baseIssuer.
    // - quoteToken adalah XRP.
    // Jika pair MAG/XRP atau XQN/XRP, maka:
    //   * Jika user ingin swap dari XRP ke XQN: 
    //       - taker_gets = "XRP"
    //       - taker_pays = { currency: "XQN", issuer: <baseIssuer> }
    //   * Jika sebaliknya, sesuaikan logikanya.
    const baseToken = String(pairData.baseToken).trim().toUpperCase();
    const baseIssuer = baseToken === "XRP" ? null : (pairData.baseIssuer ? String(pairData.baseIssuer).trim() : null);
    const quoteToken = String(pairData.quoteToken).trim().toUpperCase();
    // Untuk XRP, issuer tidak diperlukan
    const quoteIssuer = quoteToken === "XRP" ? null : null;
    
    // Di sini, contoh logika: swap dari XRP ke token issued (baseToken)
    const taker_gets = quoteToken === "XRP" ? "XRP" : { currency: quoteToken, issuer: quoteIssuer };
    const taker_pays = baseToken === "XRP" ? "XRP" : { currency: baseToken, issuer: baseIssuer };

    // Pastikan jika non-XRP, issuer sudah ada
    if (baseToken !== "XRP" && !baseIssuer) {
      return res.status(400).json({
        success: false,
        message: "Issuer untuk baseToken tidak ditemukan.",
        estimatedValue: "0"
      });
    }

    // Buat payload untuk memanggil perintah book_offers di rippled.
    // Penting: sertakan properti "ledger_index": "current" agar clio server mengembalikan data validated.
    const payload = {
      method: "book_offers",
      params: [
        {
          ledger_index: "current",
          taker_gets,
          taker_pays,
        }
      ]
    };

    console.log("Payload ke rippled:", JSON.stringify(payload, null, 2));
    
    const response = await fetch("https://s1.ripple.com:51234", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log("Response dari rippled:", JSON.stringify(result, null, 2));

    if (!result.result || !result.result.offers || result.result.offers.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No offers in orderbook",
        estimatedValue: "0"
      });
    }

    // Ambil offer terbaik (misalnya, offer pertama)
    const bestOffer = result.result.offers[0];

    let offerTakerGetsValue: number;
    let offerTakerPaysValue: number;

    if (typeof bestOffer.TakerGets === "string") {
      offerTakerGetsValue = parseFloat(bestOffer.TakerGets) / 1e6;
    } else {
      offerTakerGetsValue = parseFloat(bestOffer.TakerGets.value);
    }

    if (typeof bestOffer.TakerPays === "string") {
      offerTakerPaysValue = parseFloat(bestOffer.TakerPays) / 1e6;
    } else {
      offerTakerPaysValue = parseFloat(bestOffer.TakerPays.value);
    }

    const rate = offerTakerPaysValue / offerTakerGetsValue;
    const estimatedValue = (takerGetsValue * rate).toFixed(8);

    return res.status(200).json({
      success: true,
      message: "Estimated value calculated successfully.",
      estimatedValue,
    });
  } catch (err: any) {
    console.error("Error in get-orderbook-rate:", err);
    return res.status(500).json({ success: false, message: err.message, estimatedValue: "0" });
  }
}
