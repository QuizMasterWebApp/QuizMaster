using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quiz.DTOs.Attempt;
using Quiz.DTOs.Question;
using Quiz.DTOs.Quiz;
using Quiz.DTOs.CategoryTypeDto;
using Quiz.Models;
using Quiz.Services.Implementations;
using Quiz.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;


namespace Quiz.Controllers;

[Route("api/[controller]")]
[ApiController]
public class QuizController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly IQuestionService _questionService;
    private readonly IAttemptService _attemptService;

    public QuizController(IQuizService quizService, 
        IQuestionService questionService, 
        IAttemptService attemptService)
    {
        _quizService = quizService;
        _questionService = questionService;
        _attemptService = attemptService;
    }

    // GET: api/quiz
    [HttpGet]
    public async Task<IActionResult> GetAllPublic()
    {
        var quizzes = await _quizService.GetAllPublicAsync() ?? new List<Models.Quiz>();

        if (!quizzes.Any())
            return Ok(new List<QuizDto>());

        var result = quizzes.Select(q => new QuizDto
        {
            Id = q.Id,
            Title = q.Title,
            Description = q.Description,
            Category = q.Category ?? CategoryType.Other,
            IsPublic = q.isPublic,
            AuthorId = q.AuthorId,
            TimeLimit = q.TimeLimit,
            CreatedAt = q.CreatedAt,
            IsDeleted = q.IsDeleted
        });

        return Ok(result);
    }

    // GET: api/quiz/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var quiz = await _quizService.GetByIdAsync(id);
        if (quiz == null)
            return NotFound($"Quiz with ID {id} not found.");

        string? accessKey = null;

        if (!quiz.isPublic)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int? currentUserId = int.TryParse(userIdClaim, out var uid) ? uid : null;

            // Если пользователь авторизован И является автором, показываем ключ
            if (currentUserId.HasValue && quiz.AuthorId == currentUserId.Value)
            {
                accessKey = quiz.PrivateAccessKey;
            }
            else
            {
                // Если викторина приватна и пользователь не автор, запрещаем доступ к деталям
                return StatusCode(403, new { error = "This quiz is private. An access key or authorization is required." });
            }
        }

        var result = new QuizDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            Category = quiz.Category ?? CategoryType.Other,
            IsPublic = quiz.isPublic,
            AuthorId = quiz.AuthorId,
            TimeLimit = quiz.TimeLimit,
            CreatedAt = quiz.CreatedAt,
            PrivateAccessKey = accessKey,
            IsDeleted = quiz.IsDeleted
        };

        return Ok(result);
    }

    // GET: api/quiz/access/{accessKey}
    [HttpGet("access/{accessKey}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByAccessKey(string accessKey)
    {
        if (string.IsNullOrEmpty(accessKey))
            return BadRequest("Access key is required.");

        var quiz = await _quizService.GetByAccessKeyAsync(accessKey.ToUpperInvariant());
        
        if (quiz == null)
            return NotFound("Quiz not found or invalid access key.");

        var result = new QuizDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            Category = quiz.Category ?? CategoryType.Other,
            IsPublic = quiz.isPublic,
            AuthorId = quiz.AuthorId,
            TimeLimit = quiz.TimeLimit,
            CreatedAt = quiz.CreatedAt,
            PrivateAccessKey = quiz.PrivateAccessKey,
            IsDeleted = quiz.IsDeleted
        };

        return Ok(result);
    }

    // GET: api/quiz/{quizId}/questions
    [HttpGet("{quizId}/questions")]
    public async Task<IActionResult> GetQuestions(int quizId, [FromQuery] string? accessKey)
    {
        //Проверяем доступ к викторине
        var quiz = await _quizService.GetByIdAsync(quizId);
        if (quiz == null)
            return NotFound($"Quiz with ID {quizId} not found.");

        // Если викторина приватная, проверяем права доступа
        if (!quiz.isPublic)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int? currentUserId = int.TryParse(userIdClaim, out var uid) ? uid : null;
            
            bool isAuthor = currentUserId.HasValue && quiz.AuthorId == currentUserId.Value;
            bool hasValidKey = quiz.PrivateAccessKey != null && quiz.PrivateAccessKey == accessKey?.ToUpperInvariant();

            if (!isAuthor && !hasValidKey)
            {
                return StatusCode(403, new { error = "An access key is required to view the questions in this quiz." });
            }
        }

        var questions = await _questionService.GetByQuizAsync(quizId);

        if (!questions.Any())
            return Ok(new List<QuestionDto>());

        var result = questions.Select(q => new QuestionDto
        {
            Id = q.Id,
            Text = q.Text,
            Type = q.Type,
            QuizId = q.QuizId,
            Options = q.Options.Select(o => new OptionDto
            {
                Id = o.Id,
                Text = o.Text,
                IsCorrect = o.IsCorrect,
            }).ToList()
        });

        return Ok(result);
    }

    // GET: api/quiz/{quizId}/attempts
    [HttpGet("{quizId}/attempts")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAttepmts(int quizId, [FromQuery] string? guestSessionId)
    {
        var quiz = await _quizService.GetByIdAsync(quizId);
        if (quiz == null)
            return NotFound($"Quiz with ID {quizId} not found.");

        bool isAuthorizedUser = User.Identity?.IsAuthenticated ?? false;
        int? authorizedUserId = null;
        
        if (isAuthorizedUser)
        {
            var userClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userClaim))
            {
                authorizedUserId = int.Parse(userClaim);
            }
        }
    
        IEnumerable<Attempt> attempts;

        if (isAuthorizedUser && quiz.AuthorId == authorizedUserId)
        {
            attempts = await _attemptService.GetByQuizIdAsync(quizId); // Получает все попытки
        }
        // АВТОРИЗОВАННЫЙ ПОЛЬЗОВАТЕЛЬ (Видит только СВОИ попытки)
        else if (isAuthorizedUser && authorizedUserId.HasValue)
        {
            attempts = await _attemptService.GetAttemptsByUserIdAndQuizIdAsync(authorizedUserId.Value, quizId);
        }
        // ГОСТЬ (Видит только свои попытки по GuestSessionId)
        else if (!string.IsNullOrEmpty(guestSessionId))
        {
            attempts = await _attemptService.GetAttemptsByGuestIdAndQuizIdAsync(guestSessionId, quizId);
        }
        else
        {
            return StatusCode(403, new { error = "Viewing attempts requires authorization or providing a GuestSessionId." });
        }

        if (!attempts.Any())
            return Ok(new List<AttemptDto>());

        // Маппинг и возврат
        var result = attempts.Select(a => new AttemptDto
        {
            Id = a.Id,
            Score = a.Score,
            TimeSpent = a.TimeSpent,
            CompletedAt = a.CompletedAt,
            UserId = a.UserId,
            GuestSessionId = a.UserId == null ? a.GuestSessionId : null,
            QuizId = a.QuizId
        });
        return Ok(result);
    }

    [HttpGet("connect/{code}")]
    [AllowAnonymous] // Доступ разрешен, т.к. пользователь может быть гостем
    public async Task<IActionResult> ConnectByCode(string code)
    {
        if (string.IsNullOrEmpty(code) || code.Length != 5)
            return BadRequest("Access code must be 5 characters long.");

        // поиск викторины по коду
        var quiz = await _quizService.GetByAccessKeyAsync(code); 
        
        if (quiz == null)
            return NotFound("Quiz not found or code is invalid.");

        // викторина должна быть приватной
        if (quiz.isPublic)
            return BadRequest("This quiz is public and does not require an access code.");
        
        return Ok(new QuizAccessInfoDto
        {
            QuizId = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            TimeLimit = quiz.TimeLimit,
            AccessKey = quiz.PrivateAccessKey,
        });
    }

    // POST: api/quiz
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] QuizCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(user))
            return Unauthorized("User not authenticated.");
        int authorizedUserId = int.Parse(user);

        try
        {
            var quiz = new Models.Quiz
            {
                Title = dto.Title,
                Description = dto.Description,
                Category = dto.Category,
                isPublic = dto.IsPublic,
                AuthorId = authorizedUserId,
                TimeLimit = dto.TimeLimit,
                CreatedAt = DateTime.Now
            };

            var created = await _quizService.CreateAsync(quiz);

            return Ok(new QuizDto
            {
                Id = created.Id,
                Title = created.Title,
                Description = created.Description,
                Category = created.Category ?? CategoryType.Other,
                IsPublic = created.isPublic,
                AuthorId = created.AuthorId,
                TimeLimit = created.TimeLimit,
                CreatedAt = created.CreatedAt,
                PrivateAccessKey = created.PrivateAccessKey,
                IsDeleted = created.IsDeleted
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // PUT: api/quiz/{id}
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] QuizUpdateDto dto)
    {
        var existing = await _quizService.GetByIdAsync(id);
        if (existing == null)
            return NotFound($"Quiz with ID {id} not found.");

        if (existing.IsDeleted)
            return BadRequest("This Quiz was deleted");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (existing.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the author of a quiz can edit it." });

        existing.Title = dto.Title ?? existing.Title;
        existing.Description = dto.Description ?? existing.Description;
        existing.Category = dto.Category ?? existing.Category;
        existing.isPublic = dto.IsPublic ?? existing.isPublic;
        existing.TimeLimit = dto.TimeLimit ?? existing.TimeLimit;

        var success = await _quizService.UpdateAsync(existing);
        if (!success)
            return StatusCode(500, "Failed to update quiz due to server error.");

        return Ok("Updated");
    }

    [HttpGet("by-category/{categoryName}")]
    public async Task<IActionResult> GetByCategory(string categoryName)
    {
        // попытка распарсить строку в Enum CategoryType
        if (!Enum.TryParse(categoryName, true, out CategoryType category))
        {
            return BadRequest($"Invalid category name: {categoryName}. Available categories: {string.Join(", ", Enum.GetNames(typeof(CategoryType)))}");
        }

        var quizzes = await _quizService.GetQuizzesByCategoryAsync(category);

        if (!quizzes.Any())
            return NotFound($"No public quizzes found in category {categoryName}.");

        var result = quizzes.Select(q => new QuizDto
        {
            Id = q.Id,
            Title = q.Title,
            Description = q.Description,
            Category = q.Category ?? CategoryType.Other, 
            IsPublic = q.isPublic,
            AuthorId = q.AuthorId,
            TimeLimit = q.TimeLimit,
            CreatedAt = q.CreatedAt,
            PrivateAccessKey = q.PrivateAccessKey,
            IsDeleted = q.IsDeleted
        });

        return Ok(result);
    }

    // DELETE: api/quiz/{id}
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var quiz = await _quizService.GetByIdAsync(id);
        if (quiz == null)
            return NotFound($"Quiz with ID {id} not found.");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (quiz.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the author of a quiz can delete it." });
        var success = await _quizService.DeleteAsync(id);
        if (!success)
            return StatusCode(500, "Failed to delete quiz due to server error.");
        return Ok("Deleted");
    }
}
