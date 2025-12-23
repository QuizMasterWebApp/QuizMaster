using Microsoft.EntityFrameworkCore;
using Quiz.Models;
using Quiz.Repositories.Interfaces;

namespace Quiz.Repositories.Implementations;

public class UserRepository : IUserRepository
{
    private readonly QuizDBContext _context;

    public UserRepository(QuizDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Получить пользвоателя
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .Include(u => u.Quizzes)
            .Include(u => u.Attempts)
                .ThenInclude(a => a.Quiz)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    /// <summary>
    /// Получить пользвоателя оп юзернейму
    /// </summary>
    /// <param name="username"></param>
    /// <returns></returns>
    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username);
    }

    /// <summary>
    /// Получить всех пользователей
    /// </summary>
    /// <returns></returns>
    public async Task<IEnumerable<User>> GetAllAsync()
    {
        return await _context.Users.ToListAsync();
    }

    /// <summary>
    /// Добавить в БД
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Обновить данные
    /// </summary>
    /// <param name="user"></param>
    /// <returns></returns>
    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Удалить пользвоателя
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    public async Task DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user != null)
        {
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }
    }
}