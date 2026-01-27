import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBusiness } from '../lib/BusinessContext';
import SupabaseLogin from '../components/SupabaseLogin';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setCurrentBusinessId } = useBusiness();

    const handleLoginSuccess = (user: any, role: string, businessId?: string) => {
        // Set the active business if one was found during login (Crucial for Staff)
        if (businessId) {
            setCurrentBusinessId(businessId);
        }

        // Check for 'plan' query param for redirection
        const searchParams = new URLSearchParams(location.search);
        const plan = searchParams.get('plan') || sessionStorage.getItem('target_plan');

        if (plan && plan !== 'free') {
            sessionStorage.removeItem('target_plan');
            navigate('/subscription');
            return;
        }

        navigate('/dashboard');
    };

    return (
        <SupabaseLogin onLoginSuccess={handleLoginSuccess} />
    );
};
