# WealthOS - RM Dashboard

A full-stack AI-powered wealth relationship management platform built for Edelweiss Mutual Fund.

## Features

### For RMs (Relationship Managers)
- **Today Dashboard**: Daily actions, targets, at-risk customers
- **Customer Management**: Full customer profiles with holdings, goals, communication history
- **AI Pre-Call Briefs**: Automated customer insights before calls
- **Portfolio Simulator**: What-if analysis for market scenarios
- **WhatsApp Integration**: AI-drafted messages for portfolio reviews, SIP reminders
- **Smart Alerts**: Churn risk, compliance, KYC expiry, opportunities

### For Managers (ASM/BM/RSM)
- **Team View**: Monitor RM performance and customer health
- **Hierarchy Dashboard**: Regional/branch-level aggregations
- **Reassignment**: Move customers between RMs

### AI Capabilities (Powered by Claude)
- Natural language chat assistant with real customer context
- Intelligent fund comparisons
- Portfolio simulations (market crash, rate cut, bull run)
- AI-generated customer pre-call briefs
- Smart WhatsApp message drafting

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **AI**: Claude API (Anthropic) with graceful fallback to templates
- **Auth**: JWT tokens, SSO support (Google/Azure)

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+

### Installation

```bash
# Install all dependencies
npm install

# Set up environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI

# Seed the database
cd server && npm run seed

# Start development servers
cd .. && npm run dev
```


## Project Structure

```
wealthos/
├── package.json              # Monorepo root
├── server/
│   ├── index.js              # Express app entry
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Customer.js
│   │   └── Alert.js
│   ├── routes/
│   │   ├── auth.js           # Login, SSO, /me
│   │   ├── customers.js      # CRUD, commlog, suitability
│   │   ├── alerts.js         # List, acknowledge, resolve
│   │   ├── dashboard.js      # RM/ASM dashboards
│   │   ├── team.js           # Team management
│   │   └── ai.js             # Chat, briefs, simulations
│   ├── middleware/
│   │   └── auth.js           # JWT verify, role guards
│   ├── seeds/
│   │   └── index.js          # Demo data seeder
│   └── tests/
│       └── api.test.js       # Jest/Supertest tests
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # Routes & layout
│       ├── hooks/
│       │   └── useFetch.js   # API client & auth
│       ├── components/
│       │   ├── UI.jsx        # Shared components
│       │   ├── TopBar.jsx
│       │   ├── BottomNav.jsx
│       │   ├── AddCustomer.jsx
│       │   └── Simulator.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Today.jsx
│       │   ├── Customers.jsx
│       │   ├── CustomerDetail.jsx
│       │   ├── AIChat.jsx
│       │   ├── Alerts.jsx
│       │   ├── Team.jsx
│       │   └── More.jsx
│       └── styles/
│           └── index.css
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/sso/google` - Google SSO
- `POST /api/auth/sso/azure` - Azure SSO
- `GET /api/auth/me` - Current user

### Customers
- `GET /api/customers` - List (with filters, pagination)
- `GET /api/customers/:id` - Get customer
- `POST /api/customers` - Create
- `PATCH /api/customers/:id` - Update
- `POST /api/customers/:id/commlog` - Add communication log
- `GET /api/customers/:id/commlog` - Get communication history
- `POST /api/customers/:id/suitability` - Check scheme suitability

### Alerts
- `GET /api/alerts` - List user's alerts
- `GET /api/alerts/counts` - Alert counts by priority
- `POST /api/alerts/:id/acknowledge`
- `POST /api/alerts/:id/resolve`
- `POST /api/alerts/:id/dismiss`

### Dashboard
- `GET /api/dashboard/rm` - RM dashboard data
- `GET /api/dashboard/asm` - Team dashboard (ASM+)
- `GET /api/dashboard/actions` - Daily action items

### Team
- `GET /api/team` - List team members
- `GET /api/team/:id` - Member details
- `POST /api/team/reassign` - Reassign customers
- `GET /api/team/hierarchy/tree` - Org tree

### AI
- `POST /api/ai/chat` - Natural language queries
- `GET /api/ai/brief/:customerId` - Pre-call brief
- `POST /api/ai/compare-funds` - Fund comparison
- `POST /api/ai/simulate` - Portfolio simulation
- `POST /api/ai/draft-message` - WhatsApp message

## Running Tests

```bash
cd server
npm test
```

## Environment Variables

```env
# server/.env
PORT=5000
MONGO_URI=mongodb://localhost:27017/wealthos
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Claude AI (optional - falls back to templates without this)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### Claude API Integration

The AI features use the Claude API (Anthropic) for:
- **Chat**: Contextual responses based on RM's customer book
- **Briefs**: AI-generated pre-call customer summaries
- **Messages**: Smart WhatsApp message drafting

If `ANTHROPIC_API_KEY` is not set, the app gracefully falls back to template-based responses. This allows development/testing without API costs.

Get your API key at: https://console.anthropic.com/

## License

Proprietary - Edelweiss Mutual Fund
