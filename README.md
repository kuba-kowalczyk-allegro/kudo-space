# KudoSpace

> A simple, visible way for team members to show appreciation for each other

## 📋 Table of Contents

- [Project Description](#-project-description)
- [Tech Stack](#-tech-stack)
- [Getting Started Locally](#-getting-started-locally)
- [Available Scripts](#-available-scripts)
- [Playwright E2E Tests](#-playwright-e2e-tests)
- [Project Scope](#-project-scope)
- [Project Status](#-project-status)
- [License](#-license)

## 📖 Project Description

KudoSpace is a Minimum Viable Product (MVP) web application designed to provide a simple, visible way for team members to show appreciation for each other, especially in remote work settings. It features a single, public kudos board where users can post messages of gratitude for their colleagues.

### The Problem

In many teams, particularly those working remotely, there is a lack of informal but visible channels for expressing appreciation for a colleague's work or assistance. These small but significant gestures of gratitude often go unnoticed, which can negatively impact team morale, motivation, and the overall company culture.

### The Solution

KudoSpace creates a centralized and visible platform for sharing praise, enabling team members to:

- **Authenticate easily** using social providers (Google or GitHub)
- **Give kudos** to colleagues with personalized messages
- **View all kudos** on a single, shared board
- **Generate messages** using AI assistance (optional)
- **Manage their kudos** by deleting their own entries

## 🛠 Tech Stack

### Frontend

- **[Astro 5](https://astro.build/)** - Fast, efficient sites with minimal JavaScript
- **[React 19](https://react.dev/)** - Interactive components where needed
- **[TypeScript 5](https://www.typescriptlang.org/)** - Static typing and improved IDE support
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible React component library

### Backend

- **[Supabase](https://supabase.com/)** - All-in-one backend solution
  - PostgreSQL database
  - Built-in user authentication
  - Backend-as-a-Service SDKs
  - Open-source and self-hostable

### AI Integration

- **[OpenRouter.ai](https://openrouter.ai/)** - AI model access
  - Access to multiple AI providers (OpenAI, Anthropic, Google, and others)
  - Cost-effective model selection
  - API key spending limits

### CI/CD and Hosting

- **GitHub Actions** - CI/CD pipelines
- **DigitalOcean** - Docker-based application hosting

## 🚀 Getting Started Locally

### Prerequisites

- **Node.js**: Version 22.14.0 (specified in `.nvmrc`)
- **npm** or **yarn** package manager
- **Supabase account** for backend services
- **OpenRouter.ai API key** (optional, for AI features)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/kuba-kowalczyk-allegro/kudo-space.git
   cd kudo-space
   ```

2. **Install Node.js version**

   If you use `nvm`:

   ```bash
   nvm use
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set up environment variables**

   Create a `.env` file in the root directory based on `.env.example`

5. **Set up Supabase**
   - Create a new Supabase project
   - Configure authentication with Github
   - Set up the database schema (refer to migrations in `supabase/migrations`)

6. **Start the development server**

   ```bash
   npm run dev
   ```

   The application should now be running at `http://localhost:3000`

## 📜 Available Scripts

| Script             | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start the development server with hot reload |
| `npm run build`    | Build the production-ready application       |
| `npm run preview`  | Preview the production build locally         |
| `npm run astro`    | Run Astro CLI commands                       |
| `npm run lint`     | Run ESLint to check for code issues          |
| `npm run lint:fix` | Run ESLint and automatically fix issues      |
| `npm run format`   | Format code using Prettier                   |
| `npm run test:e2e` | Run Playwright end-to-end tests              |
| `npm run test:e2e:ui` | Launch Playwright UI mode for debugging  |

## 🧪 Playwright E2E Tests

- Copy `.env.test.example` to `.env.test` and fill in Supabase credentials for the dedicated testing project; `.env.test` stays local thanks to `.gitignore`.
- Install browsers if needed: `npx playwright install --with-deps`.
- Start the app (e.g., `npm run dev` or `npm run preview`) and then execute `npm run test:e2e`.
- The suite relies on pre-provisioned Supabase auth users and the manual seed script described in `.ai/testing/e2e-plan.md`.

## 🎯 Project Scope

### ✅ In Scope

- User authentication via a single social provider (Google or GitHub)
- A single, shared kudos board visible to all users
- Full CRUD functionality for kudos:
  - **Create**: Give kudos to team members
  - **Read**: View all kudos on the board
  - **Delete**: Remove your own kudos (cannot delete others' kudos)
- Optional AI-powered message generation based on 3-15 keywords
- Clean, minimalist user interface
- Single instance for one team/company

### ❌ Out of Scope

- Multiple or private boards for different teams or topics
- Systems for points, rankings, or rewards
- Real-time notifications
- Integrations with chat platforms (e.g., Slack, Teams)
- Editing existing kudos
- Advanced user profiles or statistics
- Activity dashboards
- Formal user feedback mechanisms for AI feature quality

## 📊 Project Status

**Current Status**: MVP Development

## 📄 License

This project is licensed under the terms specified in the repository. Please refer to the LICENSE file for more information.

---

**Built with ❤️ for remote teams**
