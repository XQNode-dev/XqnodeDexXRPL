// src/pages/_document.tsx

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/png" sizes="32x32" href="/hero.webp" />

        {/* Removed meta viewport and title to adhere to Next.js rules */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <Main />
        <NextScript />
        <div id="modal-root"></div> {/* Elemen root untuk modal */}
      </body>
    </Html>
  );
}
