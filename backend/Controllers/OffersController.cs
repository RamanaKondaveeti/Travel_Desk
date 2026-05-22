using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace PickNBook.Api.Controllers
{
    [ApiController]
    [Route("api/offers")]
    public class OffersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OffersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveOffers([FromQuery] string bookingType)
        {
            if (string.IsNullOrWhiteSpace(bookingType))
            {
                return BadRequest("bookingType parameter is required.");
            }

            var now = DateTime.UtcNow;

            var offers = await _context.FeaturedOffers
                .AsNoTracking()
                .Where(x => x.IsActive 
                            && x.CouponExpiresAtUtc > now 
                            && x.CouponUsedCount < x.MaxCouponUsage 
                            && x.BookingType.ToLower() == bookingType.ToLower())
                .OrderBy(x => x.DisplayOrder)
                .ToListAsync();

            var response = offers.Select(x => new
            {
                offerId = x.OfferCode,
                title = x.Title,
                subtitle = x.Subtitle,
                description = x.Description,
                offerCode = x.OfferCode,
                couponCode = x.CouponCode,
                discountType = x.IsPercentageDiscount ? "Percentage" : "Fixed",
                discountValue = x.DiscountValue,
                expiry = x.CouponExpiresAtUtc.ToString("o"),
                imageUrl = x.ImageUrl,
                bookingType = x.BookingType
            }).ToList();

            return Ok(response);
        }
    }
}
