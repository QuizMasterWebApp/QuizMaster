using Quiz.Models;
using Quiz.DTOs.Attempt;

namespace Quiz.Services.Interfaces;

public interface IAttemptService
{
    Task<Attempt?> GetByIdAsync(int id);
    Task<IEnumerable<Attempt>> GetByUserIdAsync(int userId);
    Task<IEnumerable<Attempt>> GetByQuizIdAsync(int quizId);
    Task<IEnumerable<Attempt>> GetAttemptsByUserIdAndQuizIdAsync(int userId, int quizId);
    Task<IEnumerable<Attempt>> GetAttemptsByGuestIdAndQuizIdAsync(string guestSessionId, int quizId);
    Task<Attempt> StartAttemptAsync(int quizId, string? accessKey = null);
    Task<Attempt> FinishAttemptAsync(int attemptId, IEnumerable<AnswerFinishDto> answers);
    Task<bool> DeleteAsync(int id);
}
