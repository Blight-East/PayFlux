
import { getDocBySlug } from '@/lib/docs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getBaseUrl } from '@/lib/seo';

interface DocsPageProps {
    params: Promise<{
        slug?: string[];
    }>;
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
    const { slug } = await params;
    const doc = await getDocBySlug(slug || []);

    if (!doc) {
        return {
            title: 'Not Found',
            description: 'The requested documentation page could not be found.'
        };
    }


    // Enforce canonical base domain = https://payflux.dev for ALL docs pages
    const canonicalBase = 'https://payflux.dev';
    // Handle root /docs vs sub-pages to avoid trailing slash on root if doc.slug is empty
    const suffix = doc.slug ? `/${doc.slug}` : '';
    const canonicalUrl = `${canonicalBase}/docs${suffix}`;

    return {
        title: doc.title,
        description: doc.description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: doc.title,
            description: doc.description,
            type: 'article',
            url: canonicalUrl,
        },
        robots: {
            index: true,
            follow: true,
        }
    };
}

export default async function DocsPage({ params }: DocsPageProps) {
    const { slug } = await params;
    const doc = await getDocBySlug(slug || []);

    if (!doc) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="mb-8">
                <Link
                    href="/docs"
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    ← Back to Index
                </Link>
            </div>

            <article className="prose prose-slate max-w-none">
                {/* Title is typically handled by H1 in markdown content, but we ensure it's semantic */}
                {/* We rely on the renderer to output the H1 from markdown */}

                <div
                    dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
                    className="docs-content"
                />
            </article>

            {/* Basic styles for critical readablity if Tailwind prose plugin isn't fully configured or fails */}
            <style>{`
        .docs-content h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1.5rem; margin-top: 0; }
        .docs-content h2 { font-size: 1.5rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; }
        .docs-content h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .docs-content p { margin-bottom: 1.25rem; line-height: 1.75; }
        .docs-content ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1.25rem; }
        .docs-content li { margin-bottom: 0.5rem; }
        .docs-content pre { background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1.5rem; }
        .docs-content code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875em; }
        .docs-content pre code { background-color: transparent; padding: 0; }
        .docs-content blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; font-style: italic; color: #475569; margin-bottom: 1.25rem; }
        .docs-content a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
        .docs-content a:hover { color: #1d4ed8; }
        .docs-content img { max-width: 100%; height: auto; border-radius: 0.5rem; }
      `}</style>
        </div>
    );
}
