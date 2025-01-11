import Head from 'next/head';
import Script from 'next/script'; // For embedding custom scripts if needed

export default function HomePage() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Discover random fun websites and mini-games. A curated collection of interactive experiences, games, tools and more." />
        <meta name="keywords" content="random websites, mini games, web toys, interactive experiences" />
        <meta name="author" content="Random Sites" />
        {/* Open Graph, Twitter, and other meta tags */}
        <title>Random Sites On The Web - Discover Fun Random Websites</title>
        {/* Favicon and stylesheet links */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      </Head>
      
      {/* Main content goes here */}
      <main>
        <div className="container mx-auto p-4">
          <i className="fas fa-compass animate-spin text-4xl"></i>
          <h2 className="text-2xl font-bold">Random Sites On the Web <span className="text-blue-500">.com</span></h2>
          <h1 className="text-3xl font-extrabold">Discover Fun Random Websites!</h1>
          <p className="description mt-4">
            Take a chance with our random site generator or browse our full collection of over
            <span className="font-semibold">50</span> interactive experiences!
          </p>
          <div className="button-group mt-6 flex space-x-4">
            <button className="primary-button bg-blue-500 text-white py-2 px-4 rounded">
              <i className="fas fa-random"></i>
              Surprise Me!
            </button>
            <a href="/sites/index.html" className="secondary-button bg-gray-200 text-gray-800 py-2 px-4 rounded">
              <i className="fas fa-sitemap"></i>
              Browse All Sites
            </a>
          </div>
          <a href="https://www.instagram.com/randomsitesontheweb" target="_blank" className="social-link mt-4 inline-block text-blue-500">
            <i className="fab fa-instagram"></i>
            Follow @randomsitesontheweb
          </a>
          <div className="loading mt-6">
            Finding something cool<div className="dots inline-flex space-x-1">
              <span className="animate-pulse">.</span><span className="animate-pulse">.</span><span className="animate-pulse">.</span>
            </div>
          </div>
        </div>

        <button className="history-toggle mt-8 bg-gray-300 text-gray-800 py-2 px-4 rounded">
          <i className="fas fa-history"></i> History
        </button>

        <div className="history-modal fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
          <div className="modal-content bg-white p-6 rounded shadow-lg">
            <div className="modal-header flex justify-between items-center">
              <h3 className="text-xl font-bold"><i className="fas fa-history"></i> History</h3>
              <button className="close-modal text-red-500">×</button>
            </div>
            <div id="visitedSites" className="mt-4"></div>
            <button className="clear-cookies-toggle mt-4 bg-red-500 text-white py-2 px-4 rounded">
              <i className="fas fa-cookie-bite"></i> Clear History
            </button>
          </div>
        </div>
      </main>

      {/* Embed scripts using next/script or React useEffect */}
      {/* <Script id="custom-js" strategy="afterInteractive">
        {`
          // Paste your JavaScript code here, or refactor it into React hooks & functions.
          // For example:
          const folders = [...];
          function getSites() { ... }
          function toggleHistoryModal() { ... }
          function clearAllData() { ... }
          // etc.
        `}
      </Script> */}
    </>
  );
}
