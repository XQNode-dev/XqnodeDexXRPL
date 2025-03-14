// file: /pages/api/dex/init-pool.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "xrpl";
import { adminDb } from "../../../../lib/firebaseAdmin";

interface InitPoolResponse {
  success: boolean;
  message: string;
  docId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InitPoolResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed." });
  }

  const { token, issuer, quote } = req.query;
  if (!token || !quote) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'token' dan 'quote' harus disediakan.",
    });
  }

  try {
    const baseToken = String(token).toUpperCase();
    const baseIssuer = issuer ? String(issuer) : null;
    const quoteToken = String(quote).toUpperCase();

    if (baseToken !== "XRP" && !baseIssuer) {
      return res.status(400).json({
        success: false,
        message: "Jika baseToken bukan XRP, issuer harus disediakan.",
      });
    }

    const client = new Client("wss://xrplcluster.com/");
    await client.connect();

    const assetObj: any = { currency: baseToken };
    if (baseToken !== "XRP") {
      assetObj.issuer = baseIssuer;
    }
    const asset2Obj: any = { currency: quoteToken };

    const reqAmm: any = {
      command: "amm_info",
      asset: assetObj,
      asset2: asset2Obj,
      ledger_index: "validated",
    };

    // Cast ke `any` untuk mengizinkan properti `.amm`
    const respAmm = await client.request(reqAmm as any);
    const ammInfo = (respAmm.result as any).amm; 
    if (!ammInfo) {
      await client.disconnect();
      return res
        .status(404)
        .json({ success: false, message: "Pool tidak ditemukan di ledger." });
    }

    let amount1 = 0;
    if (ammInfo.amount && typeof ammInfo.amount === "string") {
      amount1 = parseFloat(ammInfo.amount) / 1e6;
    } else if (ammInfo.amount?.value) {
      amount1 = parseFloat(ammInfo.amount.value);
    }

    let amount2 = 0;
    if (ammInfo.amount2 && typeof ammInfo.amount2 === "string") {
      amount2 = parseFloat(ammInfo.amount2) / 1e6;
    } else if (ammInfo.amount2?.value) {
      amount2 = parseFloat(ammInfo.amount2.value);
    }

    let lpSupply = 0;
    if (ammInfo.lp_token?.value) {
      lpSupply = parseFloat(ammInfo.lp_token.value);
    }

    let fee = 0;
    if (ammInfo.trading_fee) {
      fee = Number(ammInfo.trading_fee) / 100000; 
    }

    const tvlXRP = 2 * amount2;

    await client.disconnect();

    const docId = `${baseToken}_${quoteToken}`;
    const poolRef = adminDb.collection("pairs").doc(docId);

    await poolRef.set({
      baseToken,
      baseIssuer,
      quoteToken,
      createdAt: new Date().toISOString(),
      amount1,
      amount2,
      lpSupply,
      fee,
      tvlXRP,
    });

    return res.status(200).json({
      success: true,
      message: "Pool data inisiasi berhasil disimpan ke Firestore.",
      docId,
    });
  } catch (err: any) {
    console.error("Error in init-pool:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message ?? "Internal error" });
  }
}
