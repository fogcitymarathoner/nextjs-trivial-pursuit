// app/troubleshoot/page.tsx
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

const TroubleShooting = () => {
    return (
        <main className="app-page">
            <div className="app-container">
                <header className="page-heading">
                    <h1 className="page-title text-blue-600">Trouble Shooting</h1>
                    <p className="page-description">
                        Pages used to debug problems with integration to <b>Firebase</b>
                    </p>
                </header>

                <section className="surface-panel surface-panel-spacious surface-panel-compact">
                    <ul>
                        <li>
                            <Link
                                href={ROUTES.TROUBLESHOOT.FIREBASE_DIAGNOSTICS}
                                className="app-link-block"
                            >
                                Go to Firebase Diagnostics
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={ROUTES.TROUBLESHOOT.FIREBASE_DIAGNOSTICS}
                                className="app-button-primary"
                            >
                                Go to Firebase Diagnostics
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={ROUTES.TROUBLESHOOT.TEST_FIREBASE}
                                className="app-link-block"
                            >
                                Go to Test Firebase
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={ROUTES.TROUBLESHOOT.TEST_FIREBASE}
                                className="app-button-primary"
                            >
                                Go to Test Firebase
                            </Link>
                        </li>
                    </ul>
                    <p className="body-copy">
                        Use these global page, panel, form, and content classes when adding new routes.
                    </p>
                </section>
            </div>
        </main>
    );
};

export default TroubleShooting;