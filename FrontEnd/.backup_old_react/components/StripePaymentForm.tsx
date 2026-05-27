import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, Loader2, CheckCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
}

interface StripePaymentFormProps {
  plan: Plan;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({ plan, onSuccess, onCancel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!cardholderName || !email) {
      setError('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    setError(null);

    // Simulate payment processing
    try {
      // In a real application, you would create a payment intent on your server
      // and confirm it here with stripe.confirmCardPayment()
      
      // Mock successful payment after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure for demo purposes
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        throw new Error('Payment failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during payment');
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1e293b',
        '::placeholder': {
          color: '#94a3b8',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center size-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="size-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
        <p className="text-slate-600 mb-4">
          Your subscription to the {plan.name} plan has been activated.
        </p>
        <p className="text-sm text-slate-500">Redirecting you now...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <CreditCard className="size-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Secure Online Payment</h3>
            <p className="text-sm text-slate-600">Powered by Stripe</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Lock className="size-4" />
          <span>Your payment information is encrypted and secure</span>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-600">{plan.name} Plan</span>
            <span className="font-semibold text-slate-900">${plan.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Billing Period</span>
            <span className="text-slate-900">{plan.billingPeriod}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-900">Total Due Today</span>
              <span className="text-2xl font-bold text-blue-600">${plan.price}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Cardholder Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Cardholder Name *
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Card Element */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Card Information *
          </label>
          <div className="border border-slate-300 rounded-lg px-4 py-3 bg-white">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Test card: 4242 4242 4242 4242, any future expiry date, any CVC
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || processing}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay ${plan.price}</>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs text-slate-500">
          <p>By confirming your subscription, you agree to our Terms of Service.</p>
          <p className="mt-1">You can cancel your subscription at any time.</p>
        </div>
      </form>
    </div>
  );
}
