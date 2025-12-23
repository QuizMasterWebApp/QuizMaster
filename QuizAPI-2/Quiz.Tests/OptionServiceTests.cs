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

public class OptionServiceTests
{
    private readonly Mock<IOptionRepository> _optionRepoMock;
    private readonly Mock<IQuestionRepository> _questionRepoMock;
    private readonly OptionService _service;

    public OptionServiceTests()
    {
        _optionRepoMock = new Mock<IOptionRepository>();
        _questionRepoMock = new Mock<IQuestionRepository>();
        _service = new OptionService(_optionRepoMock.Object, _questionRepoMock.Object);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnOption()
    {
        var option = new Option { Id = 1, Text = "A" };
        _optionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(option);

        var result = await _service.GetByIdAsync(1);

        Assert.Equal("A", result!.Text);
    }

    [Fact]
    public async Task GetByQuestionAsync_ShouldReturnOptions()
    {
        var options = new List<Option>
            {
                new Option { Id = 1, Text = "A" },
                new Option { Id = 2, Text = "B" }
            };
        _optionRepoMock.Setup(r => r.GetOptionsByQuestionAsync(10)).ReturnsAsync(options);

        var result = await _service.GetByQuestionAsync(10);

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnOption_WhenQuestionExists()
    {
        var option = new Option { Id = 1, QuestionId = 10, Text = "A" };
        _questionRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Question { Id = 10 });
        _optionRepoMock.Setup(r => r.AddAsync(option)).Returns(Task.CompletedTask);

        var result = await _service.CreateAsync(option);

        Assert.Equal("A", result.Text);
        _optionRepoMock.Verify(r => r.AddAsync(option), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowException_WhenQuestionDoesNotExist()
    {
        var option = new Option { Id = 1, QuestionId = 10, Text = "A" };
        _questionRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync((Question?)null);

        await Assert.ThrowsAsync<Exception>(() => _service.CreateAsync(option));
    }

    [Fact]
    public async Task AddRangeAsync_ShouldCallRepository()
    {
        var options = new List<Option>
            {
                new Option { Id = 1, QuestionId = 10, Text = "A" },
                new Option { Id = 2, QuestionId = 10, Text = "B" }
            };

        await _service.AddRangeAsync(options);

        _optionRepoMock.Verify(r => r.AddRangeAsync(options), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnTrue_WhenOptionExists()
    {
        var existing = new Option { Id = 1, QuestionId = 10, Text = "Old", IsCorrect = false };
        var updated = new Option { Id = 1, QuestionId = 10, Text = "New", IsCorrect = true };

        _optionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _optionRepoMock.Setup(r => r.UpdateAsync(existing)).Returns(Task.CompletedTask);

        var result = await _service.UpdateAsync(updated);

        Assert.True(result);
        Assert.Equal("New", existing.Text);
        Assert.True(existing.IsCorrect);
        _optionRepoMock.Verify(r => r.UpdateAsync(existing), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnFalse_WhenOptionDoesNotExist()
    {
        var option = new Option { Id = 1, QuestionId = 10, Text = "New" };
        _optionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Option?)null);

        var result = await _service.UpdateAsync(option);

        Assert.False(result);
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrowException_WhenQuestionIdChanges()
    {
        var existing = new Option { Id = 1, QuestionId = 10, Text = "Old" };
        var updated = new Option { Id = 1, QuestionId = 20, Text = "New" };

        _optionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await Assert.ThrowsAsync<Exception>(() => _service.UpdateAsync(updated));
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnTrue_WhenOptionExists()
    {
        var option = new Option { Id = 1, Text = "A" };
        _optionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(option);
        _optionRepoMock.Setup(r => r.DeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(1);

        Assert.True(result);
        _optionRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenOptionDoesNotExist()
    {
        _optionRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Option?)null);

        var result = await _service.DeleteAsync(1);

        Assert.False(result);
    }
}
