using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class OptionRepository : IOptionRepository
{
    private readonly QuizDBContext _context;

    public OptionRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить вариант ответа по ID
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Option?> GetByIdAsync(int id)
    {
        return await _context.Options
             .Include(o => o.Question)
             .ThenInclude(q => q.Quiz)
             .FirstOrDefaultAsync(o => o.Id == id);
    }

    /// <summary>
    /// Получить варианты ответов вопроса
    /// </summary>
    /// <param name="questionId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Option>> GetOptionsByQuestionAsync(int questionId)
    {
        return await _context.Options
            .Where(o => o.QuestionId == questionId)
            .ToListAsync();
    }

    /// <summary>
    /// Добавить варинт ответа
    /// </summary>
    /// <param name="option"></param>
    /// <returns></returns>
    public async Task AddAsync(Option option)
    {
        await _context.Options.AddAsync(option);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Добавить пул вариантов
    /// </summary>
    /// <param name="options"></param>
    /// <returns></returns>
    public async Task AddRangeAsync(IEnumerable<Option> options)
    {
        await _context.Options.AddRangeAsync(options);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Обновить вариант ответа
    /// </summary>
    /// <param name="option"></param>
    /// <returns></returns>
    public async Task UpdateAsync(Option option)
    {
        _context.Options.Update(option);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Удалить вариант ответа
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task DeleteAsync(int id)
    {
        var option = await _context.Options.FindAsync(id);
        if (option != null)
        {
            _context.Options.Remove(option);
            await _context.SaveChangesAsync();
        }
    }
}