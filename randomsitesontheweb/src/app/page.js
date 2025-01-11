'use client';
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
          <i className="fas fa-exclamation-triangle text-yellow-500 text-2xl mr-2"></i>
          <div className="relative w-full my-8">
            <div className="absolute w-full transform -rotate-3" style={{zIndex: 10}}>
              <div className="flex items-center justify-center bg-yellow-300 py-4 px-12 text-white font-bold text-3xl"
                   style={{
                     border: '4px solid #000',
                     borderStyle: 'dashed',
                     textShadow: '2px 2px 0 #000',
                     boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)',
                     position: 'relative',
                     backgroundImage: 'repeating-linear-gradient(-45deg, #ffd700, #ffd700 10px, #ffed4a 10px, #ffed4a 20px)'
                   }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '0',
                  width: '100%',
                  height: '4px',
                  background: '#000',
                  borderStyle: 'dashed'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-12px',
                  left: '0',
                  width: '100%',
                  height: '4px',
                  background: '#000',
                  borderStyle: 'dashed'
                }}></div>
                ⚠️ UPDATE IN PROGRESS ⚠️
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 italic mb-4">(In progress of making the site more intelligent)</p>
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

      <style jsx global>
          {
            `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            overflow-x: hidden;
            position: relative;
            padding: 1rem;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                linear-gradient(90deg, transparent 95%, rgba(52, 152, 219, 0.1) 95%),
                linear-gradient(transparent 95%, rgba(52, 152, 219, 0.1) 95%);
            background-size: 30px 30px;
            animation: backgroundMove 60s linear infinite;
            z-index: -1;
        }

        @keyframes backgroundMove {
            0% { background-position: 0 0; }
            100% { background-position: 100px 100px; }
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 1.5rem;
            text-align: center;
            font-size: clamp(1.5rem, 4vw, 2.5rem);
            padding: 0 1rem;
        }
        
        h2 {
            color: #3498db;
            margin-bottom: 1rem;
            text-align: center;
            font-size: clamp(1.8rem, 5vw, 2.2rem);
            font-weight: 600;
            letter-spacing: 1px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
            animation: floatText 3s ease-in-out infinite;
            padding: 0 1rem;
        }

        .dotcom-text {
            display: inline-block;
            color: #e74c3c;
            font-size: 0.9em;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
            animation: glowPulse 2s ease-in-out infinite;
            transform-origin: center;
        }

        @keyframes glowPulse {
            0%, 100% {
                transform: scale(1) rotate(0deg);
                text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
            }
            50% {
                transform: scale(1.1) rotate(5deg);
                text-shadow: 0 0 20px rgba(231, 76, 60, 0.8);
            }
        }

        @keyframes floatText {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        button {
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 15px 30px;
            font-size: clamp(1rem, 3vw, 1.2rem);
            cursor: pointer;
            transition: transform 0.2s, background-color 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 300px;
            margin: 0.5rem;
        }

        button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
        }

        button:active {
            transform: translateY(0);
        }

        .container {
            text-align: center;
            width: 100%;
            max-width: 800px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .icon-spin {
            font-size: clamp(2rem, 6vw, 3rem);
            color: #3498db;
            margin-bottom: 2rem;
            animation: bounce 2s infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        .loading {
            display: none;
            margin-top: 1rem;
            font-size: clamp(0.9rem, 2.5vw, 1rem);
        }

        .loading .dots {
            display: inline-block;
        }

        .loading .dots span {
            display: inline-block;
            width: 6px;
            height: 6px;
            background-color: #3498db;
            border-radius: 50%;
            margin: 0 3px;
            animation: dots 1.4s infinite;
        }

        .loading .dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading .dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dots {
            0%, 100% { transform: scale(0.3); }
            50% { transform: scale(1); }
        }

        .history-toggle {
            position: fixed;
            right: 10px;
            top: 10px;
            padding: 8px 12px;
            font-size: clamp(0.8rem, 2.5vw, 1rem);
            z-index: 1000;
            width: auto;
            max-width: none;
        }

        .history-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            padding: 1rem;
        }

        .modal-content {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .close-modal {
            font-size: 2rem;
            padding: 0.5rem;
            line-height: 1;
        }

        .description {
            color: #34495e;
            font-size: clamp(1rem, 3vw, 1.2rem);
            margin-bottom: 2rem;
            text-align: center;
            max-width: 600px;
            line-height: 1.6;
            padding: 0 1rem;
        }

        .button-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            width: 100%;
        }

        .primary-button, .secondary-button {
            width: 100%;
            max-width: 300px;
            padding: 15px 30px;
            font-size: clamp(1rem, 3vw, 1.2rem);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            text-decoration: none;
        }

        .site-entry {
            padding: 0.8rem;
            border-bottom: 1px solid #eee;
        }

        .site-entry a {
            color: #333;
            text-decoration: none;
            font-size: clamp(0.9rem, 2.5vw, 1rem);
        }

        @media (min-width: 768px) {
            .button-group {
                flex-direction: row;
                justify-content: center;
            }

            button {
                width: auto;
            }
        }

        .secondary-button {
            background-color: #2ecc71;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s, background-color 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .secondary-button:hover {
            background-color: #27ae60;
            transform: translateY(-2px);
        }

        .secondary-button:active {
            transform: translateY(0);
        }

        .follower{
            position: fixed;
            pointer-events: none;
            width: 40px;
            height: 40px;
            background: rgba(52, 152, 219, 0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: transform 0.1s;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            mix-blend-mode: multiply;
            backdrop-filter: blur(2px);
            border: 2px solid rgba(52, 152, 219, 0.3);
            box-shadow: 0 0 20px rgba(52, 152, 219, 0.2);
        }

        .follower::before,
        .follower::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: inherit;
            border-radius: inherit;
            animation: cursorTrail 1.5s linear infinite;
            opacity: 0.5;
        }

        .follower::before {
            animation-delay: -0.2s;
        }

        .follower::after {
            animation-delay: -0.4s;
        }

        .follower {
            box-shadow: 
                0 0 20px rgba(52, 152, 219, 0.2),
                0 0 0 10px rgba(52, 152, 219, 0.1),
                0 0 0 20px rgba(52, 152, 219, 0.05),
                0 0 0 30px rgba(52, 152, 219, 0.025);
        }

        @keyframes cursorTrail {
            0% {
                transform: scale(1);
                opacity: 0.5;
            }
            50% {
                opacity: 0.3;
            }
            100% {
                transform: scale(3);
                opacity: 0;
            }
        }

        .trail {
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            animation: fadeUp 1s ease-out forwards;
            opacity: 0.8;
        }

        @keyframes fadeUp {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -150%) scale(1.5);
                opacity: 0;
            }
        }

        @keyframes rainbowSolid {
            0% { background-color: #3498db; box-shadow: 0 0 30px #3498db; }
            20% { background-color: #e74c3c; box-shadow: 0 0 30px #e74c3c; }
            40% { background-color: #f1c40f; box-shadow: 0 0 30px #f1c40f; }
            60% { background-color: #2ecc71; box-shadow: 0 0 30px #2ecc71; }
            80% { background-color: #9b59b6; box-shadow: 0 0 30px #9b59b6; }
            100% { background-color: #3498db; box-shadow: 0 0 30px #3498db; }
        }

        @keyframes rainbowBorder {
            0% { border-color: #3498db; color: #3498db; }
            20% { border-color: #e74c3c; color: #e74c3c; }
            40% { border-color: #f1c40f; color: #f1c40f; }
            60% { border-color: #2ecc71; color: #2ecc71; }
            80% { border-color: #9b59b6; color: #9b59b6; }
            100% { border-color: #3498db; color: #3498db; }
        }

        .primary-button {
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
            z-index: 1;
            transition: all 0.3s ease;
            box-shadow: 0 0 20px rgba(52, 152, 219, 0.2);
        }

        .primary-button:hover {
            animation: rainbowSolid 5s infinite;
            filter: brightness(1.2);
            transform: translateY(-2px);
            box-shadow: 
                0 0 30px currentColor,
                0 0 60px currentColor;
            letter-spacing: 2px;
            text-shadow: 0 0 8px white;
        }

        .secondary-button {
            background-color: rgba(52, 152, 219, 0.1);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            border: 2px solid #3498db;
            border-radius: 8px;
            color: #3498db;
            position: relative;
            overflow: hidden;
            z-index: 1;
            transition: all 0.3s ease;
        }

        .secondary-button:hover {
            animation: rainbowBorder 5s infinite;
            background-color: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 0 20px currentColor;
            letter-spacing: 2px;
            text-shadow: 0 0 8px currentColor;
        }

        .primary-button:active,
        .secondary-button:active {
            transform: translateY(0);
            filter: brightness(0.9);
        }

        .social-link {
            margin-top: 1.5rem;
            color: #34495e;
            text-decoration: none;
            font-size: 0.9rem;
            opacity: 0.8;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 8px 12px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
        }

        .social-link:hover {
            opacity: 1;
            color: #2c3e50;
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .social-link i {
            font-size: 1.2rem;
            color: #e4405f;  /* Instagram brand color */
        }

        .site-count{
            font-size: 1.2rem;
            font-weight: bold;
            color: #3498db;
            display: inline-block;
            padding: 0 4px;
            border-radius: 4px;
            background: rgba(52, 152, 219, 0.1);
            animation: pulse 2s infinite;
        }
            `
          }
        </style>
      
      <Script id="custom-js" strategy='afterInteractive'>
        {
          `
            
          `
        }
      </Script>

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
