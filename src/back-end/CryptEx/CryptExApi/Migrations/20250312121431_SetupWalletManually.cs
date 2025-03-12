using Microsoft.EntityFrameworkCore.Migrations;

namespace CryptExApi.Migrations
{
    public partial class SetupWalletManually : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminWalletAddress",
                table: "Wallets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAddressConfigured",
                table: "Wallets",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminWalletAddress",
                table: "Wallets");

            migrationBuilder.DropColumn(
                name: "IsAddressConfigured",
                table: "Wallets");
        }
    }
}
