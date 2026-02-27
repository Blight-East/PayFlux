import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="py-20 border-t border-white/5 bg-[#0a0c10] text-slate-300">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                        © 2026 PayFlux.
                    </p>
                    <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                        Deterministic Reserve Projection Infrastructure.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
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
