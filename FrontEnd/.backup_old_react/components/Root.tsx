import { Outlet, Link, useLocation } from 'react-router';
import { Search, Briefcase, Users, Menu, CreditCard } from 'lucide-react';
import { useState } from 'react';

export default function Root() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-2">
                <Briefcase className="size-6 text-white" />
              </div>
              <span className="font-semibold text-xl text-slate-900">Workify</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/') && location.pathname === '/'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="size-4" />
                <span>Home</span>
              </Link>
              <Link
                to="/projects"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/projects')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="size-4" />
                <span>Browse Projects</span>
              </Link>
              <Link
                to="/freelancers"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/freelancers')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="size-4" />
                <span>Find Freelancers</span>
              </Link>
              <Link
                to="/subscription"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/subscription')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="size-4" />
                <span>Subscription</span>
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors">
                Sign In
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Get Started
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            >
              <Menu className="size-6" />
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/') && location.pathname === '/'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="size-4" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/projects')
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="size-4" />
                  <span>Browse Projects</span>
                </Link>
                <Link
                  to="/freelancers"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/freelancers')
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="size-4" />
                  <span>Find Freelancers</span>
                </Link>
                <Link
                  to="/subscription"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/subscription')
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="size-4" />
                  <span>Subscription</span>
                </Link>
                <div className="flex flex-col gap-2 mt-4">
                  <button className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 rounded-lg">
                    Sign In
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Get Started
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-600 rounded-lg p-2">
                  <Briefcase className="size-5 text-white" />
                </div>
                <span className="font-semibold text-lg text-slate-900">Workify</span>
              </div>
              <p className="text-slate-600 text-sm">
                Connecting talented freelancers with amazing projects through smart matching.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">For Clients</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Post a Project</a></li>
                <li><a href="#" className="hover:text-slate-900">Find Freelancers</a></li>
                <li><a href="#" className="hover:text-slate-900">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">For Freelancers</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Browse Projects</a></li>
                <li><a href="#" className="hover:text-slate-900">Create Profile</a></li>
                <li><a href="#" className="hover:text-slate-900">Success Stories</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">About Us</a></li>
                <li><a href="#" className="hover:text-slate-900">Contact</a></li>
                <li><a href="#" className="hover:text-slate-900">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-8 pt-8 text-center text-sm text-slate-600">
            <p>&copy; 2026 Workify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}