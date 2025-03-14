﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CryptExApi.Models.Database
{
    public class UserAddress
    {
        public Guid Id { get; set; }

        public DateTime CreationDate { get; set; }

        public DateTime LastEditDate { get; set; }

        /// <summary>
        /// Street with street number
        /// </summary>
        public string Street { get; set; }

        public string City { get; set; }

        public string PostalCode { get; set; }

        public Guid CountryId { get; set; }

        public Country Country { get; set; }

        public Guid UserId { get; set; }

        public AppUser User { get; set; }

        public override string ToString()
        {
            var address = $"{Street} {PostalCode} {City}";

            if (Country != null)
                address += $" {Country.Iso31661Alpha2Code}";

            return address;
        }
    }
}
