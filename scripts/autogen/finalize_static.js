const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../../payflux-site/dist');
const authorityPages = [
    'what-is-payment-risk-observability',
    'signals',
    'architecture',
    'taxonomy',
    'glossary',
    'spec',
    'deterministic-risk-scoring',
    'processor-risk-intelligence',
    'security',
    'reliability',
    'auditability',
    'privacy',
    'terms',
    'refund',
    'refunds',
    'pricing'
];

authorityPages.forEach(page => {
    const htmlFile = path.join(distDir, `${page}.html`);
    const pageDir = path.join(distDir, page);

    if (fs.existsSync(htmlFile)) {
        if (!fs.existsSync(pageDir)) {
            fs.mkdirSync(pageDir, { recursive: true });
        }
        fs.renameSync(htmlFile, path.join(pageDir, 'index.html'));
        console.log(`Finalized: /${page} -> /${page}/index.html`);
    } else {
        console.warn(`Warning: Authority page file not found: ${htmlFile}`);
    }
});
