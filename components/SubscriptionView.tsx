import React, { useState } from 'react';
import { plans, PlanCard } from '../data/plans';
import { Check, Loader2, CreditCard, Sparkles } from 'lucide-react';
import { User, Business } from '../types';

interface SubscriptionViewProps {
    user: User;
    activeBusiness: Business | null;
}

export function SubscriptionView({ user, activeBusiness }: SubscriptionViewProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    // Mock current plan - in real app, fetch from DB
    const currentPlanId = 'free';

    const handleSelect = async (plan: PlanCard) => {
        if (plan.id === currentPlanId) return;

        if (plan.id === 'enterprise') {
            window.location.href = 'mailto:sales@smartkitchen.ai?subject=Enterprise%20Inquiry';
            return;
        }

        setLoadingPlan(plan.id);

        // Simulate API delay
        setTimeout(() => {
            // Here we would create a Stripe Checkout session
            const confirm = window.confirm(`Proceed to payment for ${plan.name} plan? (£${plan.price})`);
            if (confirm) {
                alert('Redirecting to Stripe Checkout...');
                // window.location.href = checkoutUrl;
            }
            setLoadingPlan(null);
        }, 800);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="mb-10 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
                    <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Upgrade your SmartKitchen</h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                    Unlock advanced AI features, unlimited inventory, and more team members.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const isCurrent = plan.id === currentPlanId;
                    const isLoading = loadingPlan === plan.id;

                    return (
                        <div key={plan.id} className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${plan.highlighted
                                ? 'border-primary shadow-xl scale-105 z-10'
                                : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                            }`}>
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg">
                                    {plan.badge}
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-4">
                                <div className="text-4xl">{plan.icon}</div>
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                            </div>

                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-bold tracking-tight text-gray-900">{plan.price}</span>
                                {plan.period && <span className="text-gray-500 ml-1 font-medium">{plan.period}</span>}
                            </div>

                            <div className="space-y-4 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-gray-600 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleSelect(plan)}
                                disabled={isCurrent || isLoading}
                                className={`w-full py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isCurrent
                                        ? 'bg-gray-100 text-gray-400 cursor-default'
                                        : plan.highlighted
                                            ? 'bg-primary text-white hover:bg-black shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5'
                                            : 'bg-white text-gray-900 border-2 border-gray-100 hover:border-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isCurrent ? (
                                    'Current Plan'
                                ) : plan.id === 'enterprise' ? (
                                    'Contact Sales'
                                ) : (
                                    <>
                                        <span>Upgrade Plan</span>
                                        <CreditCard className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-12 text-center text-sm text-gray-400">
                <p>Secure payment processing via Stripe. You can cancel anytime.</p>
            </div>
        </div>
    );
}
