import React from "react";
import Link from "next/link";

const Custom404 = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-lg">Not Found</p>
      <Link href="/" className="mt-6 px-6 py-3 bg-cyan-500 rounded-md">
        Back To Home
      </Link>
    </div>
  );
};

export default Custom404;
