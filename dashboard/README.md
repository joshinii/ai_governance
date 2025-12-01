# AI Governance Dashboard

React-based admin dashboard for monitoring and controlling enterprise AI usage.

## Features

- **Dashboard Overview** - High-level statistics and insights
- **Usage Analytics** - Detailed charts and user activity tracking
- **Compliance Alerts** - Policy violations and security alerts
- **Prompt Improvements** - Track adoption of improved prompts
- **Policies Management** - Configure AI usage rules

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Axios** - API client
- **Lucide React** - Icons

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `https://blah-subsequent-personal-synthetic.trycloudflare.com`

## Setup Instructions

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your backend URL and API key
```

**`.env` file:**
```env
VITE_API_URL=https://blah-subsequent-personal-synthetic.trycloudflare.com
VITE_API_KEY=dev-secret-key-change-in-production
```

### 3. Start Development Server

```bash
npm run dev
```

Dashboard will be available at `https://surrey-tide-neutral-presence.trycloudflare.com`

### 4. Build for Production

```bash
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
dashboard/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   └── Layout.jsx   # Main layout with sidebar
│   ├── pages/           # Route pages
│   │   ├── Dashboard.jsx
│   │   ├── UsageAnalytics.jsx
│   │   ├── ComplianceAlerts.jsx
│   │   ├── PromptImprovements.jsx
│   │   └── Policies.jsx
│   ├── services/        # API integration
│   │   └── api.js       # Backend API client
│   ├── utils/           # Helper functions
│   ├── App.jsx          # Root component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## API Integration

The dashboard communicates with the backend API through `src/services/api.js`.

All requests include the API key in the `X-API-Key` header.

### API Endpoints Used

- `GET /analytics/usage` - Usage statistics
- `GET /analytics/prompt-improvements` - Prompt stats
- `GET /usage-logs/` - Usage history
- `GET /alerts` - Compliance alerts
- `PATCH /alerts/{id}/resolve` - Resolve alert
- `GET /policies/{org_id}` - Get policies
- `POST /policies` - Create policy

## Development

### Running with Backend

1. Start backend: `cd ../backend && docker-compose up`
2. Start dashboard: `npm run dev`
3. Access at `https://surrey-tide-neutral-presence.trycloudflare.com`

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

### Modifying API Calls

Edit `src/services/api.js` to add/modify API endpoints.

## Troubleshooting

**CORS errors:**
- Ensure backend `ALLOWED_ORIGINS` includes `https://surrey-tide-neutral-presence.trycloudflare.com`
- Check backend is running

**API key errors:**
- Verify `VITE_API_KEY` in `.env` matches backend `API_KEY_SECRET`

**Module not found:**
- Run `npm install` again
- Delete `node_modules` and reinstall

**Charts not displaying:**
- Check if data is being returned from API
- Verify recharts is installed: `npm install recharts`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Production Deployment

### Option 1: Static Hosting (Netlify, Vercel)

```bash
npm run build
# Deploy the 'dist' folder
```

Configure environment variables in hosting platform.

### Option 2: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t dashboard .
docker run -p 80:80 dashboard
```

## Screenshots

### Dashboard Overview
Shows total prompts, active users, open alerts, and high-risk prompts.

### Usage Analytics
Charts displaying AI tool usage and risk distribution.

### Compliance Alerts
Table of policy violations with resolve actions.

### Prompt Improvements
Statistics on prompt variant adoption rates.

### Policies Management
Create and manage AI usage policies.

## License

Proprietary - Internal Use Only

## Support

For issues or questions, contact the development team.
