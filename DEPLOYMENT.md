# Phase 12 Deployment Guide

Now that the application is fully integrated with Supabase for real-time data sync and authentication, we need to host the frontend HTML/JS files so your users can access it from the cloud. 

Since the app is a Vite-based PWA, we can host it elegantly on **Vercel** or **Cloudflare Pages** for absolutely $0.

## Vercel Deployment Instructions

These are the exact steps to get your app live on Vercel:

1. **Commit and Push to GitHub:** Ensure your local repository is pushed to a GitHub account.
2. **Sign up for Vercel:** Go to [Vercel](https://vercel.com/) and create a free account linked to your GitHub.
3. **Import Project:** Click "Add New..." -> "Project". 
4. **Select Repository:** Choose your `industrial-erp-platform` repository.
5. **Configure Project:**
   - Vercel will automatically detect that you are using Vite. The build command `npm run build` and output directory `dist` will be pre-filled.
   - **Environment Variables [CRITICAL]:** Expand the Environment Variables section and add the two variables from your `.env` file:
     - Name: `VITE_SUPABASE_URL` | Value: `https://paismvtdpkoihqpyacsd.supabase.co`
     - Name: `VITE_SUPABASE_ANON_KEY` | Value: `[Your Anon Key]`
6. **Deploy:** Click the "Deploy" button.

Vercel will build the `dist` folder, generate the PWA manifest, and provide you with a free `your-app-name.vercel.app` domain with SSL out of the box.

## Next Steps once Deployed
1. Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
2. Add your new Vercel domain (e.g., `https://my-erp.vercel.app`) to your **Site URL** and **Redirect URLs** so Supabase allows login requests from your hosted app instead of just `localhost:5175`.
