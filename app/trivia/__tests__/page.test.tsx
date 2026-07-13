import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TriviaPage from '../page';
import { useTriviaQuestions } from '../../../hooks/useTrivia';
import { questionService } from '../../../lib/firestore/triviaService';

jest.mock('../../../hooks/useTrivia', () => ({
    useTriviaQuestions: jest.fn(),
}));

jest.mock('../../../lib/firestore/triviaService', () => ({
    questionService: {
        createQuestion: jest.fn(),
    },
}));

const mockUseTriviaQuestions = useTriviaQuestions as jest.MockedFunction<typeof useTriviaQuestions>;
const mockCreateQuestion = questionService.createQuestion as jest.MockedFunction<typeof questionService.createQuestion>;

describe('TriviaPage', () => {
    const refresh = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseTriviaQuestions.mockReturnValue({
            questions: [],
            loading: false,
            error: null,
            refresh,
        });
    });

    it('renders trivia questions returned by the hook', () => {
        mockUseTriviaQuestions.mockReturnValue({
            questions: [{
                id: 'question-1',
                category: 'Science',
                difficulty: 'medium',
                question: 'What is the chemical symbol for water?',
                correctAnswer: 'H2O',
                incorrectAnswers: ['CO2', 'NaCl', 'HCl'],
                createdAt: new Date('2026-01-01T00:00:00Z'),
                updatedAt: new Date('2026-01-01T00:00:00Z'),
            }],
            loading: false,
            error: null,
            refresh,
        });

        render(<TriviaPage />);

        expect(screen.getByText('What is the chemical symbol for water?')).toBeTruthy();
        expect(screen.getByText('Correct: H2O')).toBeTruthy();
    });

    it('creates a sample question and refreshes the list', async () => {
        mockCreateQuestion.mockResolvedValue('question-1');
        render(<TriviaPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Add Sample Question' }));

        await waitFor(() => expect(mockCreateQuestion).toHaveBeenCalled());
        expect(refresh).toHaveBeenCalled();
    });
});
