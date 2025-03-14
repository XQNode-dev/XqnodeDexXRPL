// File: /api/amm/withdraw.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { XummSdk } from 'xumm-sdk'

const xumm = new XummSdk(
  process.env.XUMM_API_KEY as string,
  process.env.XUMM_API_SECRET as string
)

interface WithdrawRequestBody {
  baseIssuer: string      
  baseToken: string       
  userAddress: string
  withdrawBase: number | string  
  withdrawQuote: number | string 
  pairId?: string         
}

function isoToHex(iso: string): string {
  let hex = ''
  for (let i = 0; i < iso.length; i++) {
    hex += iso.charCodeAt(i).toString(16)
  }
  return hex.padEnd(40, '0').toUpperCase()
}

function convertCurrency(currency: string): string {
  if (currency === 'XRP') return currency
  return currency.length === 3 ? currency : isoToHex(currency)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed.' })
  }

  try {
    const {
      baseIssuer,
      baseToken,
      userAddress,
      withdrawBase,
      withdrawQuote
    } = req.body as WithdrawRequestBody

    console.log('Received withdraw request:', req.body)

    if (
      !baseIssuer ||
      !baseToken ||
      !userAddress ||
      withdrawBase === undefined ||
      withdrawQuote === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields.'
      })
    }

    const token = convertCurrency(baseToken.toUpperCase())

    const tx = {
      TransactionType: 'AMMWithdraw',
      Account: userAddress,
      Asset: {
        currency: token,
        issuer: baseIssuer
      },
      Amount: {
        currency: token,
        issuer: baseIssuer,
        value: withdrawBase.toString()
      },
      Asset2: { currency: 'XRP' },
      Amount2: withdrawQuote.toString(),
      Fee: '10',
      Flags: 1048576
    }

    console.log('Withdraw payload:', JSON.stringify(tx, null, 2))

    const result: any = await xumm.payload.create({ txjson: tx } as any, true)

    console.log('Xumm withdraw payload result:', result)
    const payloadUuid = result?.created?.uuid || result?.uuid

    if (!payloadUuid) {
      return res.status(400).json({
        success: false,
        message:
          'Payload creation failed. Check withdraw transaction format.'
      })
    }

    return res.status(200).json({
      success: true,
      payloadUuid
    })
  } catch (err: any) {
    console.error('Error in withdraw endpoint:', err)
    return res.status(500).json({
      success: false,
      message: err.message
    })
  }
}
