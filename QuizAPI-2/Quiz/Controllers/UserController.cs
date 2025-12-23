using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Quiz.DTOs.Attempt;
using Quiz.DTOs.Quiz;
using Quiz.DTOs.User;
using Quiz.Models;
using Quiz.Services.Interfaces;
using System.Security.Claims;

namespace Quiz.Controllers;


[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IQuizService _quizService;
    private readonly IAttemptService _attemptService;
    private readonly IRefreshTokenService _refreshTokenService;

    public UserController(IUserService userService, IQuizService quizService, IAttemptService attemptService, IRefreshTokenService refreshTokenService)
    {
        _userService = userService;
        _quizService = quizService;
        _attemptService = attemptService;
        _refreshTokenService = refreshTokenService;
    }

    // GET: api/user
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllAsync() ?? new List<User>();
        if (!users.Any())
        {
            return Ok(new List<UserDto>());
        }
        var result = users.Select(a => new UserDto
        {
            Id = a.Id,
            Name = a.Username
        });

        return Ok(result);

    }

    // GET: api/user/{id}
    [HttpGet("{id}")] 
    public async Task<IActionResult> GetById(int id) 
    { 
        var user = await _userService.GetByIdAsync(id);
        if (user is null)
        {
            return NotFound($"User with ID {id} not found.");
        }
        var result = new UserDto
        {
            Id = user.Id,
            Name = user.Username
        };

        return Ok(result);
    }

    // GET: api/user/"by-username/{username}
    [HttpGet("by-username/{username}")]
    public async Task<IActionResult> GetByUsername(string username)
    {
        var user = await _userService.GetByUsernameAsync(username);
        if (user == null)
            return NotFound($"User with username {username} not found.");

        var result = new UserDto
        {
            Id = user.Id,
            Name = user.Username
        };

        return Ok(result);
    }

    // GET: api/user/{userId}/quizzes
    [HttpGet("{userId}/quizzes")]
    public async Task<IActionResult> GetQuizzes(int userId)
    {
        var quizzes = await _quizService.GetByAuthorAsync(userId);

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
            PrivateAccessKey = q.PrivateAccessKey,
            IsDeleted = q.IsDeleted
        });

        return Ok(result);
    }

    // GET: api/user/{userId}/attempts
    [HttpGet("{userId}/attempts")]
    public async Task<IActionResult> GetAttempts(int userId)
    {
        var attempts = await _attemptService.GetByUserIdAsync(userId);

        if (!attempts.Any())
            return Ok(new List<AttemptDto>());

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

    // PUT: api/user/{id}
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UserUpdateDto dto)
    {
        var existing = await _userService.GetByIdAsync(id);
        if (existing == null)
            return NotFound($"User with ID {id} not found.");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (existing.Id != authorizedUserId)
            return StatusCode(403, new { error = "You can only edit your own profile" });

        //обновление пароля
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            if (string.IsNullOrWhiteSpace(dto.OldPassword))
            {
                return BadRequest(new { error = "Current password is required to set a new password." });
            }

            bool isOldPasswordCorrect = PasswordHasher.VerifyPassword(dto.OldPassword, existing.PasswordHash);
            
            if (!isOldPasswordCorrect)
            {
                return Unauthorized(new { error = "Current password is incorrect." });
            }

            existing.PasswordHash = PasswordHasher.HashPassword(dto.Password);
        }

        //  обновление юзернейма
        if (!string.IsNullOrWhiteSpace(dto.UserName) && dto.UserName != existing.Username)
        {
            User? checkname = await _userService.GetByUsernameAsync(dto.UserName);
            if (checkname is not null)
                return Conflict(new { error = $"Username {dto.UserName} is taken" });
            
            existing.Username = dto.UserName;
        }

        var success = await _userService.UpdateAsync(existing);
        if (!success)
            return StatusCode(500, "Failed to update user due to server error.");

        return Ok("Updated");
    }

    // DELETE: api/user/{id}
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _userService.GetByIdAsync(id);
        if (existing == null)
            return NotFound($"User with ID {id} not found.");

        var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int authorizedUserId = int.Parse(user);
        if (existing.Id != authorizedUserId)
        {
            return StatusCode(403, new 
            { 
                error = "You are only allowed to delete your own user profile." 
            });
        }
            var success = await _userService.DeleteAsync(id);
            if (!success)
                return StatusCode(500, "Failed to delete user due to server error.");
            return Ok("Deleted");
    }

    // POST: api/user/register
    [HttpPost("register")]
    public async Task<IActionResult> AddNewUser([FromBody] AuthDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        string token;
        try
        {
            token = await _userService.RegisterAsync(dto.Username, dto.Password);
            if (string.IsNullOrEmpty(token))
                return Conflict("This username is already in use");
            return Ok(new { Token = token });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // POST api/user/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        try
        {
            string token = await _userService.LoginAsync(dto.Username, dto.Password);
            if (string.IsNullOrEmpty(token))
                return Unauthorized("Invalid username or password");

            var user = await _userService.GetByUsernameAsync(dto.Username);
            var refresh = await _refreshTokenService.CreateRefreshToken(user.Id);

            Response.Cookies.Append("refreshToken", refresh, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(7)
            });

            return Ok(new { Token = token });
        }
        catch (Exception ex) { return StatusCode(500, ex.Message); }
    }

    // POST: api/user/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var oldRefresh = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(oldRefresh))
            return Unauthorized("Refresh token not found");

        // Обновляем refresh токен
        var newRefresh = await _refreshTokenService.RefreshTokenAsync(oldRefresh);
        if (newRefresh == null)
            return Unauthorized("Refresh token invalid or expired");

        // Получаем пользователя по refresh токену
        var hashedOld = _refreshTokenService.ComputeSha256Hash(oldRefresh);
        var tokenEntity = await _refreshTokenService.GetTokenEntityByHashAsync(hashedOld);
        var userId = tokenEntity.UserId;

        // Генерируем новый access токен
        var accessToken = TokenGeneration.GenerateToken(userId);

        Response.Cookies.Append("refreshToken", newRefresh, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7)
        });

        return Ok(new { AccessToken = accessToken });
    }

    // POST: api/user/logout
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refresh = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refresh))
        {
            await _refreshTokenService.LogoutAsync(refresh);
            Response.Cookies.Delete("refreshToken");
        }

        return Ok();
    }
}