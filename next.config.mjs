/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@prisma/client", "bcryptjs"],
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Optional storage SDKs are imported dynamically and only needed when the
      // corresponding STORAGE_DRIVER is selected. Ignore them at build time so
      // the app compiles without installing them; install on demand:
      //   npm i @supabase/supabase-js   (STORAGE_DRIVER=supabase)
      //   npm i @vercel/blob            (STORAGE_DRIVER=blob)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(@supabase\/supabase-js|@vercel\/blob)$/,
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
