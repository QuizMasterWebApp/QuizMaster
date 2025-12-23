using Quiz.Models;

namespace Quiz.Services.Interfaces;

public interface IRefreshTokenService
{
    Task<string> CreateRefreshToken(int userId);
    Task<string?> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
    Task<RefreshToken?> GetTokenEntityByHashAsync(string hashedToken);
    string GenerateRefreshToken(int size);
    string ComputeSha256Hash(string input);
}