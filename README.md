# 🌐 Pathway — AI-Guided Learning Platform

Pathway is an intelligent, self-paced, single-user learning platform that generates structured, comprehensive curriculums for any technical skill or computer science concept. Driven by Google Gemini and backed by sandboxed code execution, Pathway takes learners from zero to proven proficiency through structured theory, quizzes, and judged coding challenges.

---

## 🚀 Key Features

*   **Custom Skill Curriculums:** Enter any topic (e.g. *TypeScript Fundamentals*, *Binary Search Trees*, *Next.js 16*) and receive a structured learning path consisting of 4–8 progressive topics with 2–5 subtopics each.
*   **Rich Interactive Lessons:** Every subtopic features deep-dive explanations formatted in markdown alongside complete, runnable code examples.
*   **Failed-Quiz Remediation:** At the end of each subtopic, users take a multiple-choice quiz. If they fail a quiz twice, Pathway automatically generates a **Simplified Explanation** using friendly analogies to rebuild missing foundations.
*   **Sandboxed Code Challenges:** Topics culminate in a coding challenge. Write solutions in **JavaScript, TypeScript, or Python** and execute them against test cases.
*   **Dual Code Runner Architecture:**
    *   **Browser Sandbox (Client-Side):** Executes code instantly inside Web Workers using Pyodide (WASM Python) and the TypeScript compiler CDN.
    *   **Judged Execution (Server-Side):** Safe, sandboxed validation of submissions using the remote [Piston API Engine](https://github.com/engineer-man/piston) to prevent local sandbox escapes.
*   **Expert Solution Analyses:** Upon successfully passing a challenge, Gemini reviews the submission and outputs **5 distinct alternative solutions** showing different languages, algorithms, or paradigm trade-offs, complete with time/space complexity analyses.
*   **Background Generation Queue:** Heavy AI-content generation (lessons, quizzes, challenges) is managed via a prioritized MongoDB queue. Items are generated either lazily on-demand or processed concurrently via a background cron agent.
*   **Robust Multi-Key Quota Manager:** Handles round-robin key rotation across up to 6 configured Gemini API keys, tracking daily usage logs in the database to prevent API throttling and daily quota exhaustion.

---

## 🛠️ Tech Stack

*   **Core Framework:** [Next.js 16 (App Router)](https://nextjs.org) & [React 19](https://react.dev)
*   **Programming Language:** [TypeScript](https://www.typescriptlang.org)
*   **Styling & Motion:** [Tailwind CSS v4](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion), and [@base-ui/react](https://base-ui.com)
*   **Database & ODM:** [MongoDB](https://www.mongodb.com) & [Mongoose](https://mongoosejs.com)
*   **Authentication:** [NextAuth.js](https://next-auth.js.org) (Credentials Provider)
*   **AI Engine:** [Google Generative AI SDK (`@google/generative-ai`)](https://github.com/google-gemini/generative-ai-js) with strict [Zod](https://zod.dev) schema validations
*   **Code Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) via `@monaco-editor/react`

---

## 📁 Directory Structure

```filepath
pathway/
├── app/                  # Next.js App Router folders
│   ├── (app)/            # Core dashboard, learning path, and skill-management views
│   │   ├── challenges/   # Coding challenges runner pages
│   │   ├── dashboard/    # User home, listing learned and active skills
│   │   ├── manage/       # Admin console for viewing queue status and quota limits
│   │   ├── skills/       # Topic nodes and visual learning paths
│   │   └── subtopics/    # Subtopic lessons, quizzes, and remediation pages
│   ├── api/              # Backend endpoints
│   │   ├── auth/         # NextAuth configuration
│   │   ├── challenges/   # Submissions, analysis retrieval, and code running endpoint
│   │   ├── cron/         # Background queue batch-processing entry point (Cron)
│   │   └── skills/       # Skill creation and structure generation
│   ├── globals.css       # Tailwind CSS custom style entries
│   └── layout.tsx        # Top-level viewport provider layout
├── components/           # Reusable UI React components
│   ├── challenges/       # Editor pane, challenge description, and console output
│   ├── learning-path/    # Graphic path node trees and timelines
│   ├── marketing/        # Landing page, scroll-reveals, and preview items
│   └── ui/               # Base design system blocks (dialogs, buttons, tooltips)
├── lib/                  # Application core utilities
│   ├── code-runner/      # Client-side Web Worker runner (transpilation & WASM Pyodide)
│   ├── db/               # MongoDB mongoose connection setup
│   ├── gemini/           # API key rotation, system prompts, and Zod schemas
│   ├── piston/           # Server-side Piston execution client
│   └── queue/            # Prioritized background generation queue processor
├── models/               # Mongoose database models (User, Skill, Topic, Content, Queue, etc.)
├── public/               # Static assets
├── scripts/              # Local TypeScript developer utility scripts
└── types/                # Shared TypeScript type definitions
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v20+ recommended)
*   [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a remote MongoDB Atlas instance)

---

### 2. Configure Environment Variables
Clone the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill out the required configurations:
*   `MONGODB_URI`: Connection string to your MongoDB database (e.g. `mongodb://localhost:27017/pathway`).
*   `NEXTAUTH_SECRET`: A secret string used to sign NextAuth tokens.
*   `NEXTAUTH_URL`: The root URL of the app (default: `http://localhost:3000`).
*   `SEED_EMAIL` & `SEED_PASSWORD`: Credentials for your single-user account (seeded into the DB).
*   `GEMINI_KEY_1` .. `GEMINI_KEY_6`: API keys obtained from Google AI Studio. Fill at least one key slot.
*   `PISTON_API_URL`: Base URL for code runner backend (defaults to `https://emkc.org/api/v2/piston`).
*   `CRON_SECRET`: Optional secret for secure background cron requests.

---

### 3. Install Dependencies
Run the package installation:
```bash
npm install
```

---

### 4. Seed the User Database
Create the single-user account defined in your `.env` variables:
```bash
npm run db:seed
```

---

### 5. Start the Development Server
Launch Next.js:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Developer Scripts

The codebase provides several pre-configured npm scripts to help manage and test different modules:

*   **`npm run db:seed`**: Resets/upserts the database with the single user credentials set in `.env` or in the script.
*   **`npm run db:check`**: Logs statistics about the collections in your MongoDB instance (number of topics, contents, queue items).
*   **`npm run test:gemini`**: Validates your Gemini API credentials by generating a basic outline for a sample topic in the terminal.
*   **`npm run test:runner`**: Runs unit tests on the browser-based client code executor (JavaScript, TypeScript, and mock Python).
*   **`npm run test:flow`**: Simulates the full queue-generation and code-validation lifecycle end-to-end.
