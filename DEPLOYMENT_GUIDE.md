# 🚀 Complete Deployment & Hosting Guide: GitHub Pages, Free Domain & Google Search Console

This guide covers everything you need to take your website live for **100% free**, configure a free custom domain, and index your website in **Google Search Console** using your XML sitemap.

---

## 📑 Table of Contents
1. [Step 1: Configure Your WhatsApp Number & Company Details](#step-1-configure-your-whatsapp-number--company-details)
2. [Step 2: Host for Free on GitHub Pages](#step-2-host-for-free-on-github-pages)
3. [Step 3: Connect a Free Custom Domain (Optional)](#step-3-connect-a-free-custom-domain-optional)
4. [Step 4: Add Your Website to Google Search Console](#step-4-add-your-website-to-google-search-console)
5. [Step 5: Submit `sitemap.xml` for Google Indexing](#step-5-submit-sitemapxml-for-google-indexing)

---

## Step 1: Configure Your WhatsApp Number & Company Details

Open [`js/config.js`](file:///c:/Users/Dell/nexora/js/config.js) and update the `SITE_CONFIG` object:

```javascript
whatsapp: {
  // Enter digits ONLY with Country Code (NO '+', NO spaces, NO dashes)
  // Examples:
  // India: "919876543210"
  // United States: "15551234567"
  // United Kingdom: "447123456789"
  phoneNumber: "YOUR_WHATSAPP_NUMBER_HERE",
  displayNumber: "+1 (555) 123-4567",
  agentName: "Nexora Support Team"
}
```

---

## Step 2: Host for Free on GitHub Pages

GitHub Pages gives you **100% free static hosting with free HTTPS/SSL certificates**.

### 2.1 Initialize Git and Commit
Open PowerShell or your terminal in this project folder:

```powershell
# 1. Initialize Git repository
git init

# 2. Add all project files
git add .

# 3. Create your initial commit
git commit -m "Initial commit of professional static website with WhatsApp integration and SEO"
```

### 2.2 Create a New Repository on GitHub
1. Go to [GitHub.com](https://github.com) and log in.
2. Click the **`+`** icon at the top right and select **New repository**.
3. Name your repository (e.g., `nexora-website` or `<your-username>.github.io`).
4. Set the repository visibility to **Public** (required for free GitHub Pages).
5. Do **NOT** check "Initialize this repository with a README" (we already have files).
6. Click **Create repository**.

### 2.3 Push Your Code to GitHub
Run the following commands in your terminal (replace `<your-username>` and `<repo-name>` with yours):

```powershell
# Rename default branch to main
git branch -M main

# Link to your remote GitHub repository
git remote add origin https://github.com/<your-username>/<repo-name>.git

# Push the code
git push -u origin main
```

### 2.4 Enable GitHub Pages
1. Go to your repository on GitHub.
2. Click **Settings** (gear icon on the tab bar).
3. On the left sidebar, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment** > **Branch**:
   - Source: Select **Deploy from a branch**.
   - Branch: Select **`main`** and folder **`/ (root)`**.
5. Click **Save**.
6. Wait 1–2 minutes. Refresh the page, and GitHub will provide your live website URL:
   `https://<your-username>.github.io/<repo-name>/`

---

## Step 3: Connect a Free Custom Domain (Optional)

If you do not want to use `github.io` and want a free custom domain:

### Option A: FreeDNS (afraid.org) or DuckDNS
1. Sign up for a free domain at [FreeDNS (afraid.org)](https://freedns.afraid.org) or [DuckDNS](https://www.duckdns.org).
2. Choose a free subdomain (e.g., `yourbrand.mooo.com` or `yourbrand.duckdns.org`).
3. In the DNS management settings, create a **`CNAME` record** pointing to `<your-username>.github.io`.

### Option B: Cloudflare Pages (Free `*.pages.dev` with Instant SSL)
1. Sign up at [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your GitHub repository. Build settings: Framework preset = `None`, Output directory = `/` (root).
4. Click **Save and Deploy**. You'll get a lightning-fast custom domain like `https://nexora.pages.dev` for free.

### Adding CNAME in GitHub Pages:
If using a custom domain with GitHub Pages:
1. In your project, create a file named `CNAME` (no file extension).
2. Write your custom domain inside it (e.g., `www.yourcustomdomain.com`).
3. Commit and push to GitHub.
4. In **GitHub Repository Settings > Pages > Custom domain**, enter your domain and check **Enforce HTTPS**.

---

## Step 4: Add Your Website to Google Search Console

1. Visit [Google Search Console](https://search.google.com/search-console/about) and sign in with your Google account.
2. Click **Add Property**.
3. Select **URL prefix** (easiest for GitHub Pages) and enter your full live website URL:
   - Example: `https://<your-username>.github.io/<repo-name>/` or `https://yourdomain.com/`
4. Click **Continue**.

### Verify Ownership:
Choose **HTML tag** verification:
1. Copy the `meta` tag code provided by Google (e.g., `<meta name="google-site-verification" content="ABC123xyz..." />`).
2. Open [`index.html`](file:///c:/Users/Dell/nexora/index.html), locate line 16:
   ```html
   <meta name="google-site-verification" content="GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE_HERE" />
   ```
3. Replace the placeholder with your code, commit, and push to GitHub:
   ```powershell
   git add index.html
   git commit -m "Add Google Search Console verification code"
   git push origin main
   ```
4. Back in Google Search Console, click **Verify**. You will see: **"Ownership verified"**! 🎉

---

## Step 5: Submit `sitemap.xml` for Google Indexing

1. Update the domain in [`sitemap.xml`](file:///c:/Users/Dell/nexora/sitemap.xml) and [`robots.txt`](file:///c:/Users/Dell/nexora/robots.txt):
   - Replace `https://yourdomain.com` with your actual live URL (e.g., `https://<your-username>.github.io/<repo-name>/`).
2. In Google Search Console, open your verified property.
3. In the left sidebar under **Indexing**, click **Sitemaps**.
4. Under **Add a new sitemap**, type:
   ```text
   sitemap.xml
   ```
5. Click **Submit**.
6. Google will report **Status: Success**. Google's crawlers will automatically discover and index all your website sections (Home, About, Services, Contact)!

---

## 🛠️ Testing Locally Before Deploying

You can preview the website locally anytime:

```powershell
# Using Python (built-in):
python -m http.server 8000

# Or using Node.js:
npx serve .
```
Then open [http://localhost:8000](http://localhost:8000) in your browser!
