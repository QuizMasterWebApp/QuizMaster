using Quiz.Models;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Interfaces;

namespace Quiz.Services.Implementations;

public class RefreshTokenService : IRefreshTokenService
{
    private readonly IRefreshTokenRepository _tokenRepository;

    public RefreshTokenService(IRefreshTokenRepository tokenRepository)
    {
        _tokenRepository = tokenRepository;
    }

    /// <summary>
    /// Создать refresh токен
    /// </summary>
    /// <param name="userId"></param>
    /// <returns></returns>
    public async Task<string> CreateRefreshToken(int userId)
    {
        var token = Guid.NewGuid().ToString();

        var entity = new RefreshToken
        {
            Token = token,
            UserId = userId,
            Expires = DateTime.UtcNow.AddDays(7)
        };

        await _tokenRepository.AddAsync(entity);

        return token;
    }

    /// <summary>
    /// Обновить токен
    /// </summary>
    /// <param name="refreshToken"></param>
    /// <returns></returns>
    public async Task<string?> RefreshTokenAsync(string refreshToken)
    {
        var token = await _tokenRepository.GetAsync(refreshToken);

        if (token == null || token.IsRevoked || token.Expires < DateTime.UtcNow)
            return null;

        return TokenGeneration.GenerateToken(token.UserId);
    }

    /// <summary>
    /// Разлогиниться
    /// </summary>
    /// <param name="refreshToken"></param>
    /// <returns></returns>
    public async Task LogoutAsync(string refreshToken)
    {
        await _tokenRepository.RevokeAsync(refreshToken);
    }
}
