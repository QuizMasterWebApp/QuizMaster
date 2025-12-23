using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Quiz.Middleware;
using Quiz.Models;
using Quiz.Repositories.Implementations;
using Quiz.Repositories.Interfaces;
using Quiz.Services.Implementations;
using Quiz.Services.Interfaces;
namespace Quiz;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "Quiz API", Version = "v1" });

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                In = ParameterLocation.Header,
                Description = "Enter token",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
                    },
                    new string[] {}
                }
            });
        });

        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
            throw new InvalidOperationException("DefaultConnection environment variable is not set.");

        builder.Services.AddDbContext<QuizDBContext>(options =>
            options.UseNpgsql(connectionString));

        builder.Services.AddScoped<IUserRepository, UserRepository>();
        builder.Services.AddScoped<IQuizRepository, QuizRepository>();
        builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
        builder.Services.AddScoped<IAttemptRepository, AttemptRepository>();
        builder.Services.AddScoped<IUserAnswerRepository, UserAnswerRepository>();
        builder.Services.AddScoped<IOptionRepository, OptionRepository>();
        builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        builder.Services.AddScoped<ILoginAttemptRepository, LoginAttemptRepository>();

        builder.Services.AddScoped<IUserService, UserService>();
        builder.Services.AddScoped<IQuizService, QuizService>();
        builder.Services.AddScoped<IQuestionService, QuestionService>();
        builder.Services.AddScoped<IAttemptService, AttemptService>();
        builder.Services.AddScoped<IUserAnswerService, UserAnswerService>();
        builder.Services.AddScoped<IOptionService, OptionService>();
        builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();

        builder.Services.AddSingleton<IHtmlSanitizerService, HtmlSanitizerService>();

        builder.Services.AddHttpContextAccessor();

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
         .AddJwtBearer(options =>
         {
             options.TokenValidationParameters = new TokenValidationParameters
             {
                 ValidateIssuer = true,
                 ValidIssuer = AuthOptions.ISSUER,
                 ValidateAudience = true,
                 ValidAudience = AuthOptions.AUDIENCE,
                 ValidateLifetime = true,
                 ClockSkew = TimeSpan.Zero,
                 IssuerSigningKey = AuthOptions.GetSymmetricSecurityKey(),
                 ValidateIssuerSigningKey = true,
             };
         });
        builder.Services.AddAuthorization();

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.WithOrigins("http://localhost:3000");
                policy.AllowAnyHeader();
                policy.AllowAnyMethod();
            });

        });

        var app = builder.Build();
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var logger = services.GetRequiredService<ILogger<Program>>();
            
            int maxRetries = 10;
            int delaySeconds = 5; 
            
            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    var context = services.GetRequiredService<QuizDBContext>();
                    
                    context.Database.Migrate(); 
                    logger.LogInformation("Database migrations applied successfully.");
                    break; 
                }
                catch (Npgsql.NpgsqlException ex) when (ex.InnerException is System.Net.Sockets.SocketException)
                {
                    logger.LogWarning($"Attempt {i + 1} of {maxRetries}: Database connection failed (Connection refused). Retrying in {delaySeconds} seconds...");

                    if (i == maxRetries - 1)
                    {
                        logger.LogError(ex, "Failed to connect to the database after all retries.");
                        throw; 
                    }
                    Thread.Sleep(delaySeconds * 1000); 
                    delaySeconds *= 2; 
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "An error occurred while migrating the database.");
                    throw; 
                }
            }
        }

        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Quiz API V1");
            c.RoutePrefix = "swagger"; 
        });

        app.UseMiddleware<RequestLoggingMiddleware>();

        app.UseHsts();
        app.UseHttpsRedirection();
        app.UseRouting();

        app.UseCors();

        app.UseMiddleware<SecurityHeadersMiddleware>();        
        app.UseMiddleware<GuestSessionMiddleware>();
        app.UseMiddleware<HtmlSanitizerMiddleware>();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}