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
    [Route("api/booking")]
    public class BookingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BookingController(AppDbContext context)
        {
            _context = context;
        }

        public class CalculatePriceRequest
        {
            public decimal BasePrice { get; set; }
            public int? AutoDiscountId { get; set; }
            public string? PromoType { get; set; } // "offer" or "coupon"
            public string? PromoCode { get; set; }
        }

        public class ConfirmBookingRequest
        {
            public string UserId { get; set; } = string.Empty;
            public string BookingType { get; set; } = string.Empty; // "Bus"
            public string Route { get; set; } = string.Empty; // e.g. "Mumbai to Pune"
            public string SeatType { get; set; } = string.Empty;
            public decimal BasePrice { get; set; }
            public int? AutoDiscountId { get; set; }
            public string? PromoType { get; set; }
            public string? PromoCode { get; set; }
        }

        [HttpPost("calculate-price")]
        public async Task<IActionResult> CalculatePrice([FromBody] CalculatePriceRequest request)
        {
            if (request == null)
            {
                return BadRequest("Invalid request body.");
            }

            var breakdown = await CalculateBreakdownAsync(request.BasePrice, request.AutoDiscountId, request.PromoType, request.PromoCode);

            return Ok(new
            {
                basePrice = breakdown.BasePrice,
                autoDiscount = breakdown.AutoDiscount,
                promoDiscount = breakdown.PromoDiscount,
                finalPrice = breakdown.FinalPrice
            });
        }

        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmBooking([FromBody] ConfirmBookingRequest request)
        {
            if (request == null)
            {
                return BadRequest("Invalid request body.");
            }

            var breakdown = await CalculateBreakdownAsync(request.BasePrice, request.AutoDiscountId, request.PromoType, request.PromoCode);

            int reservationId = 0;
            if (request.BookingType.Equals("Bus", StringComparison.OrdinalIgnoreCase))
            {
                // Parse route cities
                string fromCity = "";
                string toCity = "";
                if (!string.IsNullOrEmpty(request.Route))
                {
                    var parts = request.Route.Split(new[] { " to ", " - ", " -> " }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2)
                    {
                        fromCity = parts[0].Trim();
                        toCity = parts[1].Trim();
                    }
                }

                var bus = await _context.BusBookings
                    .FirstOrDefaultAsync(b => b.FromCity.ToLower() == fromCity.ToLower() && b.ToCity.ToLower() == toCity.ToLower());

                if (bus == null)
                {
                    bus = await _context.BusBookings.FirstOrDefaultAsync();
                }

                var reservation = new BusReservation
                {
                    BookingReference = "PNB-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                    UserId = request.UserId,
                    BusBookingId = bus?.Id ?? 0,
                    PassengerName = "Passenger",
                    PassengerPhone = "1234567890",
                    SeatsBooked = 1,
                    BaseFareInr = request.BasePrice,
                    TotalPriceInr = breakdown.FinalPrice,
                    CustomerFareInr = breakdown.FinalPrice,
                    NetFareInr = breakdown.FinalPrice,
                    DiscountAmountInr = breakdown.AutoDiscount + breakdown.PromoDiscount,
                    ConvenienceFeeInr = 0m,
                    CouponCode = request.PromoCode,
                    Status = "Booked",
                    BookedAtUtc = DateTime.UtcNow,
                    AutoDiscountAmountInr = breakdown.AutoDiscount,
                    CouponDiscountAmountInr = request.PromoType == "coupon" ? breakdown.PromoDiscount : 0m
                };

                _context.BusReservations.Add(reservation);

                // Update usage limits
                if (!string.IsNullOrEmpty(request.PromoCode))
                {
                    if (request.PromoType != null && request.PromoType.Equals("offer", StringComparison.OrdinalIgnoreCase))
                    {
                        var offer = await _context.FeaturedOffers.FirstOrDefaultAsync(o => o.OfferCode == request.PromoCode || o.CouponCode == request.PromoCode);
                        if (offer != null)
                        {
                            offer.CouponUsedCount += 1;
                            offer.UpdatedAtUtc = DateTime.UtcNow;
                        }
                    }
                    else if (request.PromoType != null && request.PromoType.Equals("coupon", StringComparison.OrdinalIgnoreCase))
                    {
                        var coupon = await _context.BusCoupons.FirstOrDefaultAsync(c => c.CouponCode == request.PromoCode);
                        if (coupon != null)
                        {
                            coupon.UsedCount += 1;
                        }
                    }
                }

                await _context.SaveChangesAsync();
                reservationId = reservation.Id;
            }

            return Ok(new
            {
                bookingId = reservationId,
                status = "Confirmed",
                priceBreakdown = new
                {
                    basePrice = breakdown.BasePrice,
                    autoDiscount = breakdown.AutoDiscount,
                    promoDiscount = breakdown.PromoDiscount,
                    finalPrice = breakdown.FinalPrice
                }
            });
        }

        private async Task<(decimal BasePrice, decimal AutoDiscount, decimal PromoDiscount, decimal FinalPrice)> CalculateBreakdownAsync(
            decimal basePrice, int? autoDiscountId, string? promoType, string? promoCode)
        {
            decimal autoDiscount = 0m;
            decimal promoDiscount = 0m;

            // 1. Auto Discount
            if (autoDiscountId.HasValue)
            {
                var discount = await _context.BusDiscounts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.Id == autoDiscountId.Value && d.Status == "Active");

                if (discount != null)
                {
                    if (discount.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase))
                    {
                        autoDiscount = basePrice * discount.Value / 100m;
                    }
                    else
                    {
                        autoDiscount = discount.Value;
                    }
                    autoDiscount = Math.Round(autoDiscount, 2, MidpointRounding.AwayFromZero);
                }
            }

            // 2. Coupon OR Offer (Only ONE allowed)
            if (!string.IsNullOrEmpty(promoCode) && !string.IsNullOrEmpty(promoType))
            {
                if (promoType.Equals("offer", StringComparison.OrdinalIgnoreCase))
                {
                    var offer = await _context.FeaturedOffers
                        .AsNoTracking()
                        .FirstOrDefaultAsync(o => o.IsActive && (o.OfferCode == promoCode || o.CouponCode == promoCode));

                    if (offer != null && offer.CouponExpiresAtUtc > DateTime.UtcNow && offer.CouponUsedCount < offer.MaxCouponUsage)
                    {
                        if (offer.IsPercentageDiscount)
                        {
                            promoDiscount = basePrice * offer.DiscountValue / 100m;
                        }
                        else
                        {
                            promoDiscount = offer.DiscountValue;
                        }
                        promoDiscount = Math.Round(promoDiscount, 2, MidpointRounding.AwayFromZero);
                    }
                }
                else if (promoType.Equals("coupon", StringComparison.OrdinalIgnoreCase))
                {
                    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
                    var coupon = await _context.BusCoupons
                        .AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Status == "Active" && c.CouponCode == promoCode && c.StartDate <= today && c.ExpiryDate >= today);

                    if (coupon != null && (coupon.UseLimit == 0 || coupon.UsedCount < coupon.UseLimit))
                    {
                        if (coupon.CouponType.Equals("Percentage", StringComparison.OrdinalIgnoreCase))
                        {
                            promoDiscount = basePrice * coupon.Value / 100m;
                        }
                        else
                        {
                            promoDiscount = coupon.Value;
                        }
                        promoDiscount = Math.Round(promoDiscount, 2, MidpointRounding.AwayFromZero);
                    }
                }
            }

            decimal finalPrice = Math.Max(0m, basePrice - autoDiscount - promoDiscount);

            return (basePrice, autoDiscount, promoDiscount, finalPrice);
        }
    }
}
