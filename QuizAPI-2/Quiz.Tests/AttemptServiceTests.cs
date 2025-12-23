using Microsoft.AspNetCore.Http;
using Moq;
using Quiz.DTOs.Attempt;
using Quiz.Models;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Implementations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Quiz.Tests;

public class AttemptServiceTests
{
    private readonly Mock<IAttemptRepository> _attemptRepoMock;
    private readonly Mock<IQuizRepository> _quizRepoMock;
    private readonly Mock<IQuestionRepository> _questionRepoMock;
    private readonly Mock<IUserAnswerRepository> _userAnswerRepoMock;
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
    private readonly AttemptService _service;

    public AttemptServiceTests()
    {
        _attemptRepoMock = new Mock<IAttemptRepository>();
        _quizRepoMock = new Mock<IQuizRepository>();
        _questionRepoMock = new Mock<IQuestionRepository>();
        _userAnswerRepoMock = new Mock<IUserAnswerRepository>();
        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();

        _service = new AttemptService(
            _attemptRepoMock.Object,
            _quizRepoMock.Object,
            _questionRepoMock.Object,
            _userAnswerRepoMock.Object,
            _httpContextAccessorMock.Object
        );
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnAttempt()
    {
        var attempt = new Attempt { Id = 1 };
        _attemptRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(attempt);

        var result = await _service.GetByIdAsync(1);

        Assert.Equal(1, result!.Id);
    }

    [Fact]
    public async Task GetByUserIdAsync_ShouldReturnAttempts()
    {
        var attempts = new List<Attempt> { new Attempt { Id = 1 } };
        _attemptRepoMock.Setup(r => r.GetAttemptsByUserAsync(5)).ReturnsAsync(attempts);

        var result = await _service.GetByUserIdAsync(5);

        Assert.Single(result);
    }

    [Fact]
    public async Task GetByQuizIdAsync_ShouldReturnAttempts()
    {
        var attempts = new List<Attempt> { new Attempt { Id = 1 } };
        _attemptRepoMock.Setup(r => r.GetAttemptsByQuizAsync(10)).ReturnsAsync(attempts);

        var result = await _service.GetByQuizIdAsync(10);

        Assert.Single(result);
    }

    [Fact]
    public async Task StartAttemptAsync_ShouldCreateAttempt_ForUser()
    {
        var quiz = new Models.Quiz
        {
            Id = 10,
            Questions = new List<Question> { new Question { Id = 1 } }
        };

        _quizRepoMock.Setup(r => r.GetByIdWithQuestionsAsync(10)).ReturnsAsync(quiz);

        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
                new Claim(ClaimTypes.NameIdentifier, "5")
        }, "mock"));
        _httpContextAccessorMock.Setup(a => a.HttpContext).Returns(httpContext);

        _attemptRepoMock.Setup(r => r.AddAsync(It.IsAny<Attempt>())).Returns(Task.CompletedTask);

        var attempt = await _service.StartAttemptAsync(10);

        Assert.Equal(5, attempt.UserId);
        Assert.Null(attempt.GuestSessionId);
        _attemptRepoMock.Verify(r => r.AddAsync(It.IsAny<Attempt>()), Times.Once);
    }

    [Fact]
    public async Task StartAttemptAsync_ShouldCreateAttempt_ForGuest()
    {
        var quiz = new Models.Quiz
        {
            Id = 10,
            Questions = new List<Question> { new Question { Id = 1 } }
        };

        _quizRepoMock.Setup(r => r.GetByIdWithQuestionsAsync(10)).ReturnsAsync(quiz);

        var httpContext = new DefaultHttpContext();
        httpContext.Items["GuestSessionId"] = "guest123";
        _httpContextAccessorMock.Setup(a => a.HttpContext).Returns(httpContext);

        _attemptRepoMock.Setup(r => r.AddAsync(It.IsAny<Attempt>())).Returns(Task.CompletedTask);

        var attempt = await _service.StartAttemptAsync(10);

        Assert.Null(attempt.UserId);
        Assert.Equal("guest123", attempt.GuestSessionId);
        _attemptRepoMock.Verify(r => r.AddAsync(It.IsAny<Attempt>()), Times.Once);
    }

    [Fact]
    public async Task StartAttemptAsync_ShouldThrow_WhenQuizNotFound()
    {
        _quizRepoMock.Setup(r => r.GetByIdWithQuestionsAsync(10)).ReturnsAsync((Models.Quiz?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.StartAttemptAsync(10));
    }

    [Fact]
    public async Task StartAttemptAsync_ShouldThrow_WhenNoQuestions()
    {
        var quiz = new Models.Quiz { Id = 10, Questions = new List<Question>() };
        _quizRepoMock.Setup(r => r.GetByIdWithQuestionsAsync(10)).ReturnsAsync(quiz);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.StartAttemptAsync(10));
    }

    [Fact]
    public async Task FinishAttemptAsync_ShouldCalculateScoreAndSaveAnswers()
    {
        var attempt = new Attempt { Id = 1, QuizId = 10, TimeSpent = TimeSpan.Zero, CompletedAt = DateTime.UtcNow };
        _attemptRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(attempt);

        var question = new Question
        {
            Id = 100,
            QuizId = 10,
            Options = new List<Option>
                {
                    new Option { Id = 1, IsCorrect = true },
                    new Option { Id = 2, IsCorrect = false }
                }
        };
        _questionRepoMock.Setup(r => r.GetQuestionsWithOptionsByQuizAsync(10)).ReturnsAsync(new List<Question> { question });

        var answers = new List<AnswerFinishDto>
            {
                new AnswerFinishDto
                {
                    QuestionId = 100,
                    SelectedOptionIds = new List<int> { 1 }
                }
            };

        _userAnswerRepoMock.Setup(r => r.AddAsync(It.IsAny<UserAnswer>())).Returns(Task.CompletedTask);
        _attemptRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Attempt>())).Returns(Task.CompletedTask);

        var result = await _service.FinishAttemptAsync(1, answers);

        Assert.Equal(1, result.Score);
        _userAnswerRepoMock.Verify(r => r.AddAsync(It.IsAny<UserAnswer>()), Times.Once);
        _attemptRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Attempt>()), Times.Once);
    }

    [Fact]
    public async Task FinishAttemptAsync_ShouldThrow_WhenAttemptNotFound()
    {
        _attemptRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Attempt?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.FinishAttemptAsync(1, new List<AnswerFinishDto>()));
    }

    [Fact]
    public async Task FinishAttemptAsync_ShouldThrow_WhenAlreadyCompleted()
    {
        var attempt = new Attempt { Id = 1, TimeSpent = TimeSpan.FromMinutes(5) };
        _attemptRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(attempt);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FinishAttemptAsync(1, new List<AnswerFinishDto>()));
    }

    [Fact]
    public async Task DeleteAsync_ShouldCallRepositoryAndReturnTrue()
    {
        _attemptRepoMock.Setup(r => r.DeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1);

        Assert.True(result);
        _attemptRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }
}
