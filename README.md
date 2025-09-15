# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/414fc41e-176f-45f7-9f94-7be36a4ca341

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/414fc41e-176f-45f7-9f94-7be36a4ca341) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## 🔐 Security Best Practices

### Environment Variables

This project follows strict security practices for managing environment variables:

#### Public Variables (Frontend)
- **Prefix**: Variables starting with `VITE_` are exposed to the frontend
- **Examples**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Usage**: Only for non-sensitive data that can be safely exposed

#### Private Variables (Backend Only)
- **Storage**: Use Supabase Secrets for sensitive data
- **Access**: Only accessible in Edge Functions via `Deno.env.get()`
- **Examples**: `SUPABASE_SERVICE_ROLE_KEY`, `PAGPAY_SECRET`, `WEBHOOK_SECRET`
- **NEVER**: Never expose these in frontend code or commit to repository

### Important Security Rules

1. **Never commit .env files** - All .env variations are ignored by git
2. **Never use service_role key in frontend** - This key has full database access
3. **Store secrets in Supabase** - Use Supabase dashboard to manage production secrets
4. **Use Edge Functions for sensitive operations** - Process webhooks and API calls server-side
5. **SSL is automatic** - Lovable provides automatic SSL via Let's Encrypt

### Managing Secrets in Lovable

1. **Development**: Use local .env file (never commit it)
2. **Production**: Add secrets via Supabase dashboard:
   - Go to Project Settings → Functions → Secrets
   - Add your secret variables there
   - Access in Edge Functions with `Deno.env.get("SECRET_NAME")`

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/414fc41e-176f-45f7-9f94-7be36a4ca341) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
