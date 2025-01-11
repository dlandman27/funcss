// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;


export default {
    async rewrites() {
      return [
        {
          source: '/',
          destination: '/index.html', // Rewrite the root route to index.html
        },
      ];
    },
  };
  