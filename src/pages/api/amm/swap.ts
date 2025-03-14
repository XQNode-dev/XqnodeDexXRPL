import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";
import { adminDb } from "../../../../lib/firebaseAdmin";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
);


interface ImmediateSwapRequest {
  userAddress: string;
  destination?: string;
  currencyOut: string;
  issuerOut?: string;
  amountOut: number;

  sendMaxValue: number;
  sendMaxCurrency: string;
  sendMaxIssuer?: string;

  partialPayment?: boolean;
  deliverMin?: number;
  paths?: any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  try {
    const {
      userAddress,
      destination,
      currencyOut,
      issuerOut,
      amountOut,
      sendMaxValue,
      sendMaxCurrency,
      sendMaxIssuer,
      partialPayment,
      deliverMin,
      paths
    } = req.body as ImmediateSwapRequest;

    if (
      !userAddress ||
      !currencyOut ||
      typeof amountOut !== "number" ||
      !sendMaxCurrency ||
      typeof sendMaxValue !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields or invalid types."
      });
    }

    if (amountOut <= 0 || sendMaxValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "amountOut / sendMaxValue must be > 0."
      });
    }

    const finalDestination = destination || userAddress;

    let amountField: any;
    if (currencyOut.toUpperCase() === "XRP") {
      const drops = Math.floor(amountOut * 1e6);
      amountField = drops.toString();
    } else {
      if (!issuerOut) {
        return res.status(400).json({
          success: false,
          message: "issuerOut is required for non-XRP tokenOut."
        });
      }
      amountField = {
        currency: currencyOut.toUpperCase(),
        issuer: issuerOut,
        value: amountOut.toString()
      };
    }

    let sendMaxField: any;
    if (sendMaxCurrency.toUpperCase() === "XRP") {
      const drops = Math.floor(sendMaxValue * 1e6);
      sendMaxField = drops.toString();
    } else {
      if (!sendMaxIssuer) {
        return res.status(400).json({
          success: false,
          message: "sendMaxIssuer is required for non-XRP tokenIn."
        });
      }
      sendMaxField = {
        currency: sendMaxCurrency.toUpperCase(),
        issuer: sendMaxIssuer,
        value: sendMaxValue.toString()
      };
    }

    // Compose Payment TX
    const tx: any = {
      TransactionType: "Payment",
      Account: userAddress,
      Destination: finalDestination,
      Amount: amountField,
      SendMax: sendMaxField
    };

    let flags = 0;
    if (partialPayment) {
      flags |= 0x00020000;
    }
    if (flags !== 0) {
      tx.Flags = flags;
    }

    // Opsional: deliverMin
    if (deliverMin && deliverMin > 0) {
      if (currencyOut.toUpperCase() === "XRP") {
        tx.DeliverMin = Math.floor(deliverMin * 1e6).toString();
      } else {
        if (!issuerOut) {
          return res.status(400).json({
            success: false,
            message: "issuerOut required for DeliverMin if tokenOut is non-XRP."
          });
        }
        tx.DeliverMin = {
          currency: currencyOut.toUpperCase(),
          issuer: issuerOut,
          value: deliverMin.toString()
        };
      }
    }

    if (paths && Array.isArray(paths)) {
      tx.Paths = paths;
    }

    console.log("ImmediateSwap Payment TX:", JSON.stringify(tx, null, 2));

    const result = await xumm.payload.create(tx, true);
    if (!result || !result.uuid) {
      console.error("XUMM payload creation failed:", result);
      return res.status(400).json({
        success: false,
        message: "Payload creation failed."
      });
    }

    return res.status(200).json({
      success: true,
      payloadUuid: result.uuid
    });

  } catch (err: any) {
    console.error("Error in immediate-swap endpoint:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}
