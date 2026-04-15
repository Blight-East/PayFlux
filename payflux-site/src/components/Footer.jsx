import React from 'react';
import { Link } from 'react-router-dom';

const themes = {
    light: {
        container: 'border-t border-slate-200 bg-white',
        text: 'text-slate-500',
        link: 'text-slate-500 hover:text-slate-900',
        active: 'text-slate-900',
        divider: 'bg-slate-300',
        mark: 'bg-[#0A64BC]',
    },
    dark: {
        container: 'border-t border-white/[0.06] bg-[#0A0B0E]',
        text: 'text-[#636872]',
        link: 'text-[#636872] hover:text-white',
        active: 'text-white',
        divider: 'bg-white/10',
        mark: 'bg-[#0A64BC]',
    },
};

const Footer = ({ variant = 'light' }) => {
    const t = themes[variant] || themes.light;

    return (
        <footer className={t.container}>
            <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-8 md:py-12">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className={`block h-4 w-4 ${t.mark}`} aria-hidden />
                        <span className={`font-mono text-[11px] uppercase tracking-[0.22em] ${t.text}`}>
                            PayFlux Intelligence Desk
                        </span>
                    </div>

                    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.22em] ${t.text}`}>
                        <Link to="/terms" className={`no-underline ${t.link}`}>Terms</Link>
                        <Link to="/privacy" className={`no-underline ${t.link}`}>Privacy</Link>
                        <Link to="/refunds" className={`no-underline ${t.link}`}>Refunds</Link>
                        <Link to="/pricing" className={`no-underline ${t.link}`}>Pricing</Link>
                        <Link to="/reports" className={`no-underline ${t.link}`}>Filings</Link>
                    </div>
                </div>

                <div className={`mt-8 border-t ${variant === 'light' ? 'border-slate-200' : 'border-white/[0.06]'} pt-6 text-[12px] ${t.text}`}>
                    &copy; {new Date().getFullYear()} PayFlux. &nbsp;Operational intelligence for Stripe merchants.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
