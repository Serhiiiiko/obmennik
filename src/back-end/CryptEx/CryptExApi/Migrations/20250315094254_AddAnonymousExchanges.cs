using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CryptExApi.Migrations
{
    public partial class AddAnonymousExchanges : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnonymousExchanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DestinationWalletAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SenderWalletAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TransactionHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SourceAmount = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    DestinationAmount = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "decimal(20,8)", precision: 20, scale: 8, nullable: false),
                    SourceWalletId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DestinationWalletId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnonymousExchanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnonymousExchanges_Wallets_DestinationWalletId",
                        column: x => x.DestinationWalletId,
                        principalTable: "Wallets",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AnonymousExchanges_Wallets_SourceWalletId",
                        column: x => x.SourceWalletId,
                        principalTable: "Wallets",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnonymousExchanges_DestinationWalletId",
                table: "AnonymousExchanges",
                column: "DestinationWalletId");

            migrationBuilder.CreateIndex(
                name: "IX_AnonymousExchanges_SourceWalletId",
                table: "AnonymousExchanges",
                column: "SourceWalletId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnonymousExchanges");
        }
    }
}
