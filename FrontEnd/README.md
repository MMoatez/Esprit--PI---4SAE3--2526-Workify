
  # Workify - Freelance Project Matching Platform

  This is an Angular 18 application for a Freelance Project Matching Platform. The original design is available at https://www.figma.com/design/7e2Z8oZtp2FQ6CG47ATpmh/Freelance-Project-Matching-Platform.

  ## Technology Stack

  - **Angular 18** - Frontend framework with module-based architecture
  - **TypeScript** - Type-safe programming language
  - **Tailwind CSS** - Utility-first CSS framework for styling
  - **RxJS** - Reactive programming library
  - **Angular Router** - For navigation and routing
  - **Lazy Loading** - Feature modules loaded on demand

  ## Project Structure

  ```
  src/
  ├── app/
  │   ├── modules/           # Feature modules
  │   │   ├── home/         # Home page module
  │   │   ├── projects/     # Projects browsing and details
  │   │   ├── freelancer/   # Freelancer profiles and subscription
  │   │   └── payment/      # Payment forms (Bank and Stripe)
  │   ├── shared/           # Shared components and modules
  │   ├── core/             # Core services and guards
  │   ├── app.component.*   # Root application component
  │   ├── app.module.ts     # Root module
  │   └── app-routing.module.ts  # Main routing configuration
  ├── assets/               # Static resources
  ├── environments/         # Environment configurations
  └── styles/               # Global styles
      ├── fonts.css        # Font definitions
      └── theme.css        # Theme variables
  ```

  ## Getting Started

  ### Prerequisites

  - Node.js (v18 or higher recommended)
  - npm (v9 or higher)

  ### Installation

  1. Clone the repository
  2. Install dependencies:

  ```bash
  npm install
  ```

  ### Development

  Start the development server:

  ```bash
  npm start
  ```

  Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

  ### Build

  Build the project for production:

  ```bash
  npm run build
  ```

  The build artifacts will be stored in the `dist/` directory.

  ### Testing

  Run unit tests:

  ```bash
  npm test
  ```

  ### Code Scaffolding

  Generate new components:

  ```bash
  ng generate component component-name
  ```

  Generate other Angular elements:

  ```bash
  ng generate directive|pipe|service|class|guard|interface|enum|module
  ```

  ## Features

  - **Smart Project Matching** - AI-powered matching algorithm
  - **Browse Projects** - Search and filter available projects
  - **Find Freelancers** - Discover talented professionals
  - **Subscription Plans** - Multiple tiers for freelancers
  - **Payment Integration** - Bank transfer and Stripe payment options
  - **Responsive Design** - Mobile-first approach with Tailwind CSS
  - **Lazy Loading** - Optimized performance with lazy-loaded modules

  ## Routes

  - `/` - Home page
  - `/projects` - Browse all projects
  - `/projects/:id` - Project details
  - `/freelancers` - Find freelancers
  - `/freelancers/subscription` - Subscription plans
  - `/payment/bank` - Bank payment form
  - `/payment/stripe` - Stripe payment form
  - `/not-found` - 404 error page

  ## Architecture

  This project follows Angular's module-based architecture (not standalone components):

  - **Modules**: Each feature area has its own module for better organization
  - **Lazy Loading**: Feature modules are lazy-loaded to improve initial load time
  - **Routing**: Hierarchical routing with child routes
  - **Services**: Shared services in the core module
  - **Components**: Reusable components in the shared module

  ## Redesign & Backend Documentation

  The UI has been redesigned with a modern teal/indigo/amber palette, Plus Jakarta Sans typography, glassmorphism header, and smooth animations. For backend and deployment:

  - **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** – Microservices design (User, Project, Notification services), API Gateway, events, Docker/Kubernetes.
  - **[docs/BACKEND-SPRING-BOOT.md](docs/BACKEND-SPRING-BOOT.md)** – Spring Boot REST APIs, PostgreSQL/JPA, JWT auth with code examples.
  - **[docs/INTEGRATION-PLAN.md](docs/INTEGRATION-PLAN.md)** – Step-by-step plan to connect this Angular app to the backend (env, interceptors, auth, API services).

  Optional: use `proxy.conf.json` and `ng serve --proxy-config proxy.conf.json` to proxy `/api` to your backend during development.

  ## Styling

  The project uses Tailwind CSS for styling:

  - Utility-first approach
  - Responsive design utilities
  - Custom theme configuration in `tailwind.config.js`
  - Global styles in `src/styles.scss`

  ## Contributing

  1. Fork the repository
  2. Create a feature branch
  3. Make your changes
  4. Submit a pull request

  ## License

  This project is private and proprietary.
  