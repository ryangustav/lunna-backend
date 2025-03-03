# Lunna Backend

Backend para o bot Lunna, uma aplicação de integração com Discord que oferece funcionalidades de economia virtual, gerenciamento de VIP e processamento de transações.

## 📋 Sobre o Projeto

O Lunna Backend é um serviço de API construído com Node.js, TypeScript, Fastify e Prisma que gerencia o sistema de economia virtual (LunarCoins), assinaturas VIP e processamentos de pagamentos para o bot Lunna do Discord. A aplicação utiliza MongoDB como banco de dados e implementa uma arquitetura organizada com controladores, middlewares e serviços bem definidos.

## 🚀 Tecnologias

- **Node.js** - Ambiente de execução JavaScript
- **TypeScript** - Superset tipado de JavaScript
- **Fastify** - Framework web de alta performance
- **Prisma** - ORM para banco de dados
- **MongoDB** - Banco de dados NoSQL
- **JWT** - Autenticação por tokens
- **Stripe** - Processamento de pagamentos
- **Zod** - Validação de dados

## ⚙️ Estrutura do Projeto

```
lunna-backend/
├── prisma/
│   └── schema.prisma       # Esquema do banco de dados
├── src/
│   ├── controllers/        # Controladores da API
│   ├── middlewares/        # Middlewares de autenticação e validação
│   ├── routes/             # Rotas da API
│   ├── services/           # Serviços de negócio
│   ├── utils/              # Funções utilitárias
│   ├── validators/         # Esquemas de validação
│   ├── environments/       # Variáveis de ambiente
│   │   └── .env-example    # Modelo para variáveis de ambiente
│   └── app.ts              # Inicialização da aplicação
├── package.json            # Dependências e scripts
└── tsconfig.json           # Configuração do TypeScript
```

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/ryangustav/lunna-backend.git
cd lunna-backend
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure o arquivo `.env` baseado no `.env.example`:
```

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
STRIPE_WEBHOOK_SECRET="YOur stripe webhook secret"
SITE_URL="Your site URL example: localhost:8080"

# Mercado pago secret
MERCADO_PAGO_SECRET_KEY="Your MP Secret key

# Frontend
FRONTEND_URL="http://localhost:3000"

# API Secrets
SESSION_SECRET="Your session secret"
JWT_SECRET="Your JWT Secret key"
```

4. Execute as migrações do Prisma:
```bash
npx prisma generate
```

5. Inicie o servidor:
```bash
npm run dev
# ou
yarn dev
```

## 📊 Modelos de Dados

### LunarCoins
Gerencia a economia virtual dos usuários:
- Saldo de moedas
- Status VIP
- Contagem de prompts utilizados
- Preferências de idioma

### Transaction
Registra todas as transações financeiras:
- Compras de VIP
- Compras de moedas
- Renovações de assinatura

### VipTier
Define os diferentes níveis de assinatura VIP:
- Preço
- Duração
- Benefícios
- Moedas incluídas

### VipRenewalAttempt
Rastreia tentativas de renovação de assinaturas VIP:
- Status da tentativa
- Sessão de checkout
- Data da tentativa

### VipDeactivation
Registra cancelamentos de VIP e seus motivos

## 🔐 Autenticação

O sistema utiliza autenticação baseada em JWT (JSON Web Tokens) para proteger as rotas da API. Os tokens são validados através do middleware de autenticação.

## 💰 Processamento de Pagamentos

A integração com Stripe permite o processamento seguro de pagamentos para:
- Compra de pacotes VIP
- Compra de LunarCoins
- Assinaturas recorrentes

## 📝 Endpoints da API

### Autenticação
- `POST /auth/login` - Autenticação de usuário
- `POST /auth/verify` - Verificação de token

### Usuários
- `GET /users/:id` - Obter informações do usuário
- `PATCH /users/:id` - Atualizar informações do usuário

### Economia
- `GET /coins/:userId` - Obter saldo de LunarCoins
- `POST /coins/add` - Adicionar LunarCoins
- `POST /coins/use` - Utilizar LunarCoins

### VIP
- `GET /vip/tiers` - Listar níveis VIP disponíveis
- `POST /vip/purchase` - Comprar assinatura VIP
- `POST /vip/cancel` - Cancelar assinatura VIP

### Pagamentos
- `POST /payments/create-checkout` - Criar sessão de checkout
- `POST /payments/webhook` - Webhook para eventos do Stripe

## 🔄 Fluxo de Pagamento

1. O usuário seleciona um pacote VIP ou de moedas
2. O sistema cria uma sessão de checkout no Stripe
3. O usuário completa o pagamento na interface do Stripe
4. O webhook do Stripe notifica o backend sobre o status do pagamento
5. O sistema atualiza o status do usuário e adiciona benefícios conforme necessário

## 🚀 Performance

O uso do Fastify como framework web proporciona:
- Manipulação de requisições de alta performance
- Baixa sobrecarga de memória
- Tempos de resposta otimizados
- Suporte nativo a async/await

## 🔧 TypeScript

A implementação em TypeScript oferece:
- Tipagem estática para redução de erros
- Melhor suporte a IDEs e autocompletação
- Documentação implícita através de interfaces
- Code refactoring mais seguro

## 🧪 Rodando Testes

```bash
npm test
# ou
yarn test
```

## 🚧 Desenvolvimento

Para contribuir com o projeto:

1. Crie uma branch para sua feature
2. Faça suas alterações
3. Execute os testes
4. Envie um Pull Request

## 📄 Licença

Este projeto está licenciado sob os termos da licença [MIT](LICENSE).

## 🌟Star history

[![Star History Chart](https://api.star-history.com/svg?repos=ryangustav/lunna-backend&type=Date)](https://star-history.com/#ryangustav/lunna-backend&Date)

## 🌟 Créditos

Desenvolvido com ❤ por [Ryan Gustav](https://github.com/ryangustav) e equipe Lunna.
