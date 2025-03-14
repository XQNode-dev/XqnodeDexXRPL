// File: /pages/docs.tsx

import React from "react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 p-6">
      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-6">
        Launchpad Documentation
      </h1>

      {/* 1) INTRO */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">1. Introduction</h2>
        <p className="text-gray-300 leading-relaxed">
          Welcome to the <strong>XQNode Launchpad</strong>, a crowdfunding platform built on the 
          <em> XRP Ledger</em> (XRPL) with an optional escrow feature. Using this Launchpad, project 
          owners (developers) can:
        </p>
        <ul className="list-disc list-inside ml-4 text-gray-300 my-2 space-y-2">
          <li>Submit a campaign to raise funds (crowdsale).</li>
          <li>Showcase token details, lock periods, and optionally specify an <em>escrow wallet</em> 
              to enhance trust for investors.</li>
          <li>Distribute tokens transparently, while letting investors track project progress 
              via displayed softcap/hardcap information.</li>
        </ul>
        <p className="text-gray-300 leading-relaxed">
          By leveraging XRPL’s fast settlement and minimal fees, 
          <strong> XQNode Launchpad</strong> is designed for ease of use for both developers 
          and investors—without sacrificing flexibility, such as an optional escrow component.
          Let’s walk through how it all works!
        </p>
      </section>

      {/* 2) LAUNCHPAD FLOW */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">2. Launchpad Flow Overview</h2>
        <ol className="list-decimal list-inside ml-4 space-y-2 text-gray-300 leading-relaxed">
          <li>
            <strong>Submit Campaign Form:</strong> 
            The project owner (developer) fills out a form containing token data, lock durations, 
            an optional <em>escrow wallet</em>, etc.
          </li>
          <li>
            <strong>Pay Listing Fee:</strong> 
            A fixed listing fee (e.g., 10 XRP) must be signed via Xumm. 
            If canceled or rejected, the campaign remains invalid.
          </li>
          <li>
            <strong>Pending → Processing:</strong> 
            Once the fee is paid, the system or an admin verifies the campaign. 
            The status changes from <em>pending</em> to <em>processing</em>.
          </li>
          <li>
            <strong>Listed &amp; Visible:</strong> 
            After final review, your campaign becomes <em>listed</em> (public). 
            Investors can now see and participate.
          </li>
        </ol>
      </section>

      {/* 3) CREATING A CAMPAIGN */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">3. Creating a Campaign</h2>
        <ol className="list-decimal list-inside ml-4 space-y-3 text-gray-300 leading-relaxed">
          <li>
            <strong>Complete the Campaign Form:</strong> 
            You will provide the following details, among others:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>
                <strong>Token Info:</strong> name, symbol, total supply, and the sale price 
                (in XRP) per token.
              </li>
              <li>
                <strong>Developer Wallet:</strong> 
                Your primary XRPL address. This wallet is crucial for:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Receiving investor funds if no escrow is used.</li>
                  <li>Holding the developer’s share of tokens (developer allocation).</li>
                </ul>
                Make sure to provide the correct wallet address for smooth fund and token flow.
              </li>
              <li>
                <strong>Escrow Wallet (Optional):</strong> 
                If you wish to lock investor XRP in a separate XRPL escrow, specify that wallet 
                here. If left blank, we label your campaign “No Escrow.”
              </li>
              <li>
                <strong>Allocations &amp; Locks:</strong> 
                For example, the percentages reserved for liquidity or airdrops, 
                any investor/developer lock periods, softcap/hardcap amounts, and so forth.
              </li>
            </ul>
          </li>
          <li>
            <strong>Pay the Listing Fee via Xumm:</strong> 
            Our platform will create a <code>Payment payload</code> directed at your developer wallet. 
            Sign it in Xumm to confirm the listing fee payment.
          </li>
          <li>
            <strong>Campaign Status Flow:</strong> 
            <code>pending</code> (unpaid) → 
            <code>processing</code> (paid, under review) → 
            <code>listed</code> (public).
          </li>
        </ol>
      </section>

      {/* 4) OPTIONAL ESCROW */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">4. Escrow (Optional)</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          If you choose to add an <strong>escrow wallet</strong>, here’s what you should know:
        </p>
        <ul className="list-disc list-inside ml-4 text-gray-300 space-y-2">
          <li>
            <strong>Escrow Setup:</strong> 
            You create a separate XRPL account configured with 
            <em>FinishAfter</em> or <em>crypto-conditions</em>. Investor funds remain locked until 
            conditions/time are met.
          </li>
          <li>
            <strong>Finishing the Escrow:</strong> 
            Once the sale ends, you can “finish” the escrow to release the funds to 
            your developer wallet. If the softcap isn’t met, you may cancel or partially refund 
            as promised in your campaign.
          </li>
          <li>
            <strong>No Escrow Case:</strong> 
            If you do not provide any escrow wallet, investor XRP goes directly to the 
            <em> developer wallet</em>. The campaign will be labeled “No Escrow,” letting 
            investors know their funds are not locked.
          </li>
        </ul>
      </section>

      {/* 5) SOFTCAP & HARDCAP */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">5. Softcap &amp; Hardcap</h2>
        <p className="text-gray-300 leading-relaxed">
          The <strong>softcap</strong> is the minimum amount needed for your project 
          to proceed, while the <strong>hardcap</strong> is the maximum you’re willing to accept. 
          If the softcap isn’t reached by the campaign’s end, you may refund contributors 
          or enact your fallback plan. Once the hardcap is hit, the sale typically ends early, 
          preventing further contributions.
        </p>
      </section>

      {/* 6) DISTRIBUTION & LOCKS */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">6. Token Distribution &amp; Locks</h2>
        <p className="text-gray-300 leading-relaxed mb-2">
          After the sale concludes, you’ll distribute tokens to participants. Any lock durations 
          for investors and/or developers are primarily for transparency. Key points:
        </p>
        <ul className="list-disc list-inside ml-4 text-gray-300 space-y-2">
          <li>
            <strong>Investor Lock:</strong> 
            The XRPL doesn’t currently offer a simple native escrow for issued tokens (IOUs) 
            like it does for XRP. You may use external lockers or multi-sign. 
            The Launchpad simply displays the “Investor Lock Duration” you declare.
          </li>
          <li>
            <strong>Developer Allocation &amp; Lock:</strong> 
            You can reserve a percentage of tokens for yourself or your team. 
            Locking them typically requires external or multi-sign solutions, 
            so we only show the lock duration info for transparency.
          </li>
          <li>
            <strong>Liquidity Allocation:</strong> 
            Once your campaign ends, you may supply liquidity to an AMM (XRPL AMM, DEX pool, etc.) 
            using the percentage designated by your <code>liquidityAllocation</code>. 
            This helps assure investors that you plan to support market depth.
          </li>
        </ul>
      </section>

      {/* 7) PARTICIPATE & RAISED */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">7. Participate &amp; “raisedAmount”</h2>
        <p className="text-gray-300 leading-relaxed">
          Investors participate by sending XRP to the campaign address (either the escrow wallet 
          or directly to your developer wallet). The Launchpad increments 
          <code className="bg-gray-800 px-1 py-0.5 rounded">raisedAmount</code> 
          to show progress toward the softcap/hardcap. Actual fund handling (refunds, locks, etc.) 
          remains your responsibility, aided by XRPL’s escrow if you’ve chosen to use it.
        </p>
      </section>

      {/* 8) ADVANTAGES */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">8. Advantages</h2>
        <ul className="list-disc list-inside ml-4 text-gray-300 space-y-2">
          <li>
            <strong>Flexible (Optional) Escrow:</strong> 
            You can demonstrate locked investor funds if you wish, or skip the escrow 
            if you prefer a simpler process. Campaigns without escrow are simply labeled “No Escrow.”
          </li>
          <li>
            <strong>Low Fees &amp; Fast Settlement:</strong> 
            XRPL transaction costs are a fraction of a cent, and confirmations happen within seconds.
          </li>
          <li>
            <strong>Transparent Tokenomics:</strong> 
            Investors can see your developer allocation, lock durations, 
            and liquidity plans. Though XRPL doesn’t automate all IOU locks, 
            providing that information fosters trust.
          </li>
        </ul>
      </section>

      {/* 9) FAQ */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">9. FAQ</h2>
        <div className="space-y-4 text-gray-300">
          <div>
            <p className="font-semibold">
              Q: Is an Escrow wallet mandatory?
            </p>
            <p>
              A: No. It’s completely optional. If you omit it, investor XRP flows directly 
              to your <em>developer wallet</em>. Your campaign is marked “No Escrow.”
            </p>
          </div>
          <div>
            <p className="font-semibold">
              Q: How do I set up XRPL Escrow if I choose to use it?
            </p>
            <p>
              A: You create a new XRPL address, then set <code>FinishAfter</code> 
              or <em>crypto-conditions</em> to lock funds until a certain time/condition. 
              Provide that escrow wallet address in the form. We simply display it 
              for investors to deposit.
            </p>
          </div>
          <div>
            <p className="font-semibold">
              Q: What is the purpose of the Developer Wallet besides receiving funds?
            </p>
            <p>
              A: The <strong>developer wallet</strong> is your primary XRPL address. 
              It can receive investor XRP (if no escrow is used) or hold the developer allocation of tokens. 
              You might also use it for paying the listing fee, airdrops, etc. 
              Always protect its keys and access!
            </p>
          </div>
          <div>
            <p className="font-semibold">
              Q: Can I lock my developer tokens automatically on XRPL?
            </p>
            <p>
              A: Currently, XRPL does not natively support escrow for IOUs (issued tokens) 
              as seamlessly as it does for XRP. Many developers rely on multi-sign 
              or external lock solutions. Our Launchpad only displays the lock duration 
              you specify for transparency.
            </p>
          </div>
        </div>
      </section>

      {/* 10) CONCLUSION */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-2">10. Conclusion</h2>
        <p className="text-gray-300 leading-relaxed">
          <strong>XQNode Launchpad</strong> makes it simple for XRPL projects to raise funds 
          while giving them the option to bolster investor confidence via escrow. 
          At the same time, we do not force escrow, so you can keep things lightweight if you prefer. 
          Our platform displays the relevant tokenomics and lock data for transparency, 
          but actual custody and distribution remain in your control. 
          Good luck with your XRPL venture, and thank you for using our platform!
        </p>
      </section>
    </div>
  );
}
