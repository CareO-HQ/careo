# Supabase Setup & Workflow Guide

This guide details the steps to set up Supabase locally, link it to a cloud project, and work with Edge Functions for this project.

## Prerequisites

Ensure you have the following installed:
1.  **Docker Desktop**: Required for running the local Supabase stack. [Download here](https://www.docker.com/products/docker-desktop/).
2.  **Supabase CLI**: Required for managing the project.
    *   **macOS**: `brew install supabase/tap/supabase`
    *   **Windows**: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
    *   **npm**: `npm install -g supabase`

---

## 1. Local Development Setup

### Start Supabase Locally
1.  Make sure Docker is running.
2.  Run the following command in the project root:
    ```bash
    supabase start
    ```
    *   This will pull the necessary Docker images and start the local Supabase stack (Database, Auth, Storage, Edge Functions, Studio, etc.).

### Configure Environment Variables
1.  After `supabase start` completes, it will output your local API URL and keys (Anon/Public and Service_role).
2.  Create or update your `.env.local` file with these local credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
    SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
    ```

### Access Local Studio
*   You can manage your local database and services via the Supabase Studio dashboard, running at: `http://127.0.0.1:54323`

---

## 2. Linking to Cloud Project

To deploy changes or sync with the production/staging environment, you need to link your local setup to a Supabase cloud project.

1.  **Login to Supabase CLI**:
    ```bash
    supabase login
    ```
    *   This will open a browser window to authenticate.

2.  **Link the Project**:
    You need the "Project Ref" from your Supabase Dashboard settings (General > Project Reference).
    ```bash
    supabase link --project-ref <your-project-ref>
    ```
    *   You will be asked for the database password you set when creating the project.

3.  **Syncing Schema**:
    *   **Pull changes from Cloud (if Cloud is source of truth):**
        ```bash
        supabase db pull
        ```
    *   **Push local migrations to Cloud:**
        ```bash
        supabase db push
        ```

---

## 3. Edge Functions

Edge Functions are server-side TypeScript functions that run on the global edge network. They are located in `supabase/functions`.

### Directory Structure
```
supabase/
└── functions/
    ├── <function-name>/
    │   └── index.ts  <-- Entry point
    └── import_map.json (optional, for dependencies)
```

### Developing Locally
To test Edge Functions locally without deploying:

1.  **Serve Functions**:
    ```bash
    supabase functions serve
    ```
    *   This spins up a local server for your functions.
    *   You can verify they are working by making a request (e.g., via Postman or Curl) to the local URL provided in the output.
    *   Example: `curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/my-function' -H 'Authorization: Bearer <local-anon-key>'`

### Creating a New Function
```bash
supabase functions new <function-name>
```
*   This creates a new directory in `supabase/functions/<function-name>` with a starter `index.ts`.

### Deploying Functions
To deploy your functions to the linked Supabase Cloud project:

```bash
supabase functions deploy <function-name>
# OR deploy all
supabase functions deploy
```

### Invoking from Client (Next.js)
You can invoke these functions using the Supabase client in your application:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { foo: 'bar' },
})
```

---

## 4. Common Commands Reference

| Command | Description |
| :--- | :--- |
| `supabase stop` | Stop the local Docker containers. |
| `supabase db reset` | Resets the local database to a clean state and reapplies all migrations. |
| `supabase db diff -f <name>` | Creates a new migration file based on schema changes made in the local UI/DB. |
| `supabase status` | Shows the local API URLs and keys. |
