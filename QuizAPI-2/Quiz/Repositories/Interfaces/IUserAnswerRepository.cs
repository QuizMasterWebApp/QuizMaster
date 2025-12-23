using Quiz.Models;

namespace Quiz.Repositories.Interfaces;

public interface IUserAnswerRepository
{
    Task<UserAnswer?> GetByIdAsync(int id);
    Task AddAsync(UserAnswer answer);
    Task UpdateAsync(UserAnswer answer);
    Task DeleteAsync(int id);
    Task<IEnumerable<UserAnswer>> GetAnswersByAttemptAsync(int attemptId);
}
