using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class QuestionRepository : IQuestionRepository
{
    private readonly QuizDBContext _context;

    public QuestionRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить вопрос
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Question?> GetByIdAsync(int id)
    {
        return await _context.Questions
            .Include(q => q.Quiz)
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    /// <summary>
    /// Получить вопрос с вариантами ответов
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Question?> GetByIdWithOptionsAsync(int id)
    {
        return await _context.Questions
            .Include(q => q.Options)
            .Include(q => q.Quiz)
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    /// <summary>
    /// Получить вопросы квиза
    /// </summary>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Question>> GetQuestionsByQuizAsync(int quizId)
    {
        return await _context.Questions
            .Where(q => q.QuizId == quizId)
            .ToListAsync();
    }

    /// <summary>
    /// Получить вопросы квиза с ответами
    /// </summary>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Question>> GetQuestionsWithOptionsByQuizAsync(int? quizId)
    {
        return await _context.Questions
            .Where(q => q.QuizId == quizId)
            .Include(q => q.Options)
            .OrderBy(q => q.Id)
            .ToListAsync();
    }

    /// <summary>
    /// Добавить вопрос
    /// </summary>
    /// <param name="question"></param>
    /// <returns></returns>
    public async Task AddAsync(Question question)
    {
        await _context.Questions.AddAsync(question);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Обновить вопрос
    /// </summary>
    /// <param name="question"></param>
    /// <returns></returns>
    public async Task UpdateAsync(Question question)
    {
        _context.Questions.Update(question);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Удалить вопрос
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task DeleteAsync(int id)
    {
        var question = await _context.Questions.FindAsync(id);

        if (question != null)
        {
            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> HasAnswersAsync(int questionId)
    {
        return await _context.UserAnswers
            .AnyAsync(ua => ua.QuestionId == questionId);
    }
}
