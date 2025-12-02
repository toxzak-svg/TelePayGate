import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Copy,
  User,
  Key,
  Terminal,
  Code,
  CreditCard,
  Webhook
} from 'lucide-react';

interface Step {
  id: number;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ code, id, label }: { code: string; id: string; label?: string }) => (
    <div className="bg-[#0d0d12] rounded-xl border border-white/5 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <span className="text-xs text-gray-500">{label}</span>
          <button 
            onClick={() => copyToClipboard(code, id)}
            className="text-gray-500 hover:text-white transition"
          >
            {copied === id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}
      <pre className="p-4 text-sm font-mono overflow-x-auto">
        <code className="text-gray-300">{code}</code>
      </pre>
    </div>
  );

  const steps: Step[] = [
    {
      id: 1,
      title: 'Create account',
      icon: User,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 leading-relaxed">
            Sign up with your email to get started. You'll receive an API key immediately.
          </p>
          <div className="space-y-3">
            {['Valid email address', 'TON wallet for payouts', 'Webhook URL (optional)'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Check className="h-3 w-3 text-violet-400" />
                </div>
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <Link 
            to="/signup" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition"
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )
    },
    {
      id: 2,
      title: 'Get API key',
      icon: Key,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 leading-relaxed">
            After signup, you'll receive your API key. Keep it secure.
          </p>
          <CodeBlock 
            code="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx" 
            id="api-key" 
            label="Your API Key"
          />
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-200 text-sm">
              Never share or commit your API key. Use environment variables.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Install SDK',
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <p className="text-gray-400 leading-relaxed">
            Install the TelePayGate SDK in your project.
          </p>
          <CodeBlock 
            code="npm install @telepaygate/sdk" 
            id="npm" 
            label="npm"
          />
          <CodeBlock 
            code="yarn add @telepaygate/sdk" 
            id="yarn" 
            label="yarn"
          />
        </div>
      )
    },
    {
      id: 4,
      title: 'Initialize',
      icon: Code,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 leading-relaxed">
            Initialize the client with your API key.
          </p>
          <CodeBlock 
            code={`import { TelePayGate } from '@telepaygate/sdk';

const client = new TelePayGate({
  apiKey: process.env.TELEPAYGATE_API_KEY,
});`}
            id="init" 
            label="TypeScript"
          />
        </div>
      )
    },
    {
      id: 5,
      title: 'Create payment',
      icon: CreditCard,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 leading-relaxed">
            Create a payment to request Telegram Stars from users.
          </p>
          <CodeBlock 
            code={`const payment = await client.payments.create({
  amount: 100,
  description: 'Premium subscription',
  metadata: { userId: 'user_123' }
});

console.log(payment.invoiceUrl);`}
            id="payment" 
            label="Create Payment"
          />
        </div>
      )
    },
    {
      id: 6,
      title: 'Handle webhooks',
      icon: Webhook,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 leading-relaxed">
            Receive real-time notifications when payments complete.
          </p>
          <CodeBlock 
            code={`app.post('/webhook', async (req, res) => {
  const sig = req.headers['x-telepaygate-signature'];
  
  if (!client.webhooks.verify(req.body, sig)) {
    return res.status(401).send('Invalid');
  }

  if (req.body.type === 'payment.completed') {
    // Grant access to user
  }

  res.json({ received: true });
});`}
            id="webhook" 
            label="Express.js"
          />
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">TelePayGate</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-400 hover:text-white transition text-sm">
                Login
              </Link>
              <Link 
                to="/signup" 
                className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-white mb-3">
              Quick Start Guide
            </h1>
            <p className="text-gray-500">
              Get up and running in under 5 minutes
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className="flex items-center"
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                    index <= currentStep 
                      ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white' 
                      : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${index < currentStep ? 'bg-violet-500' : 'bg-white/10'}`} />
                )}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Step List */}
            <div className="lg:col-span-1 space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center gap-3 ${
                    index === currentStep
                      ? 'bg-violet-500/10 border border-violet-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <step.icon className={`h-4 w-4 ${index === currentStep ? 'text-violet-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${index === currentStep ? 'text-white' : 'text-gray-400'}`}>
                    {step.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white/[0.02] rounded-2xl p-8 border border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  {(() => {
                    const StepIcon = steps[currentStep].icon;
                    return (
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center">
                        <StepIcon className="h-5 w-5 text-violet-400" />
                      </div>
                    );
                  })()}
                  <h2 className="text-xl font-semibold text-white">
                    {steps[currentStep].title}
                  </h2>
                </div>
                
                {steps[currentStep].content}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                  <button
                    onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                    disabled={currentStep === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                      currentStep === 0
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </button>
                  
                  {currentStep < steps.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="flex items-center gap-2 bg-white/10 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      to="/signup"
                      className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
                    >
                      Get started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
