# Deployment Guide

## GitHub Pages Deployment (Recommended)

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `cut-ratio-sequencer`
3. Make it Public
4. Click "Create repository"

### Step 2: Push Code to GitHub
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Cut Ratio Sequencer v1.0"

# Add remote (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/cut-ratio-sequencer.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section (or click "Pages" in left sidebar)
4. Under "Source", select **GitHub Actions**
5. The workflow file `.github/workflows/deploy.yml` is already included

### Step 4: Verify Deployment
1. Go to **Actions** tab in your repository
2. You should see the workflow running
3. Once complete, your site will be live at:
   `https://YOUR_USERNAME.github.io/cut-ratio-sequencer`

## Alternative Hosting Options

### Netlify (Drag & Drop)
1. Go to https://app.netlify.com/drop
2. Drag and drop the entire project folder
3. Your site is live instantly

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy
```

## Local Development

### Option 1: Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# Open http://localhost:8000
```

### Option 2: Node.js Serve
```bash
# Install serve globally
npm install -g serve

# Serve current directory
serve .

# Or with npx (no install)
npx serve .
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Updating Your Site

After making changes:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

GitHub Actions will automatically rebuild and deploy.

## Troubleshooting

### Site not updating?
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check Actions tab for build errors
- Ensure GitHub Pages source is set to "GitHub Actions"

### Excel file not parsing?
- Ensure file is .xlsx or .xls format
- Check browser console for error messages
- Verify sheet names match expected format

### CORS errors?
- This is a client-side only app, no server needed
- If testing locally, use a local server (not file:// protocol)

## Custom Domain (Optional)

1. Add a `CNAME` file with your domain:
```
www.yourdomain.com
```

2. Configure DNS:
   - CNAME record pointing to `YOUR_USERNAME.github.io`

3. Enable HTTPS in repository Settings → Pages
