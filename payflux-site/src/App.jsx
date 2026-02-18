import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refunds from './pages/Refunds';
import Pricing from './pages/Pricing';
import RetryStormAnalyzer from './pages/RetryStormAnalyzer';
import Signals from './pages/Signals';
import Taxonomy from './pages/Taxonomy';
import Glossary from './pages/Glossary';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refunds" element={<Refunds />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/tools/retry-storm-analyzer" element={<RetryStormAnalyzer />} />
                <Route path="/signals" element={<Signals />} />
                <Route path="/taxonomy" element={<Taxonomy />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="*" element={<Home />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
