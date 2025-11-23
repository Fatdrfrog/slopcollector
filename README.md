# 🦝 SlopCollector

> The raccoon that cleans up your database mess.

SlopCollector is a developer tool that connects to your Supabase project, analyzes your schema, and uses AI to find missing indexes, catch slow queries, and suggest optimizations.

![SlopCollector Dashboard](https://raw.githubusercontent.com/yourusername/slopcollector/main/public/demo.png)

## Features

-   **Schema Visualization:** Interactive ERD (Entity Relationship Diagram) of your database.
-   **AI Analysis:** GPT analysis of your schema to find performance bottlenecks.
-   **Index Suggestions:** Automatically detects missing foreign key indexes.
-   **SQL Generation:** Generates ready-to-run SQL snippets to fix issues.

## Getting Started

### Prerequisites

-   Node.js 18+
-   A Supabase Project
-   OpenAI API Key

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Fatdrfrog/slopcollector.git
    cd slopcollector
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up environment variables:
    Copy `.env.example` to `.env.local` and fill in your keys.
    ```bash
    cp .env.example .env.local
    ```

    You will need:
    -   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
    -   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Publishable Key
    -   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (for introspection)
    -   `SUPABASE_SECRET_KEY`: Your Supabase Secret Key
    -   `OPENAI_API_KEY`: Your OpenAI API Key
    -   `NEXT_PUBLIC_APP_URL`: The URL of your app (e.g. http://localhost:3000)
    -   `CRON_SECRET`: Secret key for securing cron jobs

4.  Run the development server:
    ```bash
    pnpm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Self-Hosting

You can easily deploy SlopCollector to Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fslopcollector)

## License

MIT
