using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quiz.Migrations
{
    /// <inheritdoc />
    public partial class AddPrivateAccessKeyToQuiz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrivateAccessKey",
                table: "Quizzes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrivateAccessKey",
                table: "Quizzes");
        }
    }
}
