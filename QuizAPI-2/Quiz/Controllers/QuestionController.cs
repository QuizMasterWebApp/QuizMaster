using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quiz.DTOs.Question;
using Quiz.DTOs.Quiz;
using Quiz.Models;
using Quiz.Services.Implementations;
using Quiz.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Quiz.Controllers;

[Route("api/[controller]")]
[ApiController]
public class QuestionController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly IQuestionService _questionService;
    private readonly IOptionService _optionService;

    public QuestionController(IQuestionService questionService, IOptionService optionService, IQuizService quizService)
    {
        _questionService = questionService;
        _optionService = optionService;
        _quizService = quizService;
    }

    private QuestionDto MapToQuestionDto(Question q)
    {
        return new QuestionDto
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
        };
    }

    // GET: api/question/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var q = await _questionService.GetByIdAsync(id);
        if (q == null)
            return NotFound($"Question with ID {id} not found.");

        return Ok(MapToQuestionDto(q));
    }

    // POST: api/question
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] QuestionCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var quiz = await _quizService.GetByIdAsync(dto.QuizId);
        if (quiz.IsDeleted)
            return BadRequest("This quiz was deleted");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (quiz.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the quiz author can add questions to the quiz." });
        try
        {
            var question = new Question
            {
                Text = dto.Text,
                QuizId = dto.QuizId,
                Type = dto.Type,
            };

            // Разделяем опции из DTO в два списка для сервиса
            var optionTexts = dto.Options.Select(o => o.Text).ToList();
            var isCorrectFlags = dto.Options.Select(o => o.IsCorrect).ToList();

            var created = await _questionService.CreateAsync(question, optionTexts, isCorrectFlags);

            return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToQuestionDto(created));
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // PUT: api/question/{id}
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] QuestionUpdateDto dto)
    {
        var existing = await _questionService.GetByIdAsync(id);
        if (existing == null)
            return NotFound($"Question with ID {id} not found.");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (existing.Quiz.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the quiz author can edit a question." });
            
        existing.Text = dto.Text ?? existing.Text;
        existing.Type = dto.Type ?? existing.Type;
        
        List<string>? optionTexts = null;
        List<bool>? isCorrectFlags = null;

        if (dto.Options != null)
        {
            // Разделяем опции из DTO в два списка для сервиса
            optionTexts = dto.Options.Select(o => o.Text).ToList();
            isCorrectFlags = dto.Options.Select(o => o.IsCorrect).ToList();
        }

        var success = await _questionService.UpdateAsync(existing, optionTexts, isCorrectFlags);
        if (!success)
            return StatusCode(500, "Failed to update question.");

        // Получаем обновленный объект с опциями для ответа
        var updated = await _questionService.GetByIdAsync(id);

        return Ok(MapToQuestionDto(updated!));
    }

    // DELETE: api/question/{id}
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var question = await _questionService.GetByIdAsync(id);
            if (question == null)
                return NotFound($"Question with ID {id} not found.");

            var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int authorizedUserId = int.Parse(user);
            if (question.Quiz.AuthorId != authorizedUserId)
                return StatusCode(403, new { error = "Only the quiz author can delete a question." });

            var success = await _questionService.DeleteAsync(id);

            if (!success)
                return StatusCode(500, "Failed to delete question due to server error.");
            return Ok("Deleted");
        }
        catch (Exception ex) { return Conflict(ex.Message); }
    }

    // GET: api/question/option/{id}
    [HttpGet("option/{optionid}")]
    public async Task<IActionResult> GetOptionById(int optionid)
    {
        var option = await _optionService.GetByIdAsync(optionid);
        if (option == null)
            return NotFound($"Option with ID {optionid} not found.");

        var result = new OptionDto
        {
            Id = option.Id,
            Text = option.Text,
            IsCorrect = option.IsCorrect
        };

        return Ok(result);
    }

    // GET: api/question/{id}/options
    [HttpGet("{questionid}/options")]
    public async Task<IActionResult> GetByQuestion(int questionid)
    {
        var options = await _optionService.GetByQuestionAsync(questionid);
        if (!options.Any())
            return Ok(new List<OptionDto>());

        var result = options.Select(o => new OptionDto
        {
            Id = o.Id,
            Text = o.Text,
            IsCorrect = o.IsCorrect
        });

        return Ok(result);
    }

    // POST: api/question/{id}/option
    [HttpPost("{questionid}/option")]
    [Authorize]
    public async Task<IActionResult> Create(int questionid, [FromBody] CreateOptionDto dto)
    {
        var question = await _questionService.GetByIdAsync(questionid);
        if (question == null)
            return NotFound($"Question with ID {questionid} not found.");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (question.Quiz.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the quiz author can add answer options." });

        var option = new Option
        {
            QuestionId = questionid,
            Text = dto.Text,
            IsCorrect = dto.IsCorrect
        };

        var created = await _optionService.CreateAsync(option);

        return Ok(new OptionDto
        {
            Id = created.Id,
            Text = created.Text
        });
    }

    // PUT: api/question/option/{id}
    [HttpPut("option/{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateOption(int id, [FromBody] UpdateOptionDto dto)
    {
        var existing = await _optionService.GetByIdAsync(id);
        if (existing == null)
            return NotFound($"Option with ID {id} not found.");

        var question = existing.Question;
        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (question.Quiz.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the quiz author can edit the answer option." });

        existing.Text = dto.Text ?? existing.Text;
        existing.IsCorrect = dto.IsCorrect ?? existing.IsCorrect;

        var result = await _optionService.UpdateAsync(existing);

        if (!result)
            return StatusCode(500, "Failed to update option due to server error.");

        return Ok("Updated");
    }

    // DELETE: api/question/option/{id}
    [HttpDelete("option/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteOption(int id)
    {
        var option = await _optionService.GetByIdAsync(id);
        if (option == null)
            return NotFound($"Option with ID {id} not found.");

        var question = option.Question;

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (question.Quiz.AuthorId != authorizedUserId)
            return StatusCode(403, new { error = "Only the quiz author can delete an answer option." });
            
        var success = await _optionService.DeleteAsync(id);
        if (!success)
            return StatusCode(500, "Failed to delete option due to server error.");
        return Ok("Deleted");
    }
}