﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CryptExApi.Models.Database;

namespace CryptExApi.Models.ViewModel
{
    public class UserViewModel
    {
        public Guid Id { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public DateTime BirthDay { get; set; }

        public DateTime CreationDate { get; set; }

        public string Email { get; set; }

        public string PhoneNumber { get; set; }

        public string PreferedLanguage { get; set; }

        public string PreferedCurrency { get; set; }

        public static UserViewModel FromAppUser(AppUser user) => new()
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            BirthDay = user.BirthDay,
            CreationDate = user.CreationDate,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            PreferedLanguage = user.PreferedLanguage,
            PreferedCurrency = user.PreferedCurrency
        };
    }
}
