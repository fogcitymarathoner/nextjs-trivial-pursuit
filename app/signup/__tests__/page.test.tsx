import SignupPage from '../page';
import { redirect } from 'next/navigation';

jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));

describe('SignupPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('redirects to login', () => {
        SignupPage();

        expect(redirect).toHaveBeenCalledWith('/login');
    });
});
