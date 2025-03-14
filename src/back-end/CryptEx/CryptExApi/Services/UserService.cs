﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CryptExApi.Exceptions;
using CryptExApi.Models.Database;
using CryptExApi.Models.DTO;
using CryptExApi.Models.ViewModel;
using CryptExApi.Repositories;
using Microsoft.AspNetCore.Identity;

namespace CryptExApi.Services
{
    public interface IUserService
    {
        Task<UserViewModel> GetUser(Guid id);

        Task<FullUserViewModel> GetFullUser(Guid id);

        Task<UserViewModel> UpdateUser(AppUser user, UpdateUserDto dto);

        Task ChangeLanguage(AppUser user, string language);

        Task ChangeCurrency(AppUser user, string currency);

        Task<string> RequestPasswordChange(AppUser user, RequestPasswordChangeDTO passwordChangeDTO);

        Task ChangePassword(AppUser user, ChangePasswordDTO changePasswordDTO);

        Task<AddressViewModel> GetAddress(AppUser user);

        Task SetAddress(AppUser user, AddressDto dto);

        Task<BankAccountViewModel> GetIban(AppUser user);

        Task SetIban(AppUser user, IbanDto dto);

        Task SetAccountStatus(Guid userId, AccountStatus status);

        Task GetPremium(AppUser user, BuyPremiumDto dto);

        Task RemovePremium(AppUser user);
    }

    public class UserService : IUserService
    {
        private readonly UserManager<AppUser> userManager; //User Manager acts as a repository.
        private readonly IUserRepository userRepository;

        public UserService(UserManager<AppUser> userManager, IUserRepository userRepository)
        {
            this.userManager = userManager;
            this.userRepository = userRepository;
        }

        public async Task<UserViewModel> GetUser(Guid id)
        {
            var user = await userRepository.GetUser(id);

            if (user == null)
                throw new NotFoundException($"User with id '{id}' could not be found.");

            return UserViewModel.FromAppUser(user);
        }

        public async Task<FullUserViewModel> GetFullUser(Guid id)
        {
            var user = await userRepository.GetFullUser(id);

            if (user == null)
                throw new NotFoundException($"User with id '{id}' could not be found.");

            return FullUserViewModel.FromAppUser(user);
        }

        public async Task<UserViewModel> UpdateUser(AppUser user, UpdateUserDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.FirstName))
                user.FirstName = dto.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.LastName))
                user.LastName = dto.LastName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Email))
                user.Email = dto.Email.Trim();
            if (dto.BirthDay.HasValue && dto.BirthDay != default)
                user.BirthDay = dto.BirthDay.Value;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber.Replace(" ", string.Empty);

            var result = await userManager.UpdateAsync(user);

            if (!result.Succeeded)
                throw new IdentityException(result.Errors.ToList());

            return UserViewModel.FromAppUser(user);
        }

        public async Task ChangeLanguage(AppUser user, string language)
        {
            await userRepository.ChangeLanguage(user, language);
        }

        public async Task ChangeCurrency(AppUser user, string currency)
        {
            await userRepository.ChangeCurrency(user, currency);
        }

        public async Task<string> RequestPasswordChange(AppUser user, RequestPasswordChangeDTO passwordChangeDTO)
        {
            if (passwordChangeDTO is null)
                throw new ArgumentNullException(nameof(passwordChangeDTO));
            
            user ??= await userManager.FindByEmailAsync(passwordChangeDTO.Email);
            if (user == null)
                throw new NotFoundException("Email not found.");

            var token = await userManager.GeneratePasswordResetTokenAsync(user); //Send this by email

            //We should be using a mail provider to send the token to the user but since this is a school project we won't do that.
            return token;
        }

        public async Task ChangePassword(AppUser user, ChangePasswordDTO changePasswordDTO)
        {
            if (changePasswordDTO is null)
                throw new ArgumentNullException(nameof(changePasswordDTO));

            user ??= await userManager.FindByEmailAsync(changePasswordDTO.Email);
            if (user == null)
                throw new NotFoundException("Email not found.");

            var result = await userManager.ResetPasswordAsync(user, changePasswordDTO.Token, changePasswordDTO.NewPassword);

            if (!result.Succeeded) {
                throw new IdentityException(result.Errors.ToList());
            }
        }

        public async Task<AddressViewModel> GetAddress(AppUser user)
        {
            if (user is null)
                throw new ArgumentNullException(nameof(user));

            return await userRepository.GetAddress(user);
        }

        public async Task SetAddress(AppUser user, AddressDto dto)
        {
            if (user is null)
                throw new ArgumentNullException(nameof(user));

            await userRepository.SetAddress(user, dto);
        }

        public async Task<BankAccountViewModel> GetIban(AppUser user)
        {
            if (user is null)
                throw new ArgumentNullException(nameof(user));

            return await userRepository.GetIban(user);
        }

        public async Task SetIban(AppUser user, IbanDto dto)
        {
            if (user is null)
                throw new ArgumentNullException(nameof(user));

            await userRepository.SetIban(user, dto);
        }

        public async Task SetAccountStatus(Guid userId, AccountStatus status)
        {
            await userRepository.SetAccountStatus(userId, status);
        }

        //Did not have the time to make a proper premium subscription (I originally wanted to use Stripe)
        public async Task GetPremium(AppUser user, BuyPremiumDto dto)
        {
            await userManager.AddClaimAsync(user, new Claim("premium", bool.TrueString));
        }

        public async Task RemovePremium(AppUser user)
        {
            await userManager.RemoveClaimAsync(user, new Claim("premium", bool.TrueString));
        }
    }
}
