# Claude Code Configuration

This file helps Claude understand your project better and work more effectively with your codebase.

## Project Information
- **Project Type**: Next.js application with TypeScript
- **Main Framework**: React with Next.js App Router
- **Authentication**: better-auth
- **UI Components**: Tailwind CSS with shadcn/ui components
- **Database**: (Add your database type here)

## Development Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build production
npm run build

# Linting
npm run lint

# Type checking
npm run typecheck

# Testing
npm run test
```

## Code Conventions
- Use TypeScript for all new code
- Follow React functional components with hooks
- Use Tailwind CSS for styling
- Components should be placed in `/components` directory
- Pages use Next.js App Router structure in `/app`
- Authentication handled via better-auth client

## Important Directories
- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions and configurations
- `/public` - Static assets

## Notes for Claude
- Always run `npm run lint` and `npm run typecheck` after making changes
- Use existing UI components from shadcn/ui when possible
- Follow the established authentication patterns using authClient
- Maintain consistent TypeScript interfaces and types