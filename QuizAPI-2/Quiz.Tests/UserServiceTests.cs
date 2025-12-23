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

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<ILoginAttemptRepository> _loginAttemptRepositoryMock;
    private readonly UserService _userService;

    public UserServiceTests()
    {
        Environment.SetEnvironmentVariable("JWT_SECRET_KEY", "ThisIsA32ByteLongTestSecretKey!!!!");

        _userRepositoryMock = new Mock<IUserRepository>();
        _loginAttemptRepositoryMock = new Mock<ILoginAttemptRepository>();
        _userService = new UserService(
            _userRepositoryMock.Object, 
            _loginAttemptRepositoryMock.Object
        );
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnUser_WhenUserExists()
    {
        var user = new User { Id = 1, Username = "testuser" };
        _userRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        var result = await _userService.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("testuser", result!.Username);
    }

    [Fact]
    public async Task GetByUsernameAsync_ShouldReturnUser_WhenUserExists()
    {
        var user = new User { Id = 1, Username = "testuser" };
        _userRepositoryMock.Setup(r => r.GetByUsernameAsync("testuser")).ReturnsAsync(user);

        var result = await _userService.GetByUsernameAsync("testuser");

        Assert.NotNull(result);
        Assert.Equal(1, result!.Id);
    }

    [Fact]
    public async Task RegisterAsync_ShouldReturnToken_WhenUserDoesNotExist()
    {
        _userRepositoryMock.Setup(r => r.GetByUsernameAsync("newuser")).ReturnsAsync((User?)null);
        _userRepositoryMock.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var token = await _userService.RegisterAsync("newuser", "password");

        Assert.False(string.IsNullOrEmpty(token));
        _userRepositoryMock.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_ShouldReturnEmpty_WhenUserAlreadyExists()
    {
        var existingUser = new User { Id = 1, Username = "existing" };
        _userRepositoryMock.Setup(r => r.GetByUsernameAsync("existing")).ReturnsAsync(existingUser);

        var token = await _userService.RegisterAsync("existing", "password");

        Assert.Equal(string.Empty, token);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnToken_WhenCredentialsAreCorrect()
    {
        var user = new User { Id = 1, Username = "testuser", PasswordHash = PasswordHasher.HashPassword("password") };
        _userRepositoryMock.Setup(r => r.GetByUsernameAsync("testuser")).ReturnsAsync(user);
        var attempt = new LoginAttempt { Username = "testuser", AttemptCount = 1, LastAttempt = DateTime.UtcNow };
        _loginAttemptRepositoryMock.Setup(r => r.GetByUsernameAsync("testuser")).ReturnsAsync(attempt);
        _loginAttemptRepositoryMock.Setup(r => r.ResetAttemptsAsync("testuser")).Returns(Task.CompletedTask);

        var token = await _userService.LoginAsync("testuser", "password");

        Assert.False(string.IsNullOrEmpty(token));
        _loginAttemptRepositoryMock.Verify(r => r.ResetAttemptsAsync("testuser"), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnEmpty_WhenPasswordIsIncorrect()
    {
        var user = new User { Id = 1, Username = "testuser", PasswordHash = PasswordHasher.HashPassword("correct") };
        _userRepositoryMock.Setup(r => r.GetByUsernameAsync("testuser")).ReturnsAsync(user);
        _loginAttemptRepositoryMock.Setup(r => r.GetByUsernameAsync("testuser")).ReturnsAsync((LoginAttempt?)null);
        _loginAttemptRepositoryMock.Setup(r => r.AddOrUpdateAsync(It.IsAny<LoginAttempt>())).Returns(Task.CompletedTask);

        var result = await _userService.LoginAsync("testuser", "wrongpassword");

        Assert.Equal(string.Empty, result);
        _loginAttemptRepositoryMock.Verify(r => r.AddOrUpdateAsync(It.IsAny<LoginAttempt>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnTrue_WhenUserExists()
    {
        var user = new User { Id = 1 };
        _userRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepositoryMock.Setup(r => r.DeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _userService.DeleteAsync(1);

        Assert.True(result);
        _userRepositoryMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalse_WhenUserDoesNotExist()
    {
        _userRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((User?)null);

        var result = await _userService.DeleteAsync(1);

        Assert.False(result);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnTrue_WhenUserExists()
    {
        var existingUser = new User { Id = 1, Username = "old", PasswordHash = "hash" };
        var updatedUser = new User { Id = 1, Username = "new", PasswordHash = "newhash" };
        _userRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existingUser);
        _userRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var result = await _userService.UpdateAsync(updatedUser);

        Assert.True(result);
        _userRepositoryMock.Verify(r => r.UpdateAsync(It.Is<User>(u => u.Username == "new" && u.PasswordHash == "newhash")), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnFalse_WhenUserDoesNotExist()
    {
        var updatedUser = new User { Id = 1, Username = "new", PasswordHash = "newhash" };
        _userRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((User?)null);

        var result = await _userService.UpdateAsync(updatedUser);

        Assert.False(result);
    }
}
