using Quiz.Repositories.Interfaces;
using Quiz.Services.Interfaces;
using Quiz.DTOs.Quiz;
using Quiz.Models;

namespace Quiz.Services.Implementations;

public class QuizService : IQuizService
{
    private readonly IQuizRepository _quizRepository;
    private readonly IUserRepository _userRepository;

    public QuizService(IQuizRepository quizRepository, IUserRepository userRepository)
    {
        _quizRepository = quizRepository;
        _userRepository = userRepository;
    }

    /// <summary>
    /// Генерация кода доступа к приватносу квизу
    /// </summary>
    /// <param name="length"></param>
    /// <returns></returns>
    private string GenerateUniqueCode(int length = 5)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();

        return new string(Enumerable.Repeat(chars, length)
          .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    /// <summary>
    /// Получить квиз по ID
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByIdAsync(int id)
    {
        return await _quizRepository.GetByIdAsync(id);
    }

    /// <summary>
    /// Получить квиз с подробностями
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByIdWithDetailsAsync(int id)
    {
        return await _quizRepository.GetByIdWithDetailsAsync(id);
    }

    /// <summary>
    /// Получить все публичные квизы
    /// </summary>
    /// <returns></returns>
    public async Task<IEnumerable<Models.Quiz>> GetAllPublicAsync()
    {
        return await _quizRepository.GetPublicQuizzesAsync();
    }

    /// <summary>
    /// ПОлучить квиз по автору
    /// </summary>
    /// <param name="authorId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Models.Quiz>> GetByAuthorAsync(int authorId)
    {
        return await _quizRepository.GetQuizzesByAuthorAsync(authorId);
    }

    /// <summary>
    /// ПОлучить приватный квиз по коду
    /// </summary>
    /// <param name="code"></param>
    /// <returns></returns>
    public async Task<Models.Quiz?> GetByAccessKeyAsync(string code)
    {
        // Передаем код в верхнем регистре, чтобы гарантировать совпадение с сохраненным
        return await _quizRepository.GetByAccessKeyAsync(code.ToUpperInvariant());
    }

    /// <summary>
    /// Создать квиз
    /// </summary>
    /// <param name="quiz"></param>
    /// <returns></returns>
    /// <exception cref="Exception"></exception>
    public async Task<Models.Quiz> CreateAsync(Models.Quiz quiz)
    {
        var author = await _userRepository.GetByIdAsync(quiz.AuthorId);
        if (author == null)
            throw new Exception("Author not found");

        quiz.CreatedAt = DateTime.UtcNow;

        if (!quiz.isPublic)
        {
            string uniqueCode;
            bool isUnique;

            do
            {
                uniqueCode = GenerateUniqueCode(5);
                // Проверяем уникальность сгенерированного кода в базе
                var existingQuiz = await _quizRepository.GetByAccessKeyAsync(uniqueCode);
                isUnique = existingQuiz == null;

            } while (!isUnique);

            // Сохраняем код в верхнем регистре для упрощения поиска без учета регистра
            quiz.PrivateAccessKey = uniqueCode.ToUpperInvariant();
        }

        await _quizRepository.AddAsync(quiz);
        return quiz;
    }

    /// <summary>
    /// Изменить квиз
    /// </summary>
    /// <param name="quiz"></param>
    /// <returns></returns>
    /// <exception cref="Exception"></exception>
    public async Task<bool> UpdateAsync(Models.Quiz quiz)
    {
        var existing = await _quizRepository.GetByIdAsync(quiz.Id);
        if (existing == null)
            return false;

        existing.Title = quiz.Title;
        existing.Description = quiz.Description;
        existing.Category = quiz.Category;
        existing.isPublic = quiz.isPublic;
        existing.TimeLimit = quiz.TimeLimit;

        if (existing.AuthorId != quiz.AuthorId)
            throw new Exception("Cannot change quiz author");

        await _quizRepository.UpdateAsync(existing);
        return true;
    }

    /// <summary>
    /// Удалить квиз
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _quizRepository.GetByIdAsync(id);
        if (existing == null)
            return false;

        await _quizRepository.DeleteAsync(id);
        return true;
    }
    
    /// <summary>
    /// Получить квизв опредленной категории
    /// </summary>
    /// <param name="category"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Models.Quiz>> GetQuizzesByCategoryAsync(CategoryType category)
    {
        return await _quizRepository.GetQuizzesByCategoryAsync(category);
    }
}