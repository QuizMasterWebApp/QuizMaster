using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly QuizDBContext _context;

    public RefreshTokenRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Добавить refresh токен
    /// </summary>
    /// <param name="token"></param>
    /// <returns></returns>
    public async Task AddAsync(RefreshToken token)
    {
        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Получить токен
    /// </summary>
    /// <param name="token"></param>
    /// <returns></returns>
    public async Task<RefreshToken?> GetAsync(string token)
    {
        return await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token);
    }

    /// <summary>
    /// Сбросить токен
    /// </summary>
    /// <param name="token"></param>
    /// <returns></returns>
    public async Task RevokeAsync(string token)
    {
        var entity = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token);
        if (entity != null)
        {
            entity.IsRevoked = true;
            await _context.SaveChangesAsync();
        }
    }
}
