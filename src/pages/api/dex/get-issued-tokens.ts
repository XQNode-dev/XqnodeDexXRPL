// src/pages/api/dex/get-issued-tokens.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "xrpl";  // <-- Ganti default import dengan named import 'Client'

interface GetIssuedTokensRequest {
  issuerAddress: string;
}

interface Trustline {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
  ripplingDisabled: boolean;
}

interface GetIssuedTokensResponse {
  success: boolean;
  message: string;
  tokens?: Trustline[];
}


function decodeCurrencyHex(hexStr: string): string {
  const raw = hexStr.slice(0, 40).toUpperCase(); 

  let result = "";
  for (let i = 0; i < raw.length; i += 2) {
    const byteHex = raw.slice(i, i + 2);
    const byteVal = parseInt(byteHex, 16);
    if (byteVal === 0) break;
    if (byteVal >= 32 && byteVal < 127) {
      result += String.fromCharCode(byteVal);
    } else {
      break;
    }
  }

  return result || hexStr;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetIssuedTokensResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const { issuerAddress }: GetIssuedTokensRequest = req.body;
  if (!issuerAddress) {
    return res.status(400).json({
      success: false,
      message: "Issuer address is required",
    });
  }

  try {
    const client = new Client("wss://s1.ripple.com");
    await client.connect();

    const request = {
      command: "account_lines",
      account: issuerAddress,
      ledger_index: "validated",
    } as any;

    const response = await client.request(request as any);
    await client.disconnect();

    const trustlines: Trustline[] = ((response as any).result.lines || []) as Trustline[];

    if (trustlines.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No tokens issued by address ${issuerAddress} found.`,
      });
    }

    trustlines.forEach((line) => {
      const c = line.currency;
      if (c.length === 40 && /^[0-9A-Fa-f]+$/.test(c)) {
        line.currency = decodeCurrencyHex(c);
      }
    });

    return res.status(200).json({
      success: true,
      tokens: trustlines,
      message: "Tokens fetched & decoded (if needed).",
    });
  } catch (error: any) {
    console.error("Error fetching trustlines:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
