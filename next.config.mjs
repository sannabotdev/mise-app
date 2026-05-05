import createNextIntlPlugin from 'next-intl/plugin'
import withPWA from 'next-pwa'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Never cache Next.js API routes. They are user/session specific and would
    // otherwise serve stale onboarding/context state (e.g. family=null after create).
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: { maxEntries: 200 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...pwaConfig,
}

export default withNextIntl(nextConfig)
