import { useState } from 'react';
import { Check, X, CreditCard, Building, Upload, CheckCircle, Sparkles } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentForm from '@/app/components/StripePaymentForm';
import BankPaymentForm from '@/app/components/BankPaymentForm';

// Mock Stripe publishable key - replace with your actual key
const stripePromise = loadStripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  description: string;
  features: string[];
  notIncluded: string[];
  popular?: boolean;
  color: string;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 19,
    billingPeriod: 'month',
    description: 'Perfect for freelancers just starting out',
    color: 'blue',
    features: [
      'Apply to 10 projects per month',
      'Basic profile visibility',
      'Email support',
      'Access to job board',
      'Mobile app access',
    ],
    notIncluded: [
      'Featured profile',
      'Priority support',
      'Advanced analytics',
      'Direct client messaging',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 49,
    billingPeriod: 'month',
    description: 'Best for established freelancers',
    color: 'purple',
    popular: true,
    features: [
      'Unlimited project applications',
      'Featured profile placement',
      'Priority customer support',
      'Advanced profile analytics',
      'Direct client messaging',
      'Portfolio showcase',
      'Skill assessments',
      'Custom proposal templates',
    ],
    notIncluded: [
      'Dedicated account manager',
      'API access',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    billingPeriod: 'month',
    description: 'For agencies and professional teams',
    color: 'green',
    features: [
      'Everything in Professional',
      'Multiple team member accounts',
      'Dedicated account manager',
      'API access for integrations',
      'White-label solutions',
      'Custom branding',
      'Advanced reporting & analytics',
      'Priority project matching',
      '24/7 premium support',
      'Custom contract templates',
    ],
    notIncluded: [],
  },
];

type PaymentMethod = 'online' | 'bank-transfer' | 'cash-deposit' | null;

export default function FreelancerSubscription() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
    setPaymentMethod(null);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm mb-6">
            <Sparkles className="size-4" />
            <span>Choose Your Plan</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Freelancer Subscription Plans
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Unlock your full potential with our flexible subscription plans designed for freelancers
            at every stage of their career
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-2xl ${
                plan.popular
                  ? 'border-purple-500 scale-105 md:scale-110'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-slate-600">/{plan.billingPeriod}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${
                          plan.color === 'blue' ? 'bg-blue-100' :
                          plan.color === 'purple' ? 'bg-purple-100' :
                          'bg-green-100'
                        }`}>
                          <Check className={`size-4 ${
                            plan.color === 'blue' ? 'text-blue-600' :
                            plan.color === 'purple' ? 'text-purple-600' :
                            'text-green-600'
                          }`} />
                        </div>
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.notIncluded.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      {plan.notIncluded.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0 rounded-full p-1 bg-slate-100">
                            <X className="size-4 text-slate-400" />
                          </div>
                          <span className="text-slate-400 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Get Started
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              <span>Secure payment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Complete Your Subscription</h2>
                  <p className="text-slate-600 mt-1">
                    {selectedPlan.name} Plan - ${selectedPlan.price}/{selectedPlan.billingPeriod}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="size-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Payment Method Selection */}
              {!paymentMethod && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Select Payment Method
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod('online')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <CreditCard className="size-6 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-slate-900">Online Payment</div>
                        <div className="text-sm text-slate-600">
                          Pay securely with credit/debit card via Stripe
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('bank-transfer')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                    >
                      <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                        <Building className="size-6 text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-slate-900">Bank Transfer</div>
                        <div className="text-sm text-slate-600">
                          Transfer funds directly to our bank account
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('cash-deposit')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                      <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Upload className="size-6 text-purple-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-slate-900">Cash Deposit</div>
                        <div className="text-sm text-slate-600">
                          Deposit cash and upload receipt for verification
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Online Payment (Stripe) */}
              {paymentMethod === 'online' && (
                <div>
                  <button
                    onClick={() => setPaymentMethod(null)}
                    className="mb-4 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    ← Back to payment methods
                  </button>
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm
                      plan={selectedPlan}
                      onSuccess={handleCloseModal}
                      onCancel={() => setPaymentMethod(null)}
                    />
                  </Elements>
                </div>
              )}

              {/* Bank Transfer / Cash Deposit */}
              {(paymentMethod === 'bank-transfer' || paymentMethod === 'cash-deposit') && (
                <div>
                  <button
                    onClick={() => setPaymentMethod(null)}
                    className="mb-4 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    ← Back to payment methods
                  </button>
                  <BankPaymentForm
                    plan={selectedPlan}
                    paymentMethod={paymentMethod}
                    onSuccess={handleCloseModal}
                    onCancel={() => setPaymentMethod(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
