import { Link } from 'react-router';
import { Search, Zap, Shield, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm mb-6">
                🎯 AI-Powered Matching
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
                Find the Perfect Match for Your{' '}
                <span className="text-blue-600">Next Project</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8">
                Connect with top freelancers or discover your next opportunity with our smart
                matching algorithm. Get matched based on skills, experience, and project requirements.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/projects"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Projects
                  <ArrowRight className="size-5" />
                </Link>
                <Link
                  to="/freelancers"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Find Freelancers
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758612215020-842383aadb9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlbGFuY2UlMjByZW1vdGUlMjB3b3JrJTIwbGFwdG9wfGVufDF8fHx8MTc2OTkwNzUxMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Freelancer working"
                  className="w-full h-auto"
                />
              </div>
              {/* Floating Stats */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircle className="size-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">50K+</div>
                    <div className="text-sm text-slate-600">Successful Matches</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Why Choose Workify?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our platform uses intelligent matching to connect the right people with the right opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 rounded-lg p-3 w-fit mb-4">
                <Zap className="size-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Smart Matching</h3>
              <p className="text-slate-600">
                Our AI algorithm analyzes skills, experience, and project requirements to find the
                perfect matches instantly.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-green-100 rounded-lg p-3 w-fit mb-4">
                <Shield className="size-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Verified Profiles</h3>
              <p className="text-slate-600">
                All freelancers are verified and reviewed, ensuring you work with trusted
                professionals every time.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 rounded-lg p-3 w-fit mb-4">
                <TrendingUp className="size-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Track Record</h3>
              <p className="text-slate-600">
                See detailed ratings, reviews, and completed projects to make informed decisions
                with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full size-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Create Your Profile</h3>
              <p className="text-slate-600">
                Sign up and tell us about your skills, experience, or project requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full size-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Get Smart Matches</h3>
              <p className="text-slate-600">
                Our AI analyzes your profile and recommends the best matches for you.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full size-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Start Collaborating</h3>
              <p className="text-slate-600">
                Connect with matches, discuss details, and start working together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg mb-8 text-blue-100">
              Join thousands of freelancers and clients finding success on Workify
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold">
                Sign Up as Freelancer
              </button>
              <button className="px-8 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors font-semibold">
                Post a Project
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
