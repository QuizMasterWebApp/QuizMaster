namespace Quiz.Services.Interfaces;

public interface IRefreshTokenService
{
    Task<string> CreateRefreshToken(int userId);
    Task<string?> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
}
