using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CryptExApi.Migrations
{
    public partial class ManualSendCrypto : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNotes",
                table: "CryptoDeposits",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderWalletAddress",
                table: "CryptoDeposits",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionHash",
                table: "CryptoDeposits",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UserNotificationTime",
                table: "CryptoDeposits",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminNotes",
                table: "CryptoDeposits");

            migrationBuilder.DropColumn(
                name: "SenderWalletAddress",
                table: "CryptoDeposits");

            migrationBuilder.DropColumn(
                name: "TransactionHash",
                table: "CryptoDeposits");

            migrationBuilder.DropColumn(
                name: "UserNotificationTime",
                table: "CryptoDeposits");
        }
    }
}
