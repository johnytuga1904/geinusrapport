# RapportGenius - Technischer Kontext

## Technologie-Stack
1. **Frontend**
   - React 18
   - TypeScript 5
   - Next.js 14
   - Tailwind CSS
   - Shadcn/ui

2. **Backend**
   - Supabase
   - PostgreSQL
   - Edge Functions
   - SendGrid API

3. **Entwicklungstools**
   - Node.js
   - npm
   - Git
   - VS Code

## Entwicklungsumgebung
1. **Setup**
   ```bash
   git clone https://github.com/johnytuga1904/geinusrapport.git
   cd rapportgeniusapp
   npm install
   npm run dev
   ```

2. **Umgebungsvariablen**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
   NEXT_PUBLIC_SENDGRID_API_KEY=your-sendgrid-key
   ```

## Abhängigkeiten
1. **Produktionsabhängigkeiten**
   - @supabase/supabase-js
   - @sendgrid/mail
   - @radix-ui/react-*
   - lucide-react
   - class-variance-authority
   - clsx
   - tailwind-merge

2. **Entwicklungsabhängigkeiten**
   - typescript
   - @types/react
   - @types/node
   - tailwindcss
   - postcss
   - autoprefixer

## API-Integration
1. **Supabase**
   - Authentifizierung
   - Datenbankoperationen
   - Echtzeit-Subscriptions

2. **SendGrid**
   - E-Mail-Templates
   - E-Mail-Versand
   - API-Key Management

## Datenbank-Schema
1. **Users**
   - id: uuid
   - email: string
   - created_at: timestamp

2. **Reports**
   - id: uuid
   - user_id: uuid (foreign key)
   - date: date
   - hours: number
   - location: string
   - description: text

## Deployment
1. **Entwicklung**
   - Lokaler Development Server
   - Hot Reloading
   - Debug Tools

2. **Produktion**
   - Vercel Deployment
   - Supabase Cloud
   - SendGrid Production API

## Sicherheit
1. **Authentifizierung**
   - JWT Tokens
   - Secure Session Management
   - Role-Based Access Control

2. **API-Sicherheit**
   - CORS-Konfiguration
   - Rate Limiting
   - Input Validation

## Performance
1. **Optimierungen**
   - Code Splitting
   - Lazy Loading
   - Image Optimization

2. **Caching**
   - API Response Cache
   - Static Site Generation
   - Incremental Static Regeneration

## Monitoring
1. **Fehler-Tracking**
   - Console Logging
   - Error Boundaries
   - API Error Handling

2. **Performance-Monitoring**
   - Vercel Analytics
   - Supabase Dashboard
   - SendGrid Statistics 