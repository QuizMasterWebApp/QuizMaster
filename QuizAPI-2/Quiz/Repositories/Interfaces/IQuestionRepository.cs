using Quiz.Models;

namespace Quiz.Repositories.Interfaces;

public interface IQuestionRepository
{
    Task<Question?> GetByIdAsync(int id);
    Task<Question?> GetByIdWithOptionsAsync(int id);
    Task<IEnumerable<Question>> GetQuestionsByQuizAsync(int quizId);
    Task<IEnumerable<Question>> GetQuestionsWithOptionsByQuizAsync(int? quizId);
    Task AddAsync(Question question);
    Task UpdateAsync(Question question);
    Task DeleteAsync(int id);
    Task<bool> HasAnswersAsync(int questionId);
}