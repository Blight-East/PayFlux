import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="py-12 border-t border-slate-800/50 bg-slate-950">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-slate-600 text-sm">
                    &copy; 2026 PayFlux.
                </p>

                <div className="flex flex-wrap justify-center md:justify-end items-center gap-x-1 text-sm text-slate-600">
                    <Link to="/terms" className="hover:text-slate-400 transition-colors px-2">Terms</Link>
                    <span className="text-slate-800">|</span>
                    <Link to="/privacy" className="hover:text-slate-400 transition-colors px-2">Privacy</Link>
                    <span className="text-slate-800">|</span>
                    <Link to="/refunds" className="hover:text-slate-400 transition-colors px-2">Refunds</Link>
                    <span className="text-slate-800">|</span>
                    <Link to="/pricing" className="hover:text-slate-400 transition-colors px-2">Pricing</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
