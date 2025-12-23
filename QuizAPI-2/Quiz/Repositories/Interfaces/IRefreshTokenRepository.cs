using Quiz.Models;

namespace Quiz.Repositories.Interfaces;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token);
    Task<RefreshToken?> GetAsync(string token);
    Task UpdateAsync(RefreshToken token);
    Task RevokeAsync(string token);
}