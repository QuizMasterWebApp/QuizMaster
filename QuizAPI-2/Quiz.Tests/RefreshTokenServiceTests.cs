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

public class RefreshTokenServiceTests
{
    private readonly Mock<IRefreshTokenRepository> _repoMock;
    private readonly RefreshTokenService _service;

    public RefreshTokenServiceTests()
    {
        _repoMock = new Mock<IRefreshTokenRepository>();
        _service = new RefreshTokenService(_repoMock.Object);
    }

    [Fact]
    public async Task CreateRefreshToken_ShouldReturnTokenAndAddToRepository()
    {
        var userId = 1;
        _repoMock.Setup(r => r.AddAsync(It.IsAny<RefreshToken>())).Returns(Task.CompletedTask);

        var token = await _service.CreateRefreshToken(userId);

        Assert.False(string.IsNullOrWhiteSpace(token));
        _repoMock.Verify(r => r.AddAsync(It.Is<RefreshToken>(t => t.UserId == userId && t.Token == token)), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_ShouldReturnNull_WhenTokenNotFound()
    {
        _repoMock.Setup(r => r.GetAsync("abc")).ReturnsAsync((RefreshToken?)null);

        var result = await _service.RefreshTokenAsync("abc");

        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_ShouldReturnNull_WhenTokenRevoked()
    {
        _repoMock.Setup(r => r.GetAsync("abc")).ReturnsAsync(new RefreshToken { IsRevoked = true, Expires = DateTime.UtcNow.AddDays(1), UserId = 1 });

        var result = await _service.RefreshTokenAsync("abc");

        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_ShouldReturnNull_WhenTokenExpired()
    {
        _repoMock.Setup(r => r.GetAsync("abc")).ReturnsAsync(new RefreshToken { IsRevoked = false, Expires = DateTime.UtcNow.AddDays(-1), UserId = 1 });

        var result = await _service.RefreshTokenAsync("abc");

        Assert.Null(result);
    }

    [Fact]
    public async Task LogoutAsync_ShouldCallRevokeAsync()
    {
        _repoMock.Setup(r => r.RevokeAsync("abc")).Returns(Task.CompletedTask);

        await _service.LogoutAsync("abc");

        _repoMock.Verify(r => r.RevokeAsync("abc"), Times.Once);
    }
}
