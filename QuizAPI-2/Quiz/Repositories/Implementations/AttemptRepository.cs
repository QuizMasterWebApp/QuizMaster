using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class AttemptRepository : IAttemptRepository
{
    private readonly QuizDBContext _context;

    public AttemptRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить попытку
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Attempt?> GetByIdAsync(int id)
    {
        return await _context.Attempts
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    /// <summary>
    /// Получить попытку с подробностями
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Attempt?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Attempts
            .Include(a => a.User)
            .IgnoreQueryFilters()
            .Include(a => a.Quiz)
                .ThenInclude(q => q.Questions!)
                    .ThenInclude(q => q.Options)
            .Include(a => a.UserAnswers!)
                .ThenInclude(ua => ua.ChosenOption)
            .Include(a => a.UserAnswers!)
                .ThenInclude(ua => ua.Question)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    /// <summary>
    /// Добавить попытку в БД
    /// </summary>
    /// <param name="attempt"></param>
    /// <returns></returns>
    public async Task AddAsync(Attempt attempt)
    {
        await _context.Attempts.AddAsync(attempt);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Обновить попытку
    /// </summary>
    /// <param name="attempt"></param>
    /// <returns></returns>
    public async Task UpdateAsync(Attempt attempt)
    {
        _context.Attempts.Update(attempt);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Удалить попытку
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task DeleteAsync(int id)
    {
        var attempt = await _context.Attempts.FindAsync(id);
        if (attempt != null)
        {
            _context.Attempts.Remove(attempt);
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Получить попвтки пользователя
    /// </summary>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetAttemptsByUserAsync(int userId)
    {
        return await _context.Attempts
            .Where(a => a.UserId == userId)
            .Include(a => a.Quiz)
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Получить попытки прохождения квиза
    /// </summary>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetAttemptsByQuizAsync(int quizId)
    {
        return await _context.Attempts
            .Where(a => a.QuizId == quizId)
            .Include(a => a.User)
            .Include(a => a.Quiz) 
            .IgnoreQueryFilters()
            .OrderByDescending(a => a.Score)
            .ThenBy(a => a.TimeSpent)
            .ToListAsync();
    }

    /// <summary>
    /// Получить попытки конкретного пользователя в конкретной викторине
    /// </summary>
    /// <param name="userId"></param>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetAttemptsByUserIdAndQuizIdAsync(int userId, int quizId)
    {
        return await _context.Attempts
            .Where(a => a.UserId == userId && a.QuizId == quizId)
            .Include(a => a.Quiz)
            .IgnoreQueryFilters()
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Получить попытки конкретного гостя в конкретной викторине
    /// </summary>
    /// <param name="guestSessionId"></param>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetAttemptsByGuestIdAndQuizIdAsync(string guestSessionId, int quizId)
    {
        return await _context.Attempts
            .Where(a => a.GuestSessionId == guestSessionId && a.QuizId == quizId)
            .Include(a => a.Quiz)
            .IgnoreQueryFilters()
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync();
    }
}