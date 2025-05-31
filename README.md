# Lunna Backend

Backend for the Lunna bot, a Discord integration app providing virtual economy, VIP management, and transaction processing.

## 📋 About the Project

Lunna Backend is an API service built with Node.js, TypeScript, Fastify, and Prisma that manages the virtual economy system (LunarCoins), VIP subscriptions, and payment processing for the Lunna Discord bot. It uses MongoDB as the database and implements a clean architecture with well-defined controllers, middlewares, and services.

## 🚀 Technologies

- **Node.js** - JavaScript runtime environment
- **TypeScript** - Typed superset of JavaScript
- **Fastify** - High-performance web framework
- **Prisma** - Database ORM
- **MongoDB** - NoSQL database
- **JWT** - Token-based authentication
- **Stripe** - Payment processing
- **Zod** - Data validation
- **Docker** - Containerization

## ⚙️ Project Structure

```

lunna-backend/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── controllers/        # API controllers
│   ├── middlewares/        # Authentication and validation middlewares
│   ├── routes/             # API routes
│   ├── services/           # Business services
│   ├── utils/              # Utility functions
│   ├── validators/         # Validation schemas
│   ├── environments/       # Environment variables
│   │   └── .env-example    # Example environment file
│   └── app.ts              # Application entry point
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration

````

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/ryangustav/lunna-backend.git
cd lunna-backend
````

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Configure the `.env` file based on `.env.example`:

```env
# DB Config
DATABASE_URL="Mongo db URL"

# Discord Secrets
DISCORD_API_TOKEN="Discord API Token"
DISCORD_CLIENT_ID="Discord Client ID"
DISCORD_CLIENT_SECRET="Discord Client secret"
DISCORD_REDIRECT_URI="Callback url example: http://localhost:8080/auth/discord/callback"
WEBHOOK_OAUTH="Discord oauth URL"

# Stripe secrets
STRIPE_SECRET_KEY="Stripe secret key"
STRIPE_WEBHOOK_SECRET="Your stripe webhook secret"
SITE_URL="Your site URL example: localhost:8080"

# Mercado Pago secret
MERCADO_PAGO_SECRET_KEY="Your MP Secret key"

# Frontend
FRONTEND_URL="http://localhost:3000"

# API Secrets
SESSION_SECRET="Your session secret"
JWT_SECRET="Your JWT secret key"
```

4. Run Prisma migrations:

```bash
npx prisma generate
```

5. Start the server:

```bash
npm run dev
# or
yarn dev
```

## 🐳 Running with Docker Compose

1. Make sure the `.env` file is correctly configured at `.env`.

2. To start backend and MongoDB, run:

```bash
docker-compose up --build
```

## 📊 Data Models

### LunarCoins

Manages users' virtual economy:

* Coin balance
* VIP status
* Prompt usage count
* Language preferences

### Transaction

Logs all financial transactions:

* VIP purchases
* Coin purchases
* Subscription renewals

### VipTier

Defines VIP subscription tiers:

* Price
* Duration
* Benefits
* Included coins

### VipRenewalAttempt

Tracks VIP subscription renewal attempts:

* Attempt status
* Checkout session
* Attempt date

### VipDeactivation

Logs VIP cancellations and reasons

## 🔐 Authentication

Uses JWT (JSON Web Tokens) for API route protection. Tokens are validated by authentication middleware.

## 💰 Payment Processing

Stripe integration enables secure payments for:

* VIP packages
* LunarCoins purchases
* Recurring subscriptions

## 📝 API Endpoints

### Authentication

* `POST /auth/login` - User login
* `POST /auth/verify` - Token verification

### Users

* `GET /users/:id` - Get user info
* `PATCH /users/:id` - Update user info

### Economy

* `GET /coins/:userId` - Get LunarCoins balance
* `POST /coins/add` - Add LunarCoins
* `POST /coins/use` - Use LunarCoins

### VIP

* `GET /vip/tiers` - List available VIP tiers
* `POST /vip/purchase` - Purchase VIP subscription
* `POST /vip/cancel` - Cancel VIP subscription

### Payments

* `POST /payments/create-checkout` - Create checkout session
* `POST /payments/webhook` - Stripe webhook handler

## 🔄 Payment Flow

1. User selects VIP package or coin bundle
2. System creates Stripe checkout session
3. User completes payment on Stripe UI
4. Stripe webhook notifies backend of payment status
5. System updates user status and grants benefits accordingly

## 🚀 Performance

Fastify offers:

* High-performance request handling
* Low memory overhead
* Optimized response times
* Native async/await support

## 🔧 TypeScript

TypeScript provides:

* Static typing to reduce errors
* Better IDE support and autocomplete
* Implicit documentation via interfaces
* Safer code refactoring

## 🧪 Running Tests

```bash
npm test
# or
yarn test
```

## 🚧 Development

To contribute:

1. Create a branch for your feature
2. Make your changes
3. Run tests
4. Submit a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🌟 Credits

Developed with ❤ by [Ryan Gustavo](https://github.com/ryangustav) and the Lunna team.