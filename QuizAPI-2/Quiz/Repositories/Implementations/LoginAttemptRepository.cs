using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class LoginAttemptRepository : ILoginAttemptRepository
{
    private readonly QuizDBContext _context;

    public LoginAttemptRepository(QuizDBContext context)
    {
        _context = context;
    }

    public async Task<LoginAttempt?> GetByUsernameAsync(string username)
    {
        return await _context.LoginAttempts.FirstOrDefaultAsync(a => a.Username == username);
    }
    
    /// <summary>
    /// Добавить и обновить попытку входа
    /// </summary>
    /// <param name="attempt"></param>
    /// <returns></returns>
    public async Task AddOrUpdateAsync(LoginAttempt attempt)
    {
        var existing = await _context.LoginAttempts.FirstOrDefaultAsync(a => a.Username == attempt.Username);
        if (existing == null)
            _context.LoginAttempts.Add(attempt);
        else
        {
            existing.AttemptCount = attempt.AttemptCount;
            existing.LastAttempt = attempt.LastAttempt;
        }
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Сбросить количетво попыток входа
    /// </summary>
    /// <param name="username"></param>
    /// <returns></returns>
    public async Task ResetAttemptsAsync(string username)
    {
        var existing = await _context.LoginAttempts.FirstOrDefaultAsync(a => a.Username == username);
        if (existing != null)
        {
            existing.AttemptCount = 0;
            existing.LastAttempt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
