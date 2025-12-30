import { Link } from 'react-router-dom';
import {
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Instant conversions from Telegram Stars to TON or fiat.'
  },
  {
    icon: Shield,
    title: 'No KYC Required',
    description: 'Fully decentralized. No intermediaries or verification.'
  },
  {
    icon: Sparkles,
    title: 'Best Rates',
    description: 'Aggregated from DeDust, Ston.fi, and P2P pools.'
  }
];

const steps = [
  { step: '1', title: 'Create account', description: 'Sign up in seconds' },
  { step: '2', title: 'Get your API key', description: 'Instant access' },
  { step: '3', title: 'Start accepting', description: 'Integrate & go live' }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <div className="w-7 sm:w-8 h-7 sm:h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <Zap className="h-4 sm:h-5 w-4 sm:w-5 text-white" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-white">TelePayGate</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link to="/onboarding" className="text-gray-400 hover:text-white transition text-xs sm:text-sm hidden sm:block">
                Docs
              </Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition text-xs sm:text-sm">
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-white text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium hover:bg-gray-100 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6" style={{ paddingTop: '10rem' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1.5 mb-6 sm:mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-gray-400 text-xs sm:text-sm">Now supporting 50+ currencies</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
            Accept{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              Telegram Stars
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            The decentralized payment gateway for converting Stars to TON and fiat.
            No KYC, instant settlements, best rates.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium hover:opacity-90 transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/onboarding"
              className="w-full sm:w-auto text-gray-300 hover:text-white px-6 sm:px-8 py-3 sm:py-4 transition font-medium text-sm sm:text-base"
            >
              View documentation →
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-10 sm:mt-16 text-gray-500 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>Instant payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white/[0.02] rounded-2xl p-6 sm:p-8 border border-white/5 hover:border-white/10 transition group"
              >
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4 sm:mb-5">
                  <feature.icon className="h-5 sm:h-6 w-5 sm:w-6 text-violet-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Up and running in minutes
            </h2>
            <p className="text-gray-500 text-sm sm:text-base">
              Simple integration, powerful results
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-white font-bold text-sm sm:text-base">
                  {item.step}
                </div>
                <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">{item.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-white/5">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Ready to get started?
            </h2>
            <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
              Join developers building the future of Telegram payments.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-full font-medium hover:bg-gray-100 transition text-sm sm:text-base"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-md flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs sm:text-sm text-gray-500">© {new Date().getFullYear()} TelePayGate</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
            <a href="/PRIVACY/" className="hover:text-white transition" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="/TERMS/" className="hover:text-white transition" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="mailto:support@example.com" className="hover:text-white transition">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
