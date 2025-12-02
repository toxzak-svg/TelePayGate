import { Link } from 'react-router-dom';
import { 
  Zap, 
  Shield, 
  Globe, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle,
  Star,
  Users,
  DollarSign,
  Clock
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Conversions',
    description: 'Convert Telegram Stars to TON and fiat currencies in seconds with our P2P liquidity pools.'
  },
  {
    icon: Shield,
    title: 'Decentralized & Secure',
    description: 'No KYC, no intermediaries. Truly permissionless transactions on the TON blockchain.'
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Accept payments from Telegram users worldwide with multi-currency support.'
  },
  {
    icon: TrendingUp,
    title: 'Best Rates',
    description: 'Aggregated rates from DeDust, Ston.fi, and P2P pools ensure optimal pricing.'
  }
];

const stats = [
  { value: '$1M+', label: 'Volume Processed', icon: DollarSign },
  { value: '10K+', label: 'Active Users', icon: Users },
  { value: '<3s', label: 'Avg. Settlement', icon: Clock },
  { value: '99.9%', label: 'Uptime', icon: CheckCircle }
];

const steps = [
  { number: '01', title: 'Sign Up', description: 'Create your account in seconds with just an email' },
  { number: '02', title: 'Get API Key', description: 'Receive your unique API key to integrate with your app' },
  { number: '03', title: 'Integrate', description: 'Use our SDK to accept Telegram Stars payments' },
  { number: '04', title: 'Get Paid', description: 'Receive TON or fiat directly to your wallet' }
];

const testimonials = [
  {
    quote: "TelePayGate transformed how we handle payments. The integration was seamless and our users love paying with Stars.",
    author: "Alex Chen",
    role: "Founder, TeleBot Games",
    avatar: "AC"
  },
  {
    quote: "Best rates in the market and zero KYC requirements. Finally a payment solution that respects user privacy.",
    author: "Maria Santos",
    role: "CEO, Digital Nomads App",
    avatar: "MS"
  },
  {
    quote: "The P2P liquidity pools ensure we always get competitive rates. Support team is incredible.",
    author: "John Davis",
    role: "CTO, Star Merchants",
    avatar: "JD"
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold text-white">TelePayGate</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition">How It Works</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition">Testimonials</a>
              <Link 
                to="/login" 
                className="text-gray-300 hover:text-white transition"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/25"
              >
                Get Started
              </Link>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-3">
              <Link 
                to="/login" 
                className="text-gray-300 hover:text-white transition text-sm"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
            <Star className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-blue-300 text-sm">Telegram Stars → TON → Fiat</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            The Decentralized
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Payment Gateway
            </span>
            for Telegram
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            Accept Telegram Stars payments and convert them to TON or fiat currencies instantly. 
            No KYC, no intermediaries — powered by P2P liquidity pools.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/signup" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/onboarding" 
              className="w-full sm:w-auto bg-white/10 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition border border-white/20 flex items-center justify-center"
            >
              View Tutorial
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <stat.icon className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built for developers who want to integrate Telegram payments without the complexity
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div 
                key={feature.title} 
                className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition group"
              >
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition">
                  <feature.icon className="h-7 w-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Get started in minutes with our simple integration process
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent" />
                )}
                <div className="text-5xl font-bold text-blue-500/30 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link 
              to="/onboarding" 
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition font-medium"
            >
              View detailed tutorial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trusted by Developers
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Join thousands of developers already using TelePayGate
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div 
                key={testimonial.author} 
                className="bg-white/5 rounded-2xl p-8 border border-white/10"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-400 font-semibold">{testimonial.avatar}</span>
                  </div>
                  <div className="ml-4">
                    <div className="text-white font-semibold">{testimonial.author}</div>
                    <div className="text-gray-400 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-3xl p-12 border border-blue-500/30">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Create your free account today and start accepting Telegram Stars payments in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/signup" 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a 
                href="https://docs.telepaygate.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-gray-300 hover:text-white transition font-medium px-8 py-4"
              >
                Read Documentation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Zap className="h-6 w-6 text-blue-400" />
              <span className="ml-2 text-lg font-bold text-white">TelePayGate</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition text-sm">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition text-sm">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition text-sm">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} TelePayGate. Powered by TON Blockchain • Decentralized P2P
          </div>
        </div>
      </footer>
    </div>
  );
}
