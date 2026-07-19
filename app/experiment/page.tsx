import Link from 'next/link';

const experiments = [
    { href: '/experiment/products', label: 'Products' },
    { href: '/experiment/ui/pinecone-index-selector', label: 'Pinecone Index Selector' },
    { href: '/experiment/ui/similarity-threshold-slider', label: 'Similarity Threshold Slider' },
    { href: '/experiment/ui/use-general-knowledge-checkbox', label: 'General Knowledge Checkbox' },
] as const;

export default function ExperimentPage() {
    return (
        <main className="app-page">
            <div className="app-container">
                <header className="page-heading">
                    <h1 className="page-title text-blue-600">Experiments</h1>
                    <p className="page-description">
                        Prototype pages for testing application features and UI components.
                    </p>
                </header>

                <section className="surface-panel surface-panel-spacious surface-panel-compact">
                    <ul>
                        {experiments.map((experiment) => (
                            <li key={experiment.href}>
                                <Link href={experiment.href} className="app-link-block">
                                    {experiment.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </main>
    );
}
