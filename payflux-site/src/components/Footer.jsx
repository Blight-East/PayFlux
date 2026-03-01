import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="py-16 border-t border-slate-100 bg-white">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <p className="text-slate-400 text-[13px]">
                        &copy; 2026 PayFlux
                    </p>
                    <p className="text-slate-300 text-[13px] mt-1">
                        Deterministic Reserve Projection Infrastructure
                    </p>
                </div>

                <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 text-[13px] text-slate-400">
                    <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                    <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                    <Link to="/refunds" className="hover:text-slate-900 transition-colors">Refunds</Link>
                    <Link to="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
