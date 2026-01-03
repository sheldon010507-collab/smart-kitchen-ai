export interface PlanLimits {
    items: number;
    scans: number;
    stores: number;
    members: number;
}

export interface PlanCard {
    id: 'free' | 'pro' | 'enterprise';
    name: string;
    icon: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    limits: PlanLimits;
    highlighted?: boolean;
    badge?: string;
}

export const plans: PlanCard[] = [
    {
        id: 'free',
        name: 'Free',
        icon: '🌱',
        price: '£0',
        period: '/month',
        description: 'Perfect for getting started',
        features: [
            '50 inventory items',
            '5 AI scans/month',
            'Basic shopping list',
            '1 team member'
        ],
        limits: {
            items: 50,
            scans: 5,
            stores: 1,
            members: 1
        }
    },
    {
        id: 'pro',
        name: 'Pro',
        icon: '☕',
        price: '£29',
        period: '/month',
        description: 'For growing restaurants',
        features: [
            '300 inventory items',
            'Unlimited AI scans',
            'Smart shopping list',
            'Expiry alerts',
            'Menu costing',
            '5 team members',
            'Analytics dashboard'
        ],
        highlighted: true,
        badge: 'MOST POPULAR',
        limits: {
            items: 300,
            scans: Infinity,
            stores: 1,
            members: 5
        }
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        icon: '🏢',
        price: 'Custom',
        period: '',
        description: 'For multi-location chains',
        features: [
            'Unlimited inventory',
            'Unlimited AI scans',
            'Unlimited stores',
            'Unlimited team members',
            'AI operational insights',
            'Priority support',
            'Custom integrations'
        ],
        badge: 'CONTACT US',
        limits: {
            items: Infinity,
            scans: Infinity,
            stores: Infinity,
            members: Infinity
        }
    }
];
