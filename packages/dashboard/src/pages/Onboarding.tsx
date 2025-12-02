import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  Code,
  Terminal,
  Webhook,
  Wallet,
  Settings
} from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
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

  const steps: Step[] = [
    {
      id: 1,
      title: 'Create Your Account',
      description: 'Sign up with your email to get started',
      icon: Settings,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            Creating an account is quick and easy. You'll receive an API key immediately after signup.
          </p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
            <h4 className="text-white font-semibold mb-4">What you'll need:</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">A valid email address</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">A TON wallet address for receiving payments</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Your webhook URL (optional, can be added later)</span>
              </li>
            </ul>
          </div>
          <Link 
            to="/signup" 
            className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Create Account Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      )
    },
    {
      id: 2,
      title: 'Get Your API Key',
      description: 'Access your unique API credentials',
      icon: Code,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            After signup, you'll receive your API key. Keep it secure — it's used to authenticate all your requests.
          </p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
            <h4 className="text-white font-semibold mb-4">Your API Key Format:</h4>
            <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
              <code className="text-blue-400 font-mono text-sm">pk_live_xxxxxxxxxxxxxxxxxxxx</code>
              <button 
                onClick={() => copyToClipboard('pk_live_xxxxxxxxxxxxxxxxxxxx', 'api-key')}
                className="text-gray-400 hover:text-white transition p-2"
              >
                {copied === 'api-key' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-200 text-sm">
              <strong>Important:</strong> Never share your API key or commit it to version control. 
              Use environment variables to store it securely.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Install the SDK',
      description: 'Add TelePayGate to your project',
      icon: Terminal,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            Install our SDK to easily integrate TelePayGate into your application.
          </p>
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">npm</span>
                <button 
                  onClick={() => copyToClipboard('npm install @telepaygate/sdk', 'npm')}
                  className="text-gray-400 hover:text-white transition"
                >
                  {copied === 'npm' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <code className="text-green-400 font-mono text-sm">npm install @telepaygate/sdk</code>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">yarn</span>
                <button 
                  onClick={() => copyToClipboard('yarn add @telepaygate/sdk', 'yarn')}
                  className="text-gray-400 hover:text-white transition"
                >
                  {copied === 'yarn' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <code className="text-green-400 font-mono text-sm">yarn add @telepaygate/sdk</code>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: 'Initialize the Client',
      description: 'Set up TelePayGate in your code',
      icon: Code,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            Initialize the TelePayGate client with your API key to start making requests.
          </p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">TypeScript / JavaScript</span>
              <button 
                onClick={() => copyToClipboard(`import { TelePayGate } from '@telepaygate/sdk';

const client = new TelePayGate({
  apiKey: process.env.TELEPAYGATE_API_KEY,
});`, 'init')}
                className="text-gray-400 hover:text-white transition"
              >
                {copied === 'init' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <pre className="text-sm font-mono overflow-x-auto">
              <code className="text-gray-300">
{`import { TelePayGate } from '@telepaygate/sdk';

const client = new TelePayGate({
  apiKey: process.env.TELEPAYGATE_API_KEY,
});`}
              </code>
            </pre>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: 'Create a Payment',
      description: 'Generate a payment request for Telegram Stars',
      icon: Wallet,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            Create a payment to request Telegram Stars from your users. The SDK handles the conversion automatically.
          </p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Create Payment</span>
              <button 
                onClick={() => copyToClipboard(`const payment = await client.payments.create({
  amount: 100, // Stars amount
  description: 'Premium subscription',
  metadata: {
    userId: 'user_123',
    plan: 'premium'
  }
});

// Send payment.invoiceUrl to your Telegram bot
console.log(payment.invoiceUrl);`, 'payment')}
                className="text-gray-400 hover:text-white transition"
              >
                {copied === 'payment' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <pre className="text-sm font-mono overflow-x-auto">
              <code className="text-gray-300">
{`const payment = await client.payments.create({
  amount: 100, // Stars amount
  description: 'Premium subscription',
  metadata: {
    userId: 'user_123',
    plan: 'premium'
  }
});

// Send payment.invoiceUrl to your Telegram bot
console.log(payment.invoiceUrl);`}
              </code>
            </pre>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: 'Handle Webhooks',
      description: 'Receive payment notifications',
      icon: Webhook,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            Set up a webhook endpoint to receive real-time notifications when payments are completed.
          </p>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Express.js Webhook Handler</span>
              <button 
                onClick={() => copyToClipboard(`import express from 'express';
import { TelePayGate } from '@telepaygate/sdk';

const app = express();
const client = new TelePayGate({
  apiKey: process.env.TELEPAYGATE_API_KEY,
});

app.post('/webhooks/telepaygate', express.json(), async (req, res) => {
  const signature = req.headers['x-telepaygate-signature'];
  
  // Verify webhook signature
  if (!client.webhooks.verify(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  
  switch (event.type) {
    case 'payment.completed':
      console.log('Payment completed:', event.data.id);
      // Update your database, grant access, etc.
      break;
    case 'payment.failed':
      console.log('Payment failed:', event.data.id);
      break;
  }

  res.json({ received: true });
});`, 'webhook')}
                className="text-gray-400 hover:text-white transition"
              >
                {copied === 'webhook' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <pre className="text-sm font-mono overflow-x-auto max-h-80">
              <code className="text-gray-300">
{`import express from 'express';
import { TelePayGate } from '@telepaygate/sdk';

const app = express();
const client = new TelePayGate({
  apiKey: process.env.TELEPAYGATE_API_KEY,
});

app.post('/webhooks/telepaygate', express.json(), async (req, res) => {
  const signature = req.headers['x-telepaygate-signature'];
  
  // Verify webhook signature
  if (!client.webhooks.verify(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  
  switch (event.type) {
    case 'payment.completed':
      console.log('Payment completed:', event.data.id);
      // Update your database, grant access, etc.
      break;
    case 'payment.failed':
      console.log('Payment failed:', event.data.id);
      break;
  }

  res.json({ received: true });
});`}
              </code>
            </pre>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-200 text-sm">
              <strong>Tip:</strong> Configure your webhook URL in the dashboard Settings page to start receiving events.
            </p>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <Zap className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold text-white">TelePayGate</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-300 hover:text-white transition"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Getting Started with TelePayGate
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Follow this step-by-step guide to integrate Telegram Stars payments into your application.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                      index <= currentStep 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div 
                      className={`flex-1 h-1 mx-2 rounded transition ${
                        index < currentStep ? 'bg-blue-600' : 'bg-white/10'
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Step List */}
            <div className="lg:col-span-1 space-y-3">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full text-left p-4 rounded-xl transition ${
                    index === currentStep
                      ? 'bg-blue-600/20 border-2 border-blue-500'
                      : 'bg-white/5 border border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center">
                    <step.icon className={`h-5 w-5 mr-3 ${
                      index === currentStep ? 'text-blue-400' : 'text-gray-400'
                    }`} />
                    <div>
                      <div className={`font-semibold ${
                        index === currentStep ? 'text-white' : 'text-gray-300'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-sm text-gray-500">{step.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                <div className="flex items-center mb-6">
                  {(() => {
                    const StepIcon = steps[currentStep].icon;
                    return (
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mr-4">
                        <StepIcon className="h-6 w-6 text-blue-400" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-gray-400">{steps[currentStep].description}</p>
                  </div>
                </div>
                
                {steps[currentStep].content}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={`flex items-center px-4 py-2 rounded-lg transition ${
                      currentStep === 0
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </button>
                  
                  {currentStep < steps.length - 1 ? (
                    <button
                      onClick={nextStep}
                      className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Next Step
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      to="/signup"
                      className="flex items-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
                    >
                      Get Started Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">
              Need help? Check out our documentation or reach out to support.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <a 
                href="https://docs.telepaygate.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-400 hover:text-blue-300 transition"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Documentation
              </a>
              <span className="text-gray-600">•</span>
              <a 
                href="mailto:support@telepaygate.com"
                className="flex items-center text-blue-400 hover:text-blue-300 transition"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
