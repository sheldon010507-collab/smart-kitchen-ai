import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SupabaseLogin from '../components/SupabaseLogin';
import { ViewState } from '../types';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLoginSuccess = (user: any, role: string) => {
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
