# TrackIt Progress Tracker

A sophisticated, minimalist task management dashboard designed for high-focus individuals. TrackIt features hierarchical subtasks, manual progress overrides, and integrated focus timers to help you visualize your journey toward completion.

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/) (Functional Components, Hooks)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Utility-first CSS)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Module System**: ES6 Modules with [ESM.sh](https://esm.sh/) import maps
- **Persistence**: Browser `localStorage`

## 🛠️ Framework Preset

This project is structured as a **Vite (React + TypeScript)** or **Static Site** project. 

- **Entry Point**: `index.html`
- **Source**: `index.tsx` (Automatically handled via ESM imports)
- **Build Tool Recommendation**: [Vite](https://vitejs.dev/) is recommended for production builds.

## 🌐 Deployment

### Vercel
1. Push your code to a GitHub repository.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. **Framework Preset**: Select **Vite** or **Other**.
4. **Root Directory**: `./`
5. **Build Command**: `npm run build` (if using Vite) or leave empty for static deployment.
6. **Output Directory**: `dist` (if using Vite) or `./`.

### Netlify
1. Log in to [Netlify](https://app.netlify.com/).
2. Select **Add new site** > **Import an existing project**.
3. Choose your repository.
4. **Build command**: `npm run build`.
5. **Publish directory**: `dist`.
6. Click **Deploy**.

## 🔑 Environment Variables

Currently, **no environment variables are required** for the core functionality of TrackIt. 

Previously, an `API_KEY` for Google Gemini was used for AI-assisted task breakdown, but this has been removed to ensure the app remains a lightweight, privacy-focused manual tracker. If you wish to re-enable AI features in the future, you would need to add:

- `API_KEY`: Your Google Gemini API Key.

## 🎨 Features

- **Circular Visualizer**: High-level overview of total completion.
- **Hierarchical Tasks**: Manage complex projects with nested subtasks.
- **Granular Progress**: Manually set percentage completion for individual items.
- **Time Analysis**: Real-time logging of focus sessions with a dedicated breakdown per task.
- **Focus Timer**: Built-in Pomodoro-style timer with motivational feedback and audio cues.
- **Responsive UI**: Fully functional Dark and Light modes.
