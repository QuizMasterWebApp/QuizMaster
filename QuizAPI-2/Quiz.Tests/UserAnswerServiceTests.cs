using Moq;
using Quiz.Models;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Implementations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Quiz.Tests;

public class UserAnswerServiceTests
{
    private readonly Mock<IUserAnswerRepository> _userAnswerRepoMock;
    private readonly Mock<IAttemptRepository> _attemptRepoMock;
    private readonly Mock<IQuestionRepository> _questionRepoMock;
    private readonly UserAnswerService _service;

    public UserAnswerServiceTests()
    {
        _userAnswerRepoMock = new Mock<IUserAnswerRepository>();
        _attemptRepoMock = new Mock<IAttemptRepository>();
        _questionRepoMock = new Mock<IQuestionRepository>();

        _service = new UserAnswerService(
            _userAnswerRepoMock.Object,
            _attemptRepoMock.Object,
            _questionRepoMock.Object
        );
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnUserAnswer()
    {
        var answer = new UserAnswer { Id = 1, QuestionId = 10 };
        _userAnswerRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(answer);

        var result = await _service.GetByIdAsync(1);

        Assert.Equal(10, result!.QuestionId);
    }

    [Fact]
    public async Task GetAnswersByAttemptAsync_ShouldReturnAnswers()
    {
        var answers = new List<UserAnswer>
            {
                new UserAnswer { Id = 1, AttemptId = 5 },
                new UserAnswer { Id = 2, AttemptId = 5 }
            };
        _userAnswerRepoMock.Setup(r => r.GetAnswersByAttemptAsync(5)).ReturnsAsync(answers);

        var result = await _service.GetAnswersByAttemptAsync(5);

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnAnswer_WhenValid()
    {
        var answer = new UserAnswer { Id = 1, AttemptId = 5, QuestionId = 10 };
        var attempt = new Attempt { Id = 5, QuizId = 100 };
        var question = new Question { Id = 10, QuizId = 100 };

        _attemptRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(attempt);
        _questionRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(question);
        _userAnswerRepoMock.Setup(r => r.AddAsync(answer)).Returns(Task.CompletedTask);

        var result = await _service.CreateAsync(answer);

        Assert.Equal(1, result.Id);
        _userAnswerRepoMock.Verify(r => r.AddAsync(answer), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenAttemptNotFound()
    {
        var answer = new UserAnswer { Id = 1, AttemptId = 5, QuestionId = 10 };
        _attemptRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync((Attempt?)null);

        await Assert.ThrowsAsync<Exception>(() => _service.CreateAsync(answer));
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenQuestionNotFound()
    {
        var answer = new UserAnswer { Id = 1, AttemptId = 5, QuestionId = 10 };
        _attemptRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Attempt { Id = 5, QuizId = 100 });
        _questionRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync((Question?)null);

        await Assert.ThrowsAsync<Exception>(() => _service.CreateAsync(answer));
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenQuestionQuizMismatch()
    {
        var answer = new UserAnswer { Id = 1, AttemptId = 5, QuestionId = 10 };
        var attempt = new Attempt { Id = 5, QuizId = 100 };
        var question = new Question { Id = 10, QuizId = 200 }; // mismatch

        _attemptRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(attempt);
        _questionRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(question);

        await Assert.ThrowsAsync<Exception>(() => _service.CreateAsync(answer));
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnTrue_WhenAnswerExists()
    {
        var existing = new UserAnswer { Id = 1, QuestionId = 10 };
        var updated = new UserAnswer { Id = 1, QuestionId = 10 };

        _userAnswerRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _userAnswerRepoMock.Setup(r => r.UpdateAsync(updated)).Returns(Task.CompletedTask);

        var result = await _service.UpdateAsync(updated);

        Assert.True(result);
        _userAnswerRepoMock.Verify(r => r.UpdateAsync(updated), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnFalse_WhenAnswerDoesNotExist()
    {
        var answer = new UserAnswer { Id = 1, QuestionId = 10 };
        _userAnswerRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((UserAnswer?)null);

        var result = await _service.UpdateAsync(answer);

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnTrue_WhenAnswerExists()
    {
        var answer = new UserAnswer { Id = 1 };
        _userAnswerRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(answer);
        _userAnswerRepoMock.Setup(r => r.DeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1);

        Assert.True(result);
        _userAnswerRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenAnswerDoesNotExist()
    {
        _userAnswerRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((UserAnswer?)null);

        var result = await _service.DeleteAsync(1);

        Assert.False(result);
    }
}
