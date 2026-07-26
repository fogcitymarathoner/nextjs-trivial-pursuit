'use client';

import { useState } from 'react';
import { useTriviaQuestions, useTriviaQuiz } from '@/hooks/useTrivia';

export default function UseTriviaExperiment() {
  const questionsState = useTriviaQuestions();
  const [quizDraft, setQuizDraft] = useState('');
  const [quizId, setQuizId] = useState('');
  const quizState = useTriviaQuiz(quizId);

  return (
    <main className="app-page">
      <div className="app-container content-stack">
        <h1 className="page-title">Trivia Hook</h1>

        <section data-testid="questions-state">
          <h2>Questions</h2>
          {questionsState.loading && <p>Loading questions...</p>}
          {questionsState.error && <p>Questions error: {questionsState.error.message}</p>}
          {!questionsState.loading && !questionsState.error && (
            <ul>{questionsState.questions.map(question => (
              <li key={question.id}>{question.question}</li>
            ))}</ul>
          )}
          <button type="button" onClick={questionsState.refresh}>Refresh Questions</button>
        </section>

        <section data-testid="quiz-state">
          <h2>Quiz</h2>
          <label htmlFor="quiz-id">Quiz ID</label>
          <input id="quiz-id" value={quizDraft} onChange={event => setQuizDraft(event.target.value)} />
          <button type="button" onClick={() => setQuizId(quizDraft)}>Load Quiz</button>
          {!quizId && <p>No quiz selected.</p>}
          {quizId && quizState.loading && <p>Loading quiz...</p>}
          {quizState.error && <p>Quiz error: {quizState.error.message}</p>}
          {quizState.quiz && <h3>{quizState.quiz.title}</h3>}
          {quizState.quiz && (
            <ul>{quizState.questions.map(question => (
              <li key={question.id}>{question.question}</li>
            ))}</ul>
          )}
          {quizId && !quizState.loading && !quizState.error && !quizState.quiz && <p>Quiz not found.</p>}
        </section>
      </div>
    </main>
  );
}
