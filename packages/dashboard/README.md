# TelePayGate Dashboard

React-based merchant dashboard for managing TelePayGate payment integrations.

## Features

- 📊 **Dashboard Overview** - Real-time revenue, transactions, and success rates
- 💳 **Transaction Management** - View and export payment history
- 🔄 **P2P Orders** - Monitor buy/sell orders
- 📈 **DEX Analytics** - Liquidity pool rates and performance
- 🔔 **Webhook Configuration** - Set up and test webhook endpoints
- ⚙️ **Settings** - API key management, theme preferences
- 🌙 **Dark Mode** - Full dark/light theme support

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching & caching
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Recharts** - Charts and analytics
- **Lucide Icons** - Icon library

## Quick Start

### Prerequisites

- Node.js 18+
- API server running (`packages/api`)

### Development

```bash
# From monorepo root
npm install

# Start dashboard dev server
cd packages/dashboard
npm run dev

# Or from root
npm run dev -w @tg-payment/dashboard
```

Open http://localhost:5173

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000/api/v1` |
| `VITE_FEATURE_PASSWORDLESS_AUTH` | Enable magic link login | `false` |

### Production Build

```bash
npm run build
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── api/              # API client and services
│   ├── client.ts     # Axios instance with interceptors
│   ├── services.ts   # API service functions
│   └── queryClient.ts
├── components/
│   ├── analytics/    # Charts and stats components
│   ├── auth/         # Auth-related components
│   ├── common/       # Shared UI components
│   └── layout/       # Layout and navigation
├── context/
│   └── AuthContext.tsx
├── hooks/
│   └── useTheme.ts
├── pages/
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── P2POrders.tsx
│   ├── DexAnalytics.tsx
│   ├── Webhooks.tsx
│   ├── Settings.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── Landing.tsx
├── types/            # TypeScript definitions
├── utils/            # Helper functions
├── App.tsx           # Routes and providers
└── main.tsx          # Entry point
```

## Authentication

The dashboard uses API key authentication:

1. User logs in with `pk_*` API key
2. Key stored in localStorage
3. Attached to all requests via `x-api-key` header
4. Profile fetched from `/users/me`

## API Integration

Services in `src/api/services.ts`:

- `paymentService` - Payment CRUD operations
- `conversionService` - Currency conversions
- `userService` - User profile and API keys
- `statsService` - Dashboard analytics
- `p2pService` - P2P order management
- `webhookService` - Webhook configuration
- `dexService` - DEX rates and quotes

## Testing

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
```

## Deployment

### Render.com (Static Site)

Configured in `render.yaml`:

```yaml
- type: web
  name: telepaygate-dashboard
  runtime: static
  buildCommand: npm ci && npm run build -w @tg-payment/dashboard
  staticPublishPath: packages/dashboard/dist
  envVars:
    - key: VITE_API_URL
      value: https://telegram-payment-api.onrender.com/api/v1
```

### Manual Deploy

```bash
npm run build
# Upload dist/ to any static hosting (Vercel, Netlify, S3, etc.)
```

## Contributing

1. Follow existing code patterns
2. Use TypeScript strict mode
3. Add types for new API responses
4. Test new features

## License

MIT
