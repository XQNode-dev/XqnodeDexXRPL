import type { NextApiRequest, NextApiResponse } from "next";
import { XummSdk } from "xumm-sdk";

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
);


interface ImmediateSwapRequest {
  userAddress: string;
  destination?: string;
  sourceTag?: number;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed." });
  }
  try {
    const {
      userAddress,
      destination,
      sourceTag,
      currencyOut,
      issuerOut,
      amountOut,
      sendMaxValue,
      sendMaxCurrency,
      sendMaxIssuer,
      partialPayment,
      deliverMin,
      paths: pathsInput,
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
        message: "Missing required fields or invalid types.",
      });
    }

    const MAX_DECIMALS = 8;
    const roundedAmountOut = parseFloat(amountOut.toFixed(MAX_DECIMALS));
    const roundedSendMax = parseFloat(sendMaxValue.toFixed(MAX_DECIMALS));

    if (
      isNaN(roundedAmountOut) ||
      roundedAmountOut <= 0 ||
      isNaN(roundedSendMax) ||
      roundedSendMax <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount values after rounding.",
      });
    }

    const slippageTolerance = 1.2;
    const adjustedSendMax = parseFloat(
      (sendMaxValue * slippageTolerance).toFixed(MAX_DECIMALS)
    );

    const finalDestination = destination || userAddress;

    let destinationAmount: any;
    if (currencyOut.toUpperCase() === "XRP") {
      destinationAmount = Math.floor(roundedAmountOut * 1e6).toString();
    } else {
      if (!issuerOut) {
        return res.status(400).json({
          success: false,
          message: "issuerOut is required for non-XRP tokenOut.",
        });
      }
      destinationAmount = {
        currency: currencyOut.toUpperCase(),
        issuer: issuerOut,
        value: roundedAmountOut.toString(),
      };
    }

    let amountField: any = destinationAmount;

    let sendMaxField: any;
    if (sendMaxCurrency.toUpperCase() === "XRP") {
      sendMaxField = Math.floor(adjustedSendMax * 1e6).toString();
    } else {
      if (!sendMaxIssuer) {
        return res.status(400).json({
          success: false,
          message: "sendMaxIssuer is required for non-XRP tokenIn.",
        });
      }
      sendMaxField = {
        currency: sendMaxCurrency.toUpperCase(),
        issuer: sendMaxIssuer,
        value: adjustedSendMax.toString(),
      };
    }

    let paths = pathsInput;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      const pathfindBody = {
        method: "ripple_path_find",
        params: [
          {
            source_account: userAddress,
            destination_account: finalDestination,
            destination_amount: destinationAmount,
            source_currencies: [{ currency: sendMaxCurrency.toUpperCase() }],
          },
        ],
      };

      try {
        const pathResp = await fetch("https://s1.ripple.com:51234", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pathfindBody),
        });
        const pathJson = await pathResp.json();
        if (
          pathJson.result &&
          pathJson.result.alternatives &&
          pathJson.result.alternatives.length > 0
        ) {
          const alt = pathJson.result.alternatives[0];
          if (alt.paths_computed && alt.paths_computed.length > 0) {
            paths = alt.paths_computed;
          }
        }
      } catch (e) {
        console.error("Pathfinding error:", e);
      }
    }

    const tx: any = {
      TransactionType: "Payment",
      Account: userAddress,
      Destination: finalDestination,
      Amount: amountField,
      SendMax: sendMaxField,
      Flags: 131072, // tfPartialPayment
    };

    if (sourceTag !== undefined) {
      tx.SourceTag = sourceTag;
    }

    if (deliverMin && deliverMin > 0) {
      const roundedDeliverMin = parseFloat(deliverMin.toFixed(MAX_DECIMALS));
      if (currencyOut.toUpperCase() === "XRP") {
        tx.DeliverMin = Math.floor(roundedDeliverMin * 1e6).toString();
      } else {
        if (!issuerOut) {
          return res.status(400).json({
            success: false,
            message: "issuerOut required for DeliverMin if tokenOut is non-XRP.",
          });
        }
        tx.DeliverMin = {
          currency: currencyOut.toUpperCase(),
          issuer: issuerOut,
          value: roundedDeliverMin.toString(),
        };
      }
    }

    if (paths && Array.isArray(paths) && paths.length > 0) {
      tx.Paths = paths;
    }

    console.log("ImmediateSwap Payment TX:", JSON.stringify(tx, null, 2));

    const result = await xumm.payload.create(tx, true);
    if (!result || !result.uuid) {
      return res.status(400).json({
        success: false,
        message: "Payload creation failed.",
      });
    }
    return res.status(200).json({
      success: true,
      payloadUuid: result.uuid,
    });
  } catch (err: any) {
    console.error("Error in immediate-swap endpoint:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
