using Microsoft.AspNetCore.Mvc;
using Quiz.DTOs.Answer;
using Quiz.DTOs.Attempt;
using Quiz.Models;
using Quiz.Services.Implementations;
using Quiz.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Quiz.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AttemptController : ControllerBase
{
    private readonly IAttemptService _attemptService;
    private readonly IUserAnswerService _answerService;

    public AttemptController(IAttemptService attemptService, IUserAnswerService answerService)
    {
        _attemptService = attemptService;
        _answerService = answerService;
    }

    private AttemptDto MapToAttemptDto(Attempt attempt)
    {
        return new AttemptDto
        {
            Id = attempt.Id,
            Score = attempt.Score,
            TimeSpent = attempt.TimeSpent,
            CompletedAt = attempt.CompletedAt,
            UserId = attempt.UserId,
            GuestSessionId = attempt.UserId == null ? attempt.GuestSessionId : null,
            QuizId = attempt.QuizId
        };
    }

    // POST: api/attempt/quiz-sessions/{quizId}/start
    [HttpPost("{quizId}/start")]
    public async Task<IActionResult> StartAttempt(int quizId, [FromQuery] string? accessKey)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var attempt = await _attemptService.StartAttemptAsync(quizId, accessKey);
            return Ok(MapToAttemptDto(attempt));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST: api/attempt/{attemptid}/stop
    [HttpPost("{attemptid}/stop")]
    public async Task<IActionResult> FinishAttempt(int attemptid, [FromBody] FinishAttemptDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var attempt = await _attemptService.FinishAttemptAsync(attemptid, dto.Answers);
            return Ok(MapToAttemptDto(attempt));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET: api/attempt/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var attempt = await _attemptService.GetByIdAsync(id);
        if (attempt == null)
            return NotFound($"Attempt with ID {id} not found.");

        return Ok(MapToAttemptDto(attempt));
    }

    // GET: api/attempt/{attemptId}/answers
    [HttpGet("{attemptId}/answers")]
    public async Task<IActionResult> GetAnswers(int attemptId, [FromQuery] string? guestSessionId)
    {
        var attempt = await _attemptService.GetByIdAsync(attemptId);
        if (attempt == null)
            return NotFound($"Attempt with ID {attemptId} not found.");

        var quiz = attempt.Quiz;
        if (quiz == null)
            return NotFound("Quiz for this attempt not found.");

        bool isAuthorizedUser = User.Identity?.IsAuthenticated ?? false;
        int? authorizedUserId = null;

        if (isAuthorizedUser)
        {
            var userClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userClaim))
                authorizedUserId = int.Parse(userClaim);
        }

        bool isQuizAuthor = authorizedUserId.HasValue && quiz.AuthorId == authorizedUserId.Value;
        bool isAttemptOwner = authorizedUserId.HasValue && attempt.UserId == authorizedUserId.Value;
        bool isGuestOwner = !string.IsNullOrEmpty(attempt.GuestSessionId) &&
                            !string.IsNullOrEmpty(guestSessionId) &&
                            attempt.GuestSessionId == guestSessionId;

        if (!isQuizAuthor && !isAttemptOwner && !isGuestOwner)
            return StatusCode(StatusCodes.Status403Forbidden,
                "Access denied. Only the quiz author, the user who took the attempt, or the guest session owner can view these answers.");

        var answers = await _answerService.GetAnswersByAttemptAsync(attemptId);

        if (!answers.Any())
            return Ok(new List<AnswerDto>());

        var result = answers.Select(a => new AnswerDto
        {
            Id = a.Id,
            AttemptId = a.AttemptId,
            QuestionId = a.QuestionId,
            ChosenOptionId = a.ChosenOptionId,
            isCorrect = a.ChosenOption.IsCorrect
        });

        return Ok(result);
    }
    
    // GET: api/attempt/quiz/{quizId}/leaderboard
    [HttpGet("quiz/{quizId}/leaderboard")]
    public async Task<IActionResult> GetLeaderboard(int quizId, [FromQuery] string? guestSessionId)
    {
        // 1. Получаем попытки с данными о квизе
        var attempts = await _attemptService.GetByQuizIdAsync(quizId);
        
        if (!attempts.Any())
        {
            return Ok(new List<LeaderboardEntryDto>());
        }

        var quiz = attempts.First().Quiz;

        // 2. Если квиз приватный, проверяем права доступа
        if (!quiz.isPublic)
        {
            bool isAuthorized = User.Identity?.IsAuthenticated ?? false;
            int? currentUserId = null;

            if (isAuthorized)
            {
                var userClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userClaim))
                    currentUserId = int.Parse(userClaim);
            }

            // Проверка: является ли пользователь автором квиза
            bool isQuizAuthor = currentUserId.HasValue && quiz.AuthorId == currentUserId.Value;

            // Проверка: проходил ли этот пользователь (или гость) данный квиз
            bool hasParticipated = attempts.Any(a => 
                (currentUserId.HasValue && a.UserId == currentUserId.Value) || 
                (!string.IsNullOrEmpty(guestSessionId) && a.GuestSessionId == guestSessionId)
            );

            if (!isQuizAuthor && !hasParticipated)
            {
                return StatusCode(StatusCodes.Status403Forbidden, 
                    "This leaderboard is private. You must complete the quiz first or be its author to see the results.");
            }
        }

        // 3. Маппинг данных в DTO
        var result = attempts.Select(a => new LeaderboardEntryDto
        {
            UserName = a.User?.Username ?? "Guest",
            Score = a.Score,
            TimeSpent = a.TimeSpent,
            CompletedAt = a.CompletedAt,
            UserId = a.UserId,
            GuestSessionId = a.UserId == null ? a.GuestSessionId : null,
            AttemptId = a.Id
        });

        return Ok(result);
    }
}