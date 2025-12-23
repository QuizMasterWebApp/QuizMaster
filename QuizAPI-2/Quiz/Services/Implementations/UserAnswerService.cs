using Quiz.Models;
using Quiz.Repositories.Implementations;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Interfaces;
using Quiz.DTOs.Answer;

namespace Quiz.Services.Implementations;

public class UserAnswerService : IUserAnswerService
{
    private readonly IUserAnswerRepository _useranswerRepository;
    private readonly IAttemptRepository _attemptRepository;
    private readonly IQuestionRepository _questionRepository;

    public UserAnswerService(IUserAnswerRepository answerRepository,
       IAttemptRepository attemptRepository,
       IQuestionRepository questionRepository)
    {
        _useranswerRepository = answerRepository;
        _attemptRepository = attemptRepository;
        _questionRepository = questionRepository;
    }

    /// <summary>
    /// Получить ответ пользваотеля по id ответа
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<UserAnswer?> GetByIdAsync(int id)
    {
        return await _useranswerRepository.GetByIdAsync(id);
    }

    /// <summary>
    /// Получить ответы пользователя по попытке
    /// </summary>
    /// <param name="attemptId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<UserAnswer>> GetAnswersByAttemptAsync(int attemptId)
    {
        return await _useranswerRepository.GetAnswersByAttemptAsync(attemptId);
    }

    /// <summary>
    /// Создать ответ пользователя
    /// </summary>
    /// <param name="answer"></param>
    /// <returns></returns>
    /// <exception cref="Exception"></exception>
    public async Task<UserAnswer> CreateAsync(UserAnswer answer)
    {
        // Проверяем, существует ли попытка
        var attempt = await _attemptRepository.GetByIdAsync(answer.AttemptId);
        if (attempt == null)
            throw new Exception("Attempt not found");

        // Проверяем, существует ли вопрос
        var question = await _questionRepository.GetByIdAsync(answer.QuestionId);
        if (question == null)
            throw new Exception("Question not found");

        // Проверяем, что вопрос относится к тому же Quiz, что и попытка
        if (question.QuizId != attempt.QuizId)
            throw new Exception("Attempt cannot answer a question from a different Quiz");

        await _useranswerRepository.AddAsync(answer);
        return answer;
    }

    /// <summary>
    /// Обновить ответ
    /// </summary>
    /// <param name="answer"></param>
    /// <returns></returns>
    public async Task<bool> UpdateAsync(UserAnswer answer)
    {
        var exists = await _useranswerRepository.GetByIdAsync(answer.Id);
        if (exists == null) return false;

        await _useranswerRepository.UpdateAsync(answer);
        return true;
    }

    /// <summary>
    /// Удалить ответ
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<bool> DeleteAsync(int id)
    {
        var answer = await _useranswerRepository.GetByIdAsync(id);
        if (answer == null) return false;

        await _useranswerRepository.DeleteAsync(id);
        return true;
    }
}
