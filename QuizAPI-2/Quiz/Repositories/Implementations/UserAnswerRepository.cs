using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class UserAnswerRepository : IUserAnswerRepository
{
    private readonly QuizDBContext _context;

    public UserAnswerRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить ответ пользователя
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<UserAnswer?> GetByIdAsync(int id)
    {
        return await _context.UserAnswers
            .Include(ua => ua.Attempt) 
            .Include(ua => ua.Question) 
            .Include(ua => ua.ChosenOption) 
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    /// <summary>
    /// Добавить ответ
    /// </summary>
    /// <param name="answer"></param>
    /// <returns></returns>
    public async Task AddAsync(UserAnswer answer)
    {
        await _context.UserAnswers.AddAsync(answer);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Обновить ответ
    /// </summary>
    /// <param name="answer"></param>
    /// <returns></returns>
    public async Task UpdateAsync(UserAnswer answer)
    {
        _context.UserAnswers.Update(answer);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Удалить ответ
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task DeleteAsync(int id)
    {
        var answer = await _context.UserAnswers.FirstOrDefaultAsync(a => a.Id == id);

        if (answer != null)
        {
            _context.UserAnswers.Remove(answer);
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Получить ответы попытки
    /// </summary>
    /// <param name="attemptId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<UserAnswer>> GetAnswersByAttemptAsync(int attemptId)
    {
        return await _context.UserAnswers
            .Where(a => a.AttemptId == attemptId)
            .Include(ua => ua.Question)
            .Include(ua => ua.ChosenOption)
            .ToListAsync();
    }
}
