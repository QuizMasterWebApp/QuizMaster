using Quiz.Models;
using Quiz.DTOs.Question;

namespace Quiz.Services.Interfaces;

public interface IQuestionService
{
    Task<Question?> GetByIdAsync(int id);
    Task<IEnumerable<Question>> GetByQuizAsync(int quizId);
    Task<Question> CreateAsync(Question question, List<string> optionTexts, List<bool> isCorrectFlags);
    Task<bool> UpdateAsync(Question question, List<string>? optionTexts = null, List<bool>? isCorrectFlags = null);
    Task<bool> DeleteAsync(int id);
}