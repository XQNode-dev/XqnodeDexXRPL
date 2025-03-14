import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Komponen DeveloperTools (sesuaikan path)

// Particles
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Engine } from "tsparticles-engine";

// Status type
type VerifyStatus = "initial" | "pending" | "success" | "rejected" | "failed";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Xumm states
  const [uuid, setUuid] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [xummLink, setXummLink] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Mencegah flicker
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("initial");

  // Setup Particles
  const particlesInit = async (engine: Engine) => {
    await loadSlim(engine);
    console.log("tsparticles slim loaded");
  };

  const particleOptions = {
    fpsLimit: 60,
    particles: {
      number: { value: 40 },
      size: { value: 3 },
      move: { enable: true, speed: 1 },
      links: {
        enable: true,
        distance: 150,
        color: "#ffffff",
        opacity: 0.4,
        width: 1,
      },
    },
    interactivity: {
      events: {
        onHover: { enable: true, mode: "repulse" },
        onClick: { enable: true, mode: "push" },
      },
      modes: {
        repulse: { distance: 80 },
        push: { quantity: 4 },
      },
    },
  };

  // Handle Login Xumm
  const handleLoginXumm = async () => {
    setLoading(true);
    try {
      // 1) Buat payload di backend
      const resp = await fetch("/api/auth/xumm-login", { method: "POST" });
      const data = await resp.json();

      if (!data.success) {
        toast.error(data.message || "Failed to create Xumm login payload");
        setLoading(false);
        return;
      }

      // Simpan data
      setUuid(data.uuid);
      setQrUrl(data.refs?.qr_png || "");
      setXummLink(data.refs?.open_in_xumm_web || "");

      // Tampilkan modal (QR + tombol)
      setShowModal(true);

      // 2) Polling /api/auth/xumm-verify
      const intervalId = setInterval(async () => {
        try {
          const verifyResp = await fetch("/api/auth/xumm-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid: data.uuid }),
          });
          const verifyData = await verifyResp.json();

          if (verifyData.success) {
            // success
            if (verifyStatus !== "success") {
              clearInterval(intervalId);
              toast.success(`Login Successful: ${verifyData.address}`);

              localStorage.setItem("xummUser", verifyData.address);
              setVerifyStatus("success");
              setShowModal(false);
              router.push("/dex");
            }
          } else if (verifyData.status === "rejected") {
            // reject
            if (verifyStatus !== "rejected") {
              clearInterval(intervalId);
              toast.error("User rejected the login on Xumm");
              setVerifyStatus("rejected");
              setShowModal(false);
            }
          } else if (!verifyData.success && verifyData.status !== "pending") {
            // fail
            if (verifyStatus !== "failed") {
              clearInterval(intervalId);
              toast.error("Login failed or an error occurred");
              setVerifyStatus("failed");
              setShowModal(false);
            }
          } else {
            // pending
            if (verifyStatus !== "pending") {
              setVerifyStatus("pending");
            }
            // continue polling
          }
        } catch (err) {
          clearInterval(intervalId);
          console.error(err);
          toast.error("Error verifying Xumm payload");
          setShowModal(false);
        }
      }, 3000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error logging in with Xumm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* SEO */}
      <Head>
        {/* Verifikasi Google / Tag lain */}
        <meta
          name="google-site-verification"
          content="1UIYNjsnw0nZxvpxJryHB5xLSPWtYtS0FU4fvSTCFs0"
        />

        {/* Title */}
        <title>Create Token on XRP Ledger - XRPLQuantum.com</title>

        {/* Meta Description */}
        <meta
          name="description"
          content="Create your own token on the XRP Ledger with XRPLQuantum.com's Developer Tools. Experience low fees, high speed, built-in DEX, and streamlined tokenization."
        />

        {/* Keywords */}
        <meta
          name="keywords"
          content="XRP Token Creator, Create Token on XRP Ledger, XRPL Token, XRPLQuantum, XRPL Quantum Node, Low Fees, High Speed, DEX, tokenization, DeFi, bridging, dApps, ledger, blockchain"
        />

        {/* Canonical */}
        <link rel="canonical" href="https://xrplquantum.com" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Create Token on XRP Ledger - XRPLQuantum.com"
        />
        <meta
          property="og:description"
          content="Empower your blockchain projects with XRPLQuantum's Developer Tools. Easily create tokens on the XRP Ledger, harness low fees, fast transactions, and advanced tokenization features."
        />
        <meta property="og:url" content="https://xrplquantum.com" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://xrplquantum.com/hero.webp"
        />

        {/* OG Tambahan */}
        <meta property="og:site_name" content="XRPLQuantum.com" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Create Token on XRP Ledger - XRPLQuantum.com"
        />
        <meta
          name="twitter:description"
          content="Empower your blockchain projects with XRPLQuantum's Developer Tools. Easily create tokens on the XRP Ledger, harness low fees, fast transactions, and advanced tokenization features."
        />
        <meta
          name="twitter:image"
          content="https://xrplquantum.com/images/hero.webp"
        />

        {/* Twitter Tambahan */}
        <meta name="twitter:site" content="@xrplquantum" />
        <meta name="twitter:creator" content="@xrplquantum" />

        {/* Structured data JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "XRPLQuantum.com",
            url: "https://xrplquantum.com",
            description:
              "Create your own token on the XRP Ledger with XRPLQuantum.com's Developer Tools. Experience low fees, high speed, built-in DEX, and streamlined tokenization.",
            publisher: {
              "@type": "Organization",
              name: "XRPLQuantum",
            },
            potentialAction: {
              "@type": "SearchAction",
              target: "https://xrplquantum.com/?s={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
      </Head>

      {/* Particles */}
      <div className="absolute inset-0 -z-10">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particleOptions}
        />
      </div>

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-gray-800 shadow-md sticky top-0 z-10 bg-opacity-80">
        <h1 className="text-2xl font-bold text-cyan-400">XQNode</h1>
        <a
          href="https://t.me/XRPLNode_Bot/XRPLNode"
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-full shadow-md hover:shadow-lg hover:from-cyan-400 hover:to-blue-500 transition"
        >
          Launch App
        </a>
      </header>

      {/* Hero */}
      <section className="text-center py-16 bg-gradient-to-b from-gray-900/80 to-gray-800/60 min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-5xl font-extrabold mb-6 text-cyan-200 drop-shadow-lg">
          XRPL Quantum Node
        </h2>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed mb-8 text-gray-300">
          Explore the future of blockchain with XRPL Quantum Node. Built on the
          XRP Ledger, we deliver efficiency, scalability, and advanced
          tokenization solutions globally.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <a
              href="#whitepaper"
              className="px-6 py-3 bg-cyan-500 text-lg font-semibold text-white rounded-md shadow-md hover:bg-cyan-600 transition"
            >
              Learn More
            </a>
            <button
              onClick={handleLoginXumm}
              className="px-6 py-3 bg-pink-600 text-lg font-semibold text-white rounded-md shadow-md hover:bg-pink-700 transition"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login with Xumm"}
            </button>
          </div>

          {/* Dex Beta Info Box */}
          <div className="mt-8 w-full max-w-2xl p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg animate-pulse">
            <h3 className="text-2xl font-bold mb-2">🚀 XQNode Dex Beta Launched!</h3>
            <p className="text-md">
              We are thrilled to announce the official launch of{" "}
              <strong>XQNode Dex Beta</strong> on mainnet! Our Dex leverages the speed
              and security of the XRP Ledger, enabling decentralized trading of tokens
              with minimal fees. Currently, some features are placeholders, but we
              are actively developing and iterating to bring you a fully functional,
              seamless DeFi experience. Please proceed with caution as it is still
              in the testing phase, and we welcome community feedback!
            </p>

            {/* Bagian tombol yang di-center dan disesuaikan untuk mobile */}
            <div className="mt-4 flex flex-col items-center sm:flex-row sm:justify-center gap-4 sm:gap-6">
              <button
                onClick={handleLoginXumm}
                className="w-full sm:w-auto px-4 py-2 text-base bg-white text-pink-600 font-semibold rounded shadow hover:bg-gray-100 transition"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Try XQNode Dex Beta"}
              </button>

              <a
                href="https://autotrade.xrplquantum.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 text-base bg-white text-pink-600 font-semibold rounded shadow hover:bg-gray-100 transition text-center"
              >
                XQNODE AUTO TRADE
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DeveloperTools */}
      {/* <DeveloperTools /> */}

      {/* Key Features */}
      <section className="py-16 key-features-section relative animate-fade">
        <h3 className="text-4xl font-extrabold text-center text-cyan-400 mb-12">
          Key Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-6">
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow hover:shadow-lg transition">
            <h4 className="text-2xl font-semibold text-cyan-400 mb-3">Low Fees</h4>
            <p className="text-gray-300">Benefit from XRPL's minimal transaction costs.</p>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow hover:shadow-lg transition">
            <h4 className="text-2xl font-semibold text-cyan-400 mb-3">High Speed</h4>
            <p className="text-gray-300">Transactions settle in just 3-5 seconds.</p>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow hover:shadow-lg transition">
            <h4 className="text-2xl font-semibold text-cyan-400 mb-3">
              Decentralized Exchange
            </h4>
            <p className="text-gray-300">
              Seamlessly trade tokens on XRPL’s built-in DEX.
            </p>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow hover:shadow-lg transition">
            <h4 className="text-2xl font-semibold text-cyan-400 mb-3">Scalability</h4>
            <p className="text-gray-300">Support thousands of TPS, powering global adoption.</p>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section
        id="roadmap"
        className="py-16 bg-gradient-to-b from-gray-800 to-gray-900 animate-fade"
      >
        <h3 className="text-4xl font-extrabold text-center text-cyan-400 mb-12">
          Roadmap
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 px-6">
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow">
            <h4 className="text-2xl font-bold text-cyan-400">
              Phase 1: Foundation (Q1-Q2 2025)
            </h4>
            <p className="text-gray-300 mt-2">
              Launch XQNode website, deploy XQN tokens, hold public token sale & airdrop.
            </p>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow">
            <h4 className="text-2xl font-bold text-cyan-400">
              Phase 2: Ecosystem Development (Q3-Q4 2025)
            </h4>
            <p className="text-gray-300 mt-2">
              Introduce staking, governance, and advanced tokenization tools for XRPL devs.
            </p>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow">
            <h4 className="text-2xl font-bold text-cyan-400">Phase 3: Expansion (2026)</h4>
            <p className="text-gray-300 mt-2">
              Develop modular dApps for finance, gaming, supply chain. Launch cross-chain
              bridges to Ethereum.
            </p>
          </div>
          <div className="p-4 bg-gray-800 bg-opacity-80 rounded shadow">
            <h4 className="text-2xl font-bold text-cyan-400">Phase 4: Adoption (2027+)</h4>
            <p className="text-gray-300 mt-2">
              Partner with businesses, expand global reach, and foster community-driven
              innovation.
            </p>
          </div>
        </div>
      </section>

      {/* Whitepaper */}
      <section
        id="whitepaper"
        className="py-16 bg-gradient-to-b from-gray-900 to-gray-800 animate-fade"
      >
        <h3 className="text-4xl font-extrabold text-center text-cyan-400 mb-12">
          Whitepaper
        </h3>
        <p className="max-w-4xl mx-auto text-lg text-center text-gray-300 mb-8">
          Dive into our comprehensive Whitepaper to understand the vision, roadmap, and
          technological innovations behind XRPL Quantum Node.
        </p>
        <div className="flex justify-center">
          <a
            href="https://drive.google.com/file/d/1Z1FP3pv0GxbMmw3fd3a4Quj0IqTxzc-q/view"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-lg font-semibold text-white rounded-full shadow-md hover:shadow-lg hover:from-cyan-400 hover:to-blue-500 transition"
          >
            Download Whitepaper
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-800 text-center animate-fade">
        <p className="text-sm text-gray-400">© 2025 XRPL Quantum Node. All rights reserved.</p>
      </footer>

      {/* Modal QR XUMM */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 
          transition-opacity duration-300 animate-fade"
        >
          <div
            className="bg-gray-800 p-6 rounded-md max-w-md w-full relative 
            animate-scaleIn"
            style={{
              animationFillMode: "forwards",
              animationDuration: "0.3s",
            }}
          >
            <h2 className="text-xl font-bold mb-4 text-cyan-300">Scan with Xumm</h2>

            {qrUrl ? (
              <div className="mb-4 flex justify-center">
                <img
                  src={qrUrl}
                  alt="Xumm QR"
                  className="border-2 border-white rounded"
                />
              </div>
            ) : (
              <p className="text-gray-400 mb-4">
                No QR link found. Please wait or re-try.
              </p>
            )}

            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => {
                  if (xummLink) {
                    window.open(xummLink, "_blank");
                  } else {
                    toast.info("No direct Xumm link provided. Please scan the QR code above.");
                  }
                }}
                className="px-4 py-2 bg-pink-600 text-white rounded-md font-semibold hover:bg-pink-700 transition"
              >
                Open Xumm
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        closeOnClick
        pauseOnHover
      />
    </>
  );
}
