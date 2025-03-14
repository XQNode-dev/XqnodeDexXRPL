// File: /api/amm/deposit.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { XummSdk } from 'xumm-sdk';

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
);

interface DepositRequestBody {
  baseIssuer: string;
  baseToken: string;
  userAddress: string;
  amountA: number | string;
  amountB: number | string;
}

function isoToHex(iso: string): string {
  let hex = '';
  for (let i = 0; i < iso.length; i++) {
    hex += iso.charCodeAt(i).toString(16);
  }
  return hex.padEnd(40, '0').toUpperCase();
}

function convertCurrency(currency: string): string {
  if (currency === 'XRP') return currency;
  return currency.length === 3 ? currency : isoToHex(currency);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed.' });
  }
  try {
    const { baseIssuer, baseToken, userAddress, amountA, amountB } =
      req.body as DepositRequestBody;

    if (!baseIssuer || !userAddress || amountA === undefined ||
        amountB === undefined || !baseToken) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields.' });
    }

    // Konversi baseToken jika diperlukan
    const token = convertCurrency(baseToken.toUpperCase());

    // Siapkan data tx AMMDeposit
    const Asset = { currency: token, issuer: baseIssuer };
    const Amount = { currency: token, issuer: baseIssuer, value: amountA.toString() };

    // Konversi XRP ke drops
    const numericAmountB = parseFloat(amountB.toString());
    if (isNaN(numericAmountB) || numericAmountB <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid XRP amount.' });
    }
    const Amount2 = (numericAmountB * 1e6).toFixed(0);
    const Asset2 = { currency: "XRP" };

    const tx = {
      TransactionType: "AMMDeposit",
      Account: userAddress,
      Asset,
      Amount,
      Asset2,
      Amount2,
      Fee: "10",
      Flags: 1048576
    };

    const result: any = await xumm.payload.create({ txjson: tx } as any, true);

    const payloadUuid = result?.created?.uuid || result?.uuid;
    if (!payloadUuid) {
      return res.status(400).json({
        success: false,
        message: 'Payload creation failed. Check deposit transaction format.'
      });
    }

    return res.status(200).json({ success: true, payloadUuid });
  } catch (err: any) {
    console.error("Error in deposit endpoint:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
