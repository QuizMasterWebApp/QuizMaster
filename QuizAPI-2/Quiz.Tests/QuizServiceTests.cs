using Moq;
using Quiz.Models;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Implementations;
using Xunit;

namespace Quiz.Tests;

public class QuizServiceTests
{
    private readonly Mock<IQuizRepository> _quizRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly QuizService _service;

    public QuizServiceTests()
    {
        _quizRepoMock = new Mock<IQuizRepository>();
        _userRepoMock = new Mock<IUserRepository>();

        _service = new QuizService(
            _quizRepoMock.Object,
            _userRepoMock.Object
        );
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnQuiz_WhenExists()
    {
        var quiz = new Models.Quiz { Id = 1 };
        _quizRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(quiz);

        var result = await _service.GetByIdAsync(1);

        Assert.Equal(quiz, result);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotExists()
    {
        _quizRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Models.Quiz?)null);

        var result = await _service.GetByIdAsync(1);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrow_WhenAuthorNotFound()
    {
        var quiz = new Models.Quiz { AuthorId = 1 };

        _userRepoMock.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() =>
            _service.CreateAsync(quiz));
    }

    [Fact]
    public async Task CreateAsync_PublicQuiz_ShouldNotHaveAccessKey()
    {
        var quiz = new Models.Quiz
        {
            AuthorId = 1,
            isPublic = true
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(new User { Id = 1 });

        var result = await _service.CreateAsync(quiz);

        Assert.Null(result.PrivateAccessKey);
        _quizRepoMock.Verify(r => r.AddAsync(It.IsAny<Models.Quiz>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_PrivateQuiz_ShouldGenerateAccessKey()
    {
        var quiz = new Models.Quiz
        {
            AuthorId = 1,
            isPublic = false
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(new User { Id = 1 });

        _quizRepoMock.Setup(r => r.GetByAccessKeyAsync(It.IsAny<string>()))
            .ReturnsAsync((Models.Quiz?)null);

        var result = await _service.CreateAsync(quiz);

        Assert.NotNull(result.PrivateAccessKey);
        Assert.Equal(5, result.PrivateAccessKey.Length);
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrow_WhenAuthorChanged()
    {
        var existingQuiz = new Models.Quiz
        {
            Id = 1,
            AuthorId = 1
        };

        var updatedQuiz = new Models.Quiz
        {
            Id = 1,
            AuthorId = 2
        };

        _quizRepoMock.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(existingQuiz);

        await Assert.ThrowsAsync<Exception>(() =>
            _service.UpdateAsync(updatedQuiz));
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenQuizNotFound()
    {
        _quizRepoMock.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync((Models.Quiz?)null);

        var result = await _service.DeleteAsync(1);

        Assert.False(result);
    }

    [Fact]
    public async Task GetByAccessKeyAsync_ShouldConvertToUpper()
    {
        _quizRepoMock.Setup(r => r.GetByAccessKeyAsync("ABCDE"))
            .ReturnsAsync(new Models.Quiz());

        var result = await _service.GetByAccessKeyAsync("abcde");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdWithDetailsAsync_ShouldReturnQuizWithDetails()
    {
        var quiz = new Models.Quiz { Id = 1 };
        _quizRepoMock.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(quiz);

        var result = await _service.GetByIdWithDetailsAsync(1);

        Assert.Equal(quiz, result);
    }

    [Fact]
    public async Task GetAllPublicAsync_ShouldReturnPublicQuizzes()
    {
        var quizzes = new List<Models.Quiz> { new Models.Quiz(), new Models.Quiz() };
        _quizRepoMock.Setup(r => r.GetPublicQuizzesAsync()).ReturnsAsync(quizzes);

        var result = await _service.GetAllPublicAsync();

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task GetByAuthorAsync_ShouldReturnQuizzesByAuthor()
    {
        var quizzes = new List<Models.Quiz> { new Models.Quiz(), new Models.Quiz() };
        _quizRepoMock.Setup(r => r.GetQuizzesByAuthorAsync(1)).ReturnsAsync(quizzes);

        var result = await _service.GetByAuthorAsync(1);

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task GetQuizzesByCategoryAsync_ShouldReturnQuizzes()
    {
        var quizzes = new List<Models.Quiz> { new Models.Quiz(), new Models.Quiz() };
        _quizRepoMock.Setup(r => r.GetQuizzesByCategoryAsync(CategoryType.Science))
            .ReturnsAsync(quizzes);

        var result = await _service.GetQuizzesByCategoryAsync(CategoryType.Science);

        Assert.Equal(2, result.Count());
    }
}
