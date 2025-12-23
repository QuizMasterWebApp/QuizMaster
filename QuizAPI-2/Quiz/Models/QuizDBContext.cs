using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Quiz.Models;

public class QuizDBContext : DbContext
{
    public QuizDBContext()
    {
    }

    public QuizDBContext(DbContextOptions<QuizDBContext> options)
        : base(options)
    {
    }

    public DbSet<Attempt> Attempts { get; set; }
    public DbSet<Option> Options { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Quiz> Quizzes { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<UserAnswer> UserAnswers { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<LoginAttempt> LoginAttempts { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Загружаем конфигурацию
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();

            var connectionString = config.GetConnectionString("DefaultConnection");

            if (string.IsNullOrEmpty(connectionString))
                throw new Exception("Connection string is missing! Add it to appsettings.json or environment variables.");

            optionsBuilder.UseNpgsql(connectionString);
        }
    }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //  User 
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).ValueGeneratedOnAdd();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.Username)
                  .IsRequired()
                  .HasMaxLength(50);
            entity.Property(u => u.PasswordHash).IsRequired();

            entity.HasMany(u => u.Quizzes)
                  .WithOne(q => q.Author)
                  .HasForeignKey(q => q.AuthorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(u => u.Attempts)
                  .WithOne(a => a.User)
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        //  Question 
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(q => q.Text).IsRequired();

            entity.Property(e => e.Type)
               .HasConversion<int>()
               .IsRequired();

            entity.HasOne(q => q.Quiz)
                  .WithMany(quiz => quiz.Questions)
                  .HasForeignKey(q => q.QuizId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Options)
               .WithOne(e => e.Question)
               .HasForeignKey(e => e.QuestionId)
               .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.UserAnswers)
                .WithOne(e => e.Question)
                .HasForeignKey(e => e.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);

        });

        //  Quiz 
        modelBuilder.Entity<Quiz>(entity =>
        {
            entity.HasQueryFilter(q => !q.IsDeleted);

            entity.HasKey(q => q.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(q => q.Title).IsRequired().HasMaxLength(200);

            entity.Property(e => e.Category)
                .HasConversion<int>()
                .IsRequired(false);

            entity.HasOne(q => q.Author)
                  .WithMany(u => u.Quizzes)
                  .HasForeignKey(q => q.AuthorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Questions)
                .WithOne(e => e.Quiz)
                .HasForeignKey(e => e.QuizId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(q => q.Attempts)
                  .WithOne(a => a.Quiz)
                  .HasForeignKey(a => a.QuizId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        //  Attempt 
        modelBuilder.Entity<Attempt>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Score).HasDefaultValue(0);

            //entity.HasOne(e => e.Quiz)
            //    .WithMany(e => e.Attempts)
            //    .HasForeignKey(e => e.QuizId)
            //    .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany(e => e.Attempts)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.UserAnswers)
                .WithOne(e => e.Attempt)
                .HasForeignKey(e => e.AttemptId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        //  UserAnswer 
        modelBuilder.Entity<UserAnswer>(entity =>
        {
            entity.HasKey(ua => ua.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            // Составной уникальный индекс для предотвращения дубликатов
            entity.HasIndex(e => new { e.AttemptId, e.QuestionId, e.ChosenOptionId }).IsUnique();

            entity.HasOne(ua => ua.Question)
                  .WithMany(q => q.UserAnswers)
                  .HasForeignKey(ua => ua.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ua => ua.Attempt)
                  .WithMany(a => a.UserAnswers)
                  .HasForeignKey(ua => ua.AttemptId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ua => ua.ChosenOption)
                  .WithMany(o => o.UserAnswers)
                  .HasForeignKey(ua => ua.ChosenOptionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
