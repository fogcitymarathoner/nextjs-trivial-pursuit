export type GoogleSignInTestAdapter = () => Promise<string>;

declare global {
    interface Window {
        __GOOGLE_SIGN_IN_TEST__?: GoogleSignInTestAdapter;
    }
}
