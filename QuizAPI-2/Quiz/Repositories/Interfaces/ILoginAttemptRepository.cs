using Quiz.Models;

namespace Quiz.Repositories.Interfaces;

public interface ILoginAttemptRepository
{
    Task<LoginAttempt?> GetByUsernameAsync(string username);
    Task AddOrUpdateAsync(LoginAttempt attempt);
    Task ResetAttemptsAsync(string username);
}
