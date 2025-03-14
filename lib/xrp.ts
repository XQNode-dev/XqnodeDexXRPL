import { XummSdk } from "xumm-sdk";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
);

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

export async function issueToken({
  tokenName,
  tokenSymbol,
  totalSupply,
}: {
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
}): Promise<{
  success: boolean;
  payloadUuid?: string;
  issuerAddress?: string;
  issuedToken?: string;
}> {
  try {
    const issuerAddress = process.env.ISSUER_ADDRESS as string;
    const distributionAddress = process.env.DISTRIBUTION_ADDRESS as string;
    if (!issuerAddress || !distributionAddress) {
      throw new Error("Missing ISSUER_ADDRESS or DISTRIBUTION_ADDRESS in env");
    }
    const token = convertCurrency(tokenSymbol.toUpperCase());
    const tx = {
      TransactionType: "Payment",
      Account: issuerAddress,
      Destination: distributionAddress,
      Amount: {
        currency: token,
        issuer: issuerAddress,
        value: totalSupply.toString(),
      },
      Fee: "12",
      Flags: 0,
      Memos: [
        {
          Memo: {
            MemoData: Buffer.from(`Issue ${tokenName}`).toString("hex"),
          },
        },
      ],
    };

    const result: any = await xumm.payload.create({ txjson: tx } as any, true);
    const payloadUuid = result?.created?.uuid || result?.uuid;
    if (!payloadUuid) {
      return { success: false };
    }
    return { success: true, payloadUuid, issuerAddress, issuedToken: tokenSymbol };
  } catch (error: any) {
    console.error("Error in issueToken:", error);
    return { success: false };
  }
}
