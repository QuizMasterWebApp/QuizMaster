using Quiz.DTOs.Attempt;
using Quiz.Models;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Interfaces;
using System.Security.Claims;


namespace Quiz.Services.Implementations;

public class AttemptService : IAttemptService
{
    private readonly IAttemptRepository _attemptRepository;
    private readonly IQuizRepository _quizRepository;
    private readonly IQuestionRepository _questionRepository;
    private readonly IUserAnswerRepository _userAnswerRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AttemptService(
        IAttemptRepository attemptRepository,
        IQuizRepository quizRepository,
        IQuestionRepository questionRepository,
        IUserAnswerRepository userAnswerRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _attemptRepository = attemptRepository;
        _quizRepository = quizRepository;
        _questionRepository = questionRepository;
        _userAnswerRepository = userAnswerRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Получить попытку по ID
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<Attempt?> GetByIdAsync(int id)
        => await _attemptRepository.GetByIdWithDetailsAsync(id);

    /// <summary>
    /// Получить попытки пользователя
    /// </summary>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetByUserIdAsync(int userId)
        => await _attemptRepository.GetAttemptsByUserAsync(userId);

    /// <summary>
    /// Получить попытки прохождения квиза
    /// </summary>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetByQuizIdAsync(int quizId)
        => await _attemptRepository.GetAttemptsByQuizAsync(quizId);
    
    /// <summary>
    /// Получить попытки по пользователю и квизу
    /// </summary>
    /// <param name="userId"></param>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetAttemptsByUserIdAndQuizIdAsync(int userId, int quizId)
        => await _attemptRepository.GetAttemptsByUserIdAndQuizIdAsync(userId, quizId);

    /// <summary>
    /// Получить попытки квиза, пройденного гостем
    /// </summary>
    /// <param name="guestSessionId"></param>
    /// <param name="quizId"></param>
    /// <returns></returns>
    public async Task<IEnumerable<Attempt>> GetAttemptsByGuestIdAndQuizIdAsync(string guestSessionId, int quizId)
        => await _attemptRepository.GetAttemptsByGuestIdAndQuizIdAsync(guestSessionId, quizId);

    /// <summary>
    /// Начать попытку прохождения квиза
    /// </summary>
    /// <param name="quizId"></param>
    /// <returns></returns>
    /// <exception cref="KeyNotFoundException"></exception>
    /// <exception cref="InvalidOperationException"></exception>
    public async Task<Attempt> StartAttemptAsync(int quizId, string? accessKey = null)
    {
        var quiz = await _quizRepository.GetByIdWithQuestionsAsync(quizId)
            ?? throw new KeyNotFoundException("Quiz not found");

        if (!quiz.Questions.Any())
        {
            throw new InvalidOperationException("Cannot start the quiz. It must contain at least one question.");
        }

        // 2. ИЗВЛЕКАЕМ ID ПОЛЬЗОВАТЕЛЯ ОДИН РАЗ В НАЧАЛЕ
        var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? currentUserId = int.TryParse(userIdClaim, out var parsedId) ? parsedId : null;

        if (!quiz.isPublic)
        {
            bool isAuthor = currentUserId.HasValue && quiz.AuthorId == currentUserId.Value;
            bool hasValidKey = !string.IsNullOrEmpty(quiz.PrivateAccessKey) && 
                            quiz.PrivateAccessKey.Equals(accessKey, StringComparison.OrdinalIgnoreCase);

            if (!isAuthor && !hasValidKey)
            {
                throw new UnauthorizedAccessException("This quiz is private. A valid access key is required to start.");
            }
        }

        var guestId = currentUserId == null 
            ? _httpContextAccessor.HttpContext?.Items["GuestSessionId"]?.ToString() 
            : null;

        var attempt = new Attempt
        {
            QuizId = quizId,
            UserId = currentUserId,
            GuestSessionId = guestId,
            Score = 0,
            TimeSpent = TimeSpan.Zero,
            CompletedAt = DateTime.UtcNow
        };

        await _attemptRepository.AddAsync(attempt);
        return attempt;
    }

    /// <summary>
    /// Закончить попытку
    /// </summary>
    /// <param name="attemptId"></param>
    /// <param name="answerDtos"></param>
    /// <returns></returns>
    /// <exception cref="KeyNotFoundException"></exception>
    /// <exception cref="InvalidOperationException"></exception>
    public async Task<Attempt> FinishAttemptAsync(int attemptId, IEnumerable<AnswerFinishDto> answerDtos)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId)
            ?? throw new KeyNotFoundException("Attempt not found");

        if (attempt.TimeSpent != TimeSpan.Zero)
            throw new InvalidOperationException("Attempt already completed");

        var questions = await _questionRepository.GetQuestionsWithOptionsByQuizAsync(attempt.QuizId);
        var questionDict = questions.ToDictionary(q => q.Id);

        int correctCount = 0;
        var userAnswersToSave = new List<UserAnswer>();

        foreach (var dto in answerDtos)
        {
            if (!questionDict.TryGetValue(dto.QuestionId, out var question))
                throw new InvalidOperationException($"Question {dto.QuestionId} not found in quiz");

            var selectedOptionIds = dto.SelectedOptionIds?.ToHashSet() ?? new HashSet<int>();

            // Получаем все правильные варианты ответа для вопроса
            var correctOptionIds = question.Options
                .Where(o => o.IsCorrect)
                .Select(o => o.Id)
                .ToHashSet();

            bool isCorrect = selectedOptionIds.SetEquals(correctOptionIds);

            if (isCorrect) correctCount++;

            // Сохраняем каждый выбранный вариант (для Multiple — может быть несколько)
            foreach (var optionId in selectedOptionIds)
            {
                userAnswersToSave.Add(new UserAnswer
                {
                    AttemptId = attemptId,
                    QuestionId = dto.QuestionId,
                    ChosenOptionId = optionId
                });
            }
        }

        // Сохраняем ответы
        foreach (var ua in userAnswersToSave)
            await _userAnswerRepository.AddAsync(ua);

        // Обновляем попытку
        attempt.Score = correctCount;
        attempt.TimeSpent = DateTime.UtcNow - attempt.CompletedAt;
        attempt.CompletedAt = DateTime.UtcNow;

        await _attemptRepository.UpdateAsync(attempt);
        return attempt;
    }

    /// <summary>
    /// Удалить попытку
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<bool> DeleteAsync(int id)
    {
        await _attemptRepository.DeleteAsync(id);
        return true;
    }
}