using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class QuizRepository : IQuizRepository
{
    private readonly QuizDBContext _context;

    public QuizRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить квиз по ID
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByIdAsync(int? id)
    {
        if (id == null) return null;

        return await _context.Quizzes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    /// <summary>
    /// Получить публичные квизы
    /// </summary>
    /// <returns></returns>
    public async Task<IEnumerable<Models.Quiz>> GetPublicQuizzesAsync()
    {
        return await _context.Quizzes
            .Where(q => q.isPublic)
            .Include(q => q.Author)
            .ToListAsync();
    }

    /// <summary>
    /// Получить квизы по автору
    /// </summary>
    /// <param name="authorId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Models.Quiz>> GetQuizzesByAuthorAsync(int authorId)
    {
        return await _context.Quizzes
            .Where(q => q.AuthorId == authorId)
            .ToListAsync();
    }

    /// <summary>
    /// Добавить квиз
    /// </summary>
    /// <param name="quiz"></param>
    /// <returns></returns>
    public async Task AddAsync(Models.Quiz quiz)
    {
        await _context.Quizzes.AddAsync(quiz);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Обновить квиз
    /// </summary>
    /// <param name="quiz"></param>
    /// <returns></returns>
    public async Task UpdateAsync(Models.Quiz quiz)
    {
        _context.Quizzes.Update(quiz);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Получить викторину с деталями: автор, категория, вопросы, варианты и попытки.
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Quizzes
            .Include(q => q.Author)
            .Include(q => q.Questions)
                .ThenInclude(q => q.Options)
            .Include(q => q.Attempts)
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    /// <summary>
    /// Получить приватный квиз 
    /// </summary>
    /// <param name="key"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByAccessKeyAsync(string key)
    {
        return await _context.Quizzes
            .Include(q => q.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(q => q.PrivateAccessKey == key.ToUpper()); 
    }

    /// <summary>
    /// Получить квизы опредленной категории
    /// </summary>
    /// <param name="category"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Models.Quiz>> GetQuizzesByCategoryAsync(CategoryType category)
    {
        var query = _context.Quizzes.Where(q => q.isPublic);

        if (category == CategoryType.Other)
        {
            query = query.Where(q => q.Category == CategoryType.Other || q.Category == null);
        }
        else
        {
            query = query.Where(q => q.Category == category);
        }

        return await query
            .Include(q => q.Author)
            .ToListAsync();
    }

    /// <summary>
    /// Удалить квиз
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task DeleteAsync(int id)
    {
        var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == id);

        if (quiz != null)
        {
            //_context.Quizzes.Remove(quiz);
            quiz.IsDeleted = true;
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Получить квиз с вопросами
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByIdWithQuestionsAsync(int id)
    {
        return await _context.Quizzes
            .Include(q => q.Questions) 
            .FirstOrDefaultAsync(q => q.Id == id);
    }
}
