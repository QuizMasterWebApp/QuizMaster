using Quiz.Models;

namespace Quiz.Repositories.Interfaces;

public interface IAttemptRepository
{
    Task<Attempt?> GetByIdAsync(int id);
    Task<Attempt?> GetByIdWithDetailsAsync(int id);
    
    Task AddAsync(Attempt attempt);
    Task UpdateAsync(Attempt attempt);
    Task DeleteAsync(int id);

    Task<IEnumerable<Attempt>> GetAttemptsByUserAsync(int userId);
    Task<IEnumerable<Attempt>> GetAttemptsByQuizAsync(int quizId);
    Task<IEnumerable<Attempt>> GetAttemptsByUserIdAndQuizIdAsync(int userId, int quizId);
    Task<IEnumerable<Attempt>> GetAttemptsByGuestIdAndQuizIdAsync(string guestSessionId, int quizId);
}