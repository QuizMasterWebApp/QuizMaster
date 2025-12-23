using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Quiz;

public class AuthOptions
{
    public const string ISSUER = "MyAuthServer";
    public const string AUDIENCE = "MyAuthClient";

    public static SymmetricSecurityKey GetSymmetricSecurityKey()
    {
        var key = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
        if (string.IsNullOrEmpty(key))
            throw new InvalidOperationException("JWT_SECRET_KEY environment variable is not set.");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }
}
