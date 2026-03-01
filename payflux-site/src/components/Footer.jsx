import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="py-16 border-t border-white/[0.06] bg-slate-950">
            <div className="max-w-[960px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <p className="text-slate-500 text-[13px]">
                        &copy; 2026 PayFlux
                    </p>
                    <p className="text-slate-600 text-[13px] mt-1">
                        Deterministic Reserve Projection Infrastructure
                    </p>
                </div>

                <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 text-[13px] text-slate-500">
                    <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <Link to="/refunds" className="hover:text-white transition-colors">Refunds</Link>
                    <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
