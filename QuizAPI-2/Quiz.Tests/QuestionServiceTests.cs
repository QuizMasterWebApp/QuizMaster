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

public class QuestionServiceTests
{
    private readonly Mock<IQuestionRepository> _questionRepoMock;
    private readonly Mock<IQuizRepository> _quizRepoMock;
    private readonly Mock<IOptionRepository> _optionRepoMock;
    private readonly QuestionService _service;

    public QuestionServiceTests()
    {
        _questionRepoMock = new Mock<IQuestionRepository>();
        _quizRepoMock = new Mock<IQuizRepository>();
        _optionRepoMock = new Mock<IOptionRepository>();

        _service = new QuestionService(
            _questionRepoMock.Object,
            _quizRepoMock.Object,
            _optionRepoMock.Object
        );
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnQuestion()
    {
        var question = new Question { Id = 1, Text = "Q1" };
        _questionRepoMock.Setup(r => r.GetByIdWithOptionsAsync(1)).ReturnsAsync(question);

        var result = await _service.GetByIdAsync(1);

        Assert.Equal("Q1", result!.Text);
    }

    [Fact]
    public async Task GetByQuizAsync_ShouldReturnQuestions()
    {
        var questions = new List<Question> { new Question { Id = 1, Text = "Q1" } };
        _questionRepoMock.Setup(r => r.GetQuestionsWithOptionsByQuizAsync(10)).ReturnsAsync(questions);

        var result = await _service.GetByQuizAsync(10);

        Assert.Single(result);
        Assert.Equal("Q1", result.First().Text);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateQuestionWithOptions()
    {
        var question = new Question { Id = 1, QuizId = 10, Text = "Q1", Type = QuestionType.Single };
        var optionTexts = new List<string> { "A", "B" };
        var flags = new List<bool> { true, false };

        _quizRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Models.Quiz { Id = 10 });
        _questionRepoMock.Setup(r => r.AddAsync(question)).Returns(Task.CompletedTask);
        _optionRepoMock.Setup(r => r.AddRangeAsync(It.IsAny<List<Option>>())).Returns(Task.CompletedTask);

        var result = await _service.CreateAsync(question, optionTexts, flags);

        Assert.Equal(2, result.Options.Count);
        Assert.True(result.Options.Any(o => o.IsCorrect));
        _questionRepoMock.Verify(r => r.AddAsync(question), Times.Once);
        _optionRepoMock.Verify(r => r.AddRangeAsync(It.IsAny<List<Option>>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowArgumentException_WhenOptionCountMismatch()
    {
        var question = new Question { Id = 1, QuizId = 10, Text = "Q1", Type = QuestionType.Single };
        var optionTexts = new List<string> { "A", "B" };
        var flags = new List<bool> { true }; // mismatch

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateAsync(question, optionTexts, flags));
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowKeyNotFoundException_WhenQuizNotFound()
    {
        var question = new Question { Id = 1, QuizId = 10, Text = "Q1", Type = QuestionType.Single };
        var optionTexts = new List<string> { "A", "B" };
        var flags = new List<bool> { true, false };

        _quizRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync((Models.Quiz?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _service.CreateAsync(question, optionTexts, flags));
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateQuestionAndOptions()
    {
        var existing = new Question
        {
            Id = 1,
            Text = "Old",
            Type = QuestionType.Single,
            Options = new List<Option> { new Option { Id = 1, Text = "X", IsCorrect = true } }
        };

        var updated = new Question { Id = 1, Text = "New", Type = QuestionType.Single };
        var newOptions = new List<string> { "A", "B" };
        var newFlags = new List<bool> { true, false };

        _questionRepoMock.Setup(r => r.GetByIdWithOptionsAsync(1)).ReturnsAsync(existing);
        _optionRepoMock.Setup(r => r.DeleteAsync(It.IsAny<int>())).Returns(Task.CompletedTask);
        _optionRepoMock.Setup(r => r.AddRangeAsync(It.IsAny<List<Option>>())).Returns(Task.CompletedTask);
        _questionRepoMock.Setup(r => r.UpdateAsync(existing)).Returns(Task.CompletedTask);

        var result = await _service.UpdateAsync(updated, newOptions, newFlags);

        Assert.True(result);
        Assert.Equal("New", existing.Text);
        Assert.Equal(2, existing.Options.Count);
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrowKeyNotFoundException_WhenQuestionDoesNotExist()
    {
        _questionRepoMock.Setup(r => r.GetByIdWithOptionsAsync(1)).ReturnsAsync((Question?)null);
        var question = new Question { Id = 1, Text = "Q" };

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.UpdateAsync(question));
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnTrue_WhenQuestionDeleted()
    {
        var question = new Question { Id = 1 };
        _questionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(question);
        _questionRepoMock.Setup(r => r.HasAnswersAsync(1)).ReturnsAsync(false);
        _questionRepoMock.Setup(r => r.DeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1);

        Assert.True(result);
        _questionRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenQuestionDoesNotExist()
    {
        _questionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Question?)null);

        var result = await _service.DeleteAsync(1);

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteAsync_ShouldThrowException_WhenQuestionHasAnswers()
    {
        var question = new Question { Id = 1 };
        _questionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(question);
        _questionRepoMock.Setup(r => r.HasAnswersAsync(1)).ReturnsAsync(true);

        await Assert.ThrowsAsync<Exception>(() => _service.DeleteAsync(1));
    }

    [Theory]
    [InlineData(QuestionType.Single, 2, 1, false)]
    [InlineData(QuestionType.Single, 2, 2, true)]
    [InlineData(QuestionType.Multiple, 3, 1, true)]
    public void ValidateOptions_ShouldThrow_WhenInvalidOptions(QuestionType type, int optionCount, int correctCount, bool shouldThrow)
    {
        var question = new Question { Type = type, QuizId = 1 };
        var flags = Enumerable.Repeat(true, correctCount)
                              .Concat(Enumerable.Repeat(false, optionCount - correctCount))
                              .ToList();
        _quizRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<int>())).ReturnsAsync(new Models.Quiz { Id = 1 });
        if (shouldThrow)
            Assert.Throws<InvalidOperationException>(() => 
            _service.CreateAsync(question, Enumerable.Range(1, optionCount)
            .Select(i => "Opt" + i).ToList(), flags).GetAwaiter().GetResult());
        else
            Assert.NotNull(_service.CreateAsync(question, Enumerable.Range(1, optionCount).Select(i => "Opt" + i).ToList(), flags).GetAwaiter().GetResult());
    }
}
