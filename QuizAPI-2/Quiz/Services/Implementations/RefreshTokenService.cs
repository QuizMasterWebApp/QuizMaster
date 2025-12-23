﻿using Quiz.Models;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Interfaces;
using System.Security.Cryptography;
using System.Text;

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
        var token = GenerateRefreshToken();
        var hashedToken = ComputeSha256Hash(token);

        var entity = new RefreshToken
        {
            Token = hashedToken,
            Expires = DateTime.UtcNow.AddDays(7),
            UserId = userId,
            IsRevoked = false
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
        var hashedToken = ComputeSha256Hash(refreshToken);
        var tokenEntity = await _tokenRepository.GetAsync(hashedToken);

        if (tokenEntity == null || tokenEntity.IsRevoked || tokenEntity.Expires < DateTime.UtcNow)
            return null;

        //аннулируем старый токен
        tokenEntity.IsRevoked = true;
        await _tokenRepository.UpdateAsync(tokenEntity);
        //  новый refresh-токен
        var newRefreshToken = await CreateRefreshToken(tokenEntity.UserId);

        return newRefreshToken;
    }

    /// <summary>
    /// Разлогиниться
    /// </summary>
    /// <param name="refreshToken"></param>
    /// <returns></returns>
    public async Task LogoutAsync(string refreshToken)
    {
        var hashedToken = ComputeSha256Hash(refreshToken);
        var tokenEntity = await _tokenRepository.GetAsync(hashedToken);

        if (tokenEntity != null)
        {
            tokenEntity.IsRevoked = true;
            await _tokenRepository.UpdateAsync(tokenEntity);
        }
    }

    public async Task<RefreshToken?> GetTokenEntityByHashAsync(string hashedToken)
    {
        // Получаем токен из репозитория по хэшу
        var tokenEntity = await _tokenRepository.GetAsync(hashedToken);
        return tokenEntity;
    }

    public string GenerateRefreshToken(int size = 64)
    {
        var randomNumber = new byte[size];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public string ComputeSha256Hash(string input)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}